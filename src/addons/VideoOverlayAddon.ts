import type { CoreEngine } from '../core/CoreEngine';
import type { VideoNode } from '../nodes/VideoNode';
import type { SelectionPlugin } from '../plugins/SelectionPlugin';

import { PluginAddon } from './PluginAddon';

export interface VideoOverlayAddonOptions {
  zIndex?: number;
  marginPx?: number;
  controlsHeightPx?: number;
  speeds?: number[];
  minWidthPx?: number;
  minHeightPx?: number;
  maxWorldScaleToShow?: number | null;
  hideDuringCameraZoomMs?: number;

  uiBackgroundColor?: string;
  uiBorderColor?: string;
  uiTextColor?: string;
  uiMutedTextColor?: string;
  uiAccentColor?: string;
  uiTrackColor?: string;
  uiTrackFilledColor?: string;
}

export class VideoOverlayAddon extends PluginAddon<SelectionPlugin> {
  private _core: CoreEngine | null = null;

  private _rootEl: HTMLDivElement | null = null;
  private _controlsEl: HTMLDivElement | null = null;

  private _playBtn: HTMLButtonElement | null = null;
  private _muteBtn: HTMLButtonElement | null = null;
  private _speedBtn: HTMLButtonElement | null = null;
  private _timeLabel: HTMLSpanElement | null = null;
  private _seekInput: HTMLInputElement | null = null;
  private _volInput: HTMLInputElement | null = null;

  private _selectedVideoNode: VideoNode | null = null;
  private _selectedVideoEl: HTMLVideoElement | null = null;

  private _hiddenForDrag = false;
  private _hiddenForSize = false;
  private _hiddenForTransform = false;
  private _hiddenForZoom = false;
  private _hiddenForWorldScale = false;
  private _hiddenForNotReady = false;

  private _uiMode: 'full' | 'compact' | 'mini' = 'full';

  private _zoomUnhideTimeoutId: number | null = null;
  private _onKonvaDragStart: (() => void) | null = null;
  private _onKonvaDragEnd: (() => void) | null = null;
  private _onKonvaTransformStart: (() => void) | null = null;
  private _onKonvaTransformEnd: (() => void) | null = null;
  private _onLayerTransformStart: ((e: unknown) => void) | null = null;
  private _onLayerTransformEnd: ((e: unknown) => void) | null = null;
  private _onLayerDragStart: ((e: unknown) => void) | null = null;
  private _onLayerDragEnd: ((e: unknown) => void) | null = null;

  private _rafId: number | null = null;
  private _options: Required<VideoOverlayAddonOptions>;

  private _onNodeSelected: ((node: unknown) => void) | null = null;
  private _onNodeDeselected: ((node: unknown) => void) | null = null;
  private _onSelectionCleared: (() => void) | null = null;
  private _onNodeTransformed: ((node: unknown) => void) | null = null;
  private _onStageResized: (() => void) | null = null;
  private _onCameraChanged: (() => void) | null = null;

  private _onWorldChanged: (() => void) | null = null;

  private _onTimeUpdate: (() => void) | null = null;
  private _onLoadedMetadata: (() => void) | null = null;
  private _onCanPlay: (() => void) | null = null;
  private _onPlayPauseSync: (() => void) | null = null;

  constructor(options: VideoOverlayAddonOptions = {}) {
    super();
    this._options = {
      zIndex: options.zIndex ?? 20,
      marginPx: options.marginPx ?? 8,
      controlsHeightPx: options.controlsHeightPx ?? 42,
      speeds: options.speeds ?? [0.5, 0.75, 1, 1.25, 1.5, 2],
      minWidthPx: options.minWidthPx ?? 220,
      minHeightPx: options.minHeightPx ?? 120,
      maxWorldScaleToShow: options.maxWorldScaleToShow ?? 8,
      hideDuringCameraZoomMs: options.hideDuringCameraZoomMs ?? 120,

      uiBackgroundColor: options.uiBackgroundColor ?? 'rgba(31,31,31,0.92)',
      uiBorderColor: options.uiBorderColor ?? 'rgba(255,255,255,0.08)',
      uiTextColor: options.uiTextColor ?? '#ffffff',
      uiMutedTextColor: options.uiMutedTextColor ?? 'rgba(255,255,255,0.6)',
      uiAccentColor: options.uiAccentColor ?? '#2b83ff',
      uiTrackColor: options.uiTrackColor ?? 'rgba(255,255,255,0.22)',
      uiTrackFilledColor: options.uiTrackFilledColor ?? '#2b83ff',
    };
  }

  protected onAttach(_plugin: SelectionPlugin, core: CoreEngine): void {
    this._core = core;

    if (typeof document === 'undefined') return;

    this._ensureDom(core);

    this._onNodeSelected = (node: unknown) => {
      this._tryShowForNode(node);
    };
    this._onNodeDeselected = (node: unknown) => {
      if (node && this._selectedVideoNode && node === this._selectedVideoNode) {
        this._hide();
      }
    };
    this._onSelectionCleared = () => {
      this._hide();
    };
    this._onNodeTransformed = (node: unknown) => {
      if (this._selectedVideoNode && node === this._selectedVideoNode) {
        this._scheduleSync();
      }
    };

    core.eventBus.on('node:selected', this._onNodeSelected as unknown as (n: unknown) => void);
    core.eventBus.on('node:deselected', this._onNodeDeselected as unknown as (n: unknown) => void);
    core.eventBus.on('selection:cleared', this._onSelectionCleared as unknown as () => void);
    core.eventBus.on(
      'node:transformed',
      this._onNodeTransformed as unknown as (n: unknown, c: unknown) => void,
    );

    this._onStageResized = () => {
      this._hideTemporarilyForZoom();
      this._scheduleSync();
    };
    core.eventBus.on('stage:resized', this._onStageResized as unknown as (p: unknown) => void);

    this._onCameraChanged = () => {
      this._hideTemporarilyForZoom();
      this._scheduleSync();
    };
    core.eventBus.on('camera:zoom', this._onCameraChanged as unknown as (p: unknown) => void);
    core.eventBus.on('camera:setZoom', this._onCameraChanged as unknown as (p: unknown) => void);
    core.eventBus.on('camera:reset', this._onCameraChanged as unknown as () => void);
    core.eventBus.on('camera:pan', this._onCameraChanged as unknown as (p: unknown) => void);

    const world = core.nodes.world;
    this._onWorldChanged = () => {
      this._scheduleSync();
    };
    world.on(
      'xChange.videoOverlay yChange.videoOverlay scaleXChange.videoOverlay scaleYChange.videoOverlay',
      this._onWorldChanged,
    );

    // Hide overlay during transforms handled by Transformer (layer) and during rotate-handles drag
    this._bindLayerInteractionEvents(core);

    this._hide();
  }

  protected onDetach(_plugin: SelectionPlugin, core: CoreEngine): void {
    this._hide();

    if (this._zoomUnhideTimeoutId != null) {
      globalThis.clearTimeout(this._zoomUnhideTimeoutId);
      this._zoomUnhideTimeoutId = null;
    }

    if (this._onNodeSelected)
      core.eventBus.off('node:selected', this._onNodeSelected as unknown as (n: unknown) => void);
    if (this._onNodeDeselected)
      core.eventBus.off(
        'node:deselected',
        this._onNodeDeselected as unknown as (n: unknown) => void,
      );
    if (this._onSelectionCleared)
      core.eventBus.off('selection:cleared', this._onSelectionCleared as unknown as () => void);
    if (this._onNodeTransformed)
      core.eventBus.off(
        'node:transformed',
        this._onNodeTransformed as unknown as (n: unknown, c: unknown) => void,
      );

    if (this._onStageResized)
      core.eventBus.off('stage:resized', this._onStageResized as unknown as (p: unknown) => void);

    if (this._onCameraChanged) {
      core.eventBus.off('camera:zoom', this._onCameraChanged as unknown as (p: unknown) => void);
      core.eventBus.off('camera:setZoom', this._onCameraChanged as unknown as (p: unknown) => void);
      core.eventBus.off('camera:reset', this._onCameraChanged as unknown as () => void);
      core.eventBus.off('camera:pan', this._onCameraChanged as unknown as (p: unknown) => void);
    }

    if (this._onWorldChanged) {
      core.nodes.world.off('.videoOverlay');
    }

    this._unbindLayerInteractionEvents(core);

    if (this._rafId != null) {
      globalThis.cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (this._rootEl) {
      this._rootEl.remove();
    }

    this._rootEl = null;
    this._controlsEl = null;
    this._playBtn = null;
    this._muteBtn = null;
    this._speedBtn = null;
    this._timeLabel = null;
    this._seekInput = null;
    this._volInput = null;

    this._hiddenForDrag = false;
    this._hiddenForSize = false;
    this._hiddenForTransform = false;
    this._hiddenForZoom = false;
    this._hiddenForWorldScale = false;
    this._hiddenForNotReady = false;
    this._onKonvaDragStart = null;
    this._onKonvaDragEnd = null;
    this._onKonvaTransformStart = null;
    this._onKonvaTransformEnd = null;
    this._onLayerTransformStart = null;
    this._onLayerTransformEnd = null;
    this._onLayerDragStart = null;
    this._onLayerDragEnd = null;

    this._core = null;

    this._onNodeSelected = null;
    this._onNodeDeselected = null;
    this._onSelectionCleared = null;
    this._onNodeTransformed = null;
    this._onStageResized = null;
    this._onCameraChanged = null;
    this._onWorldChanged = null;
  }

  private _ensureDom(core: CoreEngine): void {
    if (this._rootEl) return;

    const root = globalThis.document.createElement('div');
    root.style.position = 'absolute';
    root.style.left = '0px';
    root.style.top = '0px';
    root.style.width = '0px';
    root.style.height = '0px';
    root.style.display = 'none';
    root.style.zIndex = String(this._options.zIndex);
    root.style.pointerEvents = 'none';
    root.style.boxSizing = 'border-box';
    root.style.borderRadius = '8px';
    root.style.overflow = 'visible';

    const controls = globalThis.document.createElement('div');
    controls.style.position = 'absolute';
    controls.style.left = '0px';
    controls.style.top = '0px';
    controls.style.height = String(this._options.controlsHeightPx) + 'px';
    controls.style.display = 'flex';
    controls.style.alignItems = 'center';
    controls.style.gap = '10px';
    controls.style.padding = '8px 10px';
    controls.style.borderRadius = '10px';
    controls.style.pointerEvents = 'auto';
    controls.style.boxSizing = 'border-box';
    controls.style.background = this._options.uiBackgroundColor;
    controls.style.border = '1px solid ' + this._options.uiBorderColor;
    controls.style.backdropFilter = 'blur(8px)';
    controls.style.transformOrigin = '0 0';

    const stopOnly = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLInputElement && t.type === 'range') return;
      e.stopPropagation();
    };
    controls.addEventListener('pointerdown', stopOnly);
    controls.addEventListener('mousedown', stopOnly);
    controls.addEventListener('touchstart', stopOnly);
    controls.addEventListener(
      'wheel',
      (e) => {
        // Do not stopPropagation: wheel should reach stage/container handlers for canvas zoom.
        // But prevent browser zoom on pinch/ctrl+wheel.
        if (e.ctrlKey) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    const makeBtn = (label: string) => {
      const b = globalThis.document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.height = '28px';
      b.style.minWidth = '34px';
      b.style.padding = '0 10px';
      b.style.borderRadius = '8px';
      b.style.border = '1px solid ' + this._options.uiBorderColor;
      b.style.background = 'rgba(0,0,0,0.12)';
      b.style.color = this._options.uiTextColor;
      b.style.cursor = 'pointer';
      b.style.fontSize = '12px';
      b.style.fontFamily = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell';
      b.style.lineHeight = '28px';
      b.style.whiteSpace = 'nowrap';
      return b;
    };

    const playBtn = makeBtn('Play');
    playBtn.style.minWidth = '56px';

    const muteBtn = makeBtn('Mute');
    muteBtn.style.minWidth = '56px';

    const timeLabel = globalThis.document.createElement('span');
    timeLabel.textContent = '0:00 / 0:00';
    timeLabel.style.color = this._options.uiTextColor;
    timeLabel.style.opacity = '0.9';
    timeLabel.style.fontSize = '12px';
    timeLabel.style.fontFamily =
      'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell';
    timeLabel.style.whiteSpace = 'nowrap';

    const speedBtn = makeBtn('1x');

    const seek = globalThis.document.createElement('input');
    seek.type = 'range';
    seek.min = '0';
    seek.max = '0';
    seek.step = '0.01';
    seek.value = '0';
    seek.style.flex = '1';
    seek.style.height = '6px';
    seek.style.cursor = 'pointer';
    seek.style.accentColor = this._options.uiAccentColor;

    const vol = globalThis.document.createElement('input');
    vol.type = 'range';
    vol.min = '0';
    vol.max = '1';
    vol.step = '0.01';
    vol.value = '1';
    vol.style.width = '90px';
    vol.style.height = '6px';
    vol.style.cursor = 'pointer';
    vol.style.accentColor = this._options.uiAccentColor;

    controls.appendChild(playBtn);
    controls.appendChild(seek);
    controls.appendChild(timeLabel);
    controls.appendChild(muteBtn);
    controls.appendChild(vol);
    controls.appendChild(speedBtn);

    root.appendChild(controls);

    const container = core.stage.container();
    container.style.position = container.style.position || 'relative';
    container.appendChild(root);

    this._rootEl = root;
    this._controlsEl = controls;
    this._playBtn = playBtn;
    this._muteBtn = muteBtn;
    this._speedBtn = speedBtn;
    this._timeLabel = timeLabel;
    this._seekInput = seek;
    this._volInput = vol;

    // Initial track visuals
    this._updateRangeFill(seek, 0);
    this._updateRangeFill(vol, 1);

    playBtn.addEventListener('click', () => {
      const node = this._selectedVideoNode;
      const v = this._selectedVideoEl;
      if (!node || !v) return;
      if (v.paused) {
        void node.play();
      } else {
        node.pause();
      }
      this._syncControls();
    });

    seek.addEventListener('input', () => {
      const node = this._selectedVideoNode;
      const v = this._selectedVideoEl;
      if (!node || !v || !Number.isFinite(v.duration) || v.duration <= 0) return;
      const value = Number(seek.value);
      if (!Number.isFinite(value)) return;
      const clamped = Math.max(0, Math.min(v.duration, value));
      node.setCurrentTime(clamped);
      this._updateRangeFill(seek, v.duration > 0 ? clamped / v.duration : 0);
      this._syncControls();
    });

    muteBtn.addEventListener('click', () => {
      const node = this._selectedVideoNode;
      const v = this._selectedVideoEl;
      if (!node || !v) return;
      const next = !v.muted;
      node.setMuted(next);
      // If unmuting and volume is 0, restore a sane volume
      if (!next && v.volume <= 0) node.setVolume(0.8);
      this._syncControls();
    });

    vol.addEventListener('input', () => {
      const node = this._selectedVideoNode;
      const v = this._selectedVideoEl;
      if (!node || !v) return;
      const value = Math.max(0, Math.min(1, Number(vol.value)));
      node.setVolume(value);
      if (value > 0 && v.muted) node.setMuted(false);
      this._updateRangeFill(vol, value);
      this._syncControls();
    });

    speedBtn.addEventListener('click', () => {
      const node = this._selectedVideoNode;
      const v = this._selectedVideoEl;
      if (!node || !v) return;
      const speeds = this._options.speeds;
      if (!Array.isArray(speeds) || speeds.length === 0) return;
      const current = v.playbackRate;
      let idx = speeds.findIndex((s) => Math.abs(s - current) < 1e-3);
      if (idx < 0) idx = 0;
      const next = speeds[(idx + 1) % speeds.length];
      if (typeof next === 'number' && Number.isFinite(next) && next > 0) {
        node.setPlaybackRate(next);
      }
      this._syncControls();
    });
  }

  private _updateRangeFill(input: HTMLInputElement, ratio01: number): void {
    const r = Math.max(0, Math.min(1, ratio01));
    const pct = Math.round(r * 100);
    const filled = this._options.uiTrackFilledColor;
    const track = this._options.uiTrackColor;
    input.style.background =
      'linear-gradient(to right, ' +
      filled +
      ' 0%, ' +
      filled +
      ' ' +
      String(pct) +
      '%, ' +
      track +
      ' ' +
      String(pct) +
      '%, ' +
      track +
      ' 100%)';
    input.style.borderRadius = '999px';
    input.style.border = 'none';
    input.style.outline = 'none';
  }

  private _tryShowForNode(node: unknown): void {
    if (!this._core) return;

    if (!node || typeof (node as { getKonvaNode?: () => unknown }).getKonvaNode !== 'function') {
      this._hide();
      return;
    }

    const konvaNode = (node as { getKonvaNode: () => unknown }).getKonvaNode();
    const type =
      konvaNode && typeof (konvaNode as { getAttr?: (k: string) => unknown }).getAttr === 'function'
        ? (konvaNode as { getAttr: (k: string) => unknown }).getAttr('flowscapeNodeType')
        : undefined;

    if (type !== 'video') {
      this._hide();
      return;
    }

    this._show(node as VideoNode);
  }

  private _show(node: VideoNode): void {
    if (!this._rootEl) return;

    this._selectedVideoNode = node;
    this._selectedVideoEl = node.getVideoElement();

    this._bindKonvaDragEvents();
    this._bindKonvaTransformEvents();
    this._bindVideoEvents();

    this._hiddenForZoom = false;
    this._hiddenForTransform = false;
    this._hiddenForNotReady = !this._isVideoReady();
    this._rootEl.style.display = this._hiddenForNotReady ? 'none' : 'block';
    this._hiddenForSize = false;
    this._scheduleSync();
    this._syncControls();
  }

  private _hide(): void {
    if (this._rootEl) this._rootEl.style.display = 'none';
    this._hiddenForDrag = false;
    this._hiddenForSize = false;
    this._hiddenForTransform = false;
    this._hiddenForZoom = false;
    this._hiddenForWorldScale = false;
    this._hiddenForNotReady = false;
    this._unbindKonvaDragEvents();
    this._unbindKonvaTransformEvents();
    this._unbindVideoEvents();
    this._selectedVideoNode = null;
    this._selectedVideoEl = null;
  }

  private _bindLayerInteractionEvents(core: CoreEngine): void {
    const layer = core.nodes.layer as unknown as KonvaEventTarget;
    if (typeof layer.on !== 'function' || typeof layer.off !== 'function') return;

    this._unbindLayerInteractionEvents(core);

    this._onLayerTransformStart = () => {
      if (!this._rootEl) return;
      if (!this._selectedVideoNode) return;
      this._hiddenForTransform = true;
      this._rootEl.style.display = 'none';
    };

    this._onLayerTransformEnd = () => {
      if (!this._rootEl) return;
      if (!this._selectedVideoNode) return;
      this._hiddenForTransform = false;
      if (
        this._hiddenForDrag ||
        this._hiddenForZoom ||
        this._hiddenForSize ||
        this._hiddenForNotReady
      ) {
        this._rootEl.style.display = 'none';
        return;
      }
      this._rootEl.style.display = 'block';
      this._scheduleSync();
    };

    // Rotation is implemented via draggable rotate handles. Hide overlay while those handles are dragged.
    this._onLayerDragStart = (e: unknown) => {
      if (!this._rootEl) return;
      if (!this._selectedVideoNode) return;
      const target = (e as { target?: unknown }).target as
        | null
        | undefined
        | { name?: () => unknown; getParent?: () => unknown };
      const name = typeof target?.name === 'function' ? target.name() : undefined;
      if (typeof name === 'string' && name.startsWith('rotate-')) {
        this._hiddenForTransform = true;
        this._rootEl.style.display = 'none';
      }
    };

    this._onLayerDragEnd = () => {
      if (!this._rootEl) return;
      if (!this._selectedVideoNode) return;
      // If transform is still active by other means, keep it hidden.
      this._hiddenForTransform = false;
      if (
        this._hiddenForDrag ||
        this._hiddenForZoom ||
        this._hiddenForSize ||
        this._hiddenForNotReady
      ) {
        this._rootEl.style.display = 'none';
        return;
      }
      this._rootEl.style.display = 'block';
      this._scheduleSync();
    };

    layer.on('transformstart.videoOverlayLayer', this._onLayerTransformStart);
    layer.on('transformend.videoOverlayLayer', this._onLayerTransformEnd);
    layer.on('dragstart.videoOverlayLayer', this._onLayerDragStart as unknown as () => void);
    layer.on('dragend.videoOverlayLayer', this._onLayerDragEnd as unknown as () => void);
  }

  private _unbindLayerInteractionEvents(core: CoreEngine): void {
    const layer = core.nodes.layer as unknown as KonvaEventTarget;
    if (typeof layer.off !== 'function') return;
    layer.off('.videoOverlayLayer');
    this._onLayerTransformStart = null;
    this._onLayerTransformEnd = null;
    this._onLayerDragStart = null;
    this._onLayerDragEnd = null;
  }

  private _bindKonvaDragEvents(): void {
    if (!this._selectedVideoNode) return;
    const konvaNode = this._selectedVideoNode.getKonvaNode() as unknown as KonvaEventTarget;
    if (typeof konvaNode.on !== 'function' || typeof konvaNode.off !== 'function') {
      return;
    }

    // Remove previous listeners (if any)
    this._unbindKonvaDragEvents();

    this._onKonvaDragStart = () => {
      if (!this._rootEl) return;
      this._hiddenForDrag = true;
      this._rootEl.style.display = 'none';
    };

    this._onKonvaDragEnd = () => {
      if (!this._rootEl) return;
      if (!this._selectedVideoNode) return;
      this._hiddenForDrag = false;
      this._rootEl.style.display = 'block';
      this._scheduleSync();
    };

    konvaNode.on('dragstart.videoOverlay', this._onKonvaDragStart);
    konvaNode.on('dragend.videoOverlay', this._onKonvaDragEnd);
  }

  private _unbindKonvaDragEvents(): void {
    if (!this._selectedVideoNode) return;
    const konvaNode = this._selectedVideoNode.getKonvaNode() as unknown as KonvaEventTarget;
    if (typeof konvaNode.off !== 'function') return;
    konvaNode.off('.videoOverlay');
    this._onKonvaDragStart = null;
    this._onKonvaDragEnd = null;
  }

  private _bindKonvaTransformEvents(): void {
    if (!this._selectedVideoNode) return;
    const konvaNode = this._selectedVideoNode.getKonvaNode() as unknown as KonvaEventTarget;
    if (typeof konvaNode.on !== 'function' || typeof konvaNode.off !== 'function') {
      return;
    }

    this._unbindKonvaTransformEvents();

    this._onKonvaTransformStart = () => {
      if (!this._rootEl) return;
      this._hiddenForTransform = true;
      this._rootEl.style.display = 'none';
    };

    this._onKonvaTransformEnd = () => {
      if (!this._rootEl) return;
      if (!this._selectedVideoNode) return;
      this._hiddenForTransform = false;
      this._rootEl.style.display = 'block';
      this._scheduleSync();
    };

    konvaNode.on('transformstart.videoOverlayTransform', this._onKonvaTransformStart);
    konvaNode.on('transformend.videoOverlayTransform', this._onKonvaTransformEnd);
  }

  private _unbindKonvaTransformEvents(): void {
    if (!this._selectedVideoNode) return;
    const konvaNode = this._selectedVideoNode.getKonvaNode() as unknown as KonvaEventTarget;
    if (typeof konvaNode.off !== 'function') return;
    konvaNode.off('.videoOverlayTransform');
    this._onKonvaTransformStart = null;
    this._onKonvaTransformEnd = null;
  }

  private _hideTemporarilyForZoom(): void {
    if (!this._rootEl) return;
    if (!this._selectedVideoNode) return;

    this._hiddenForZoom = true;
    this._rootEl.style.display = 'none';

    if (this._zoomUnhideTimeoutId != null) {
      globalThis.clearTimeout(this._zoomUnhideTimeoutId);
    }

    this._zoomUnhideTimeoutId = globalThis.setTimeout(() => {
      this._zoomUnhideTimeoutId = null;
      if (!this._rootEl) return;
      if (!this._selectedVideoNode) return;

      this._hiddenForZoom = false;
      // Don't force-show if other hide reasons are active.
      if (this._hiddenForDrag || this._hiddenForTransform || this._hiddenForSize) return;
      this._rootEl.style.display = 'block';
      this._scheduleSync();
    }, this._options.hideDuringCameraZoomMs) as unknown as number;
  }

  private _bindVideoEvents(): void {
    const v = this._selectedVideoEl;
    if (!v) return;

    this._onTimeUpdate = () => {
      this._syncControls();
    };
    this._onLoadedMetadata = () => {
      this._syncControls();
      this._maybeShowWhenReady();
    };

    this._onCanPlay = () => {
      this._syncControls();
      this._maybeShowWhenReady();
    };
    this._onPlayPauseSync = () => {
      this._syncControls();
    };

    v.addEventListener('timeupdate', this._onTimeUpdate);
    v.addEventListener('loadedmetadata', this._onLoadedMetadata);
    v.addEventListener('canplay', this._onCanPlay);
    v.addEventListener('play', this._onPlayPauseSync);
    v.addEventListener('pause', this._onPlayPauseSync);
  }

  private _unbindVideoEvents(): void {
    const v = this._selectedVideoEl;
    if (!v) {
      this._onTimeUpdate = null;
      this._onLoadedMetadata = null;
      this._onPlayPauseSync = null;
      return;
    }

    if (this._onTimeUpdate) v.removeEventListener('timeupdate', this._onTimeUpdate);
    if (this._onLoadedMetadata) v.removeEventListener('loadedmetadata', this._onLoadedMetadata);
    if (this._onCanPlay) v.removeEventListener('canplay', this._onCanPlay);
    if (this._onPlayPauseSync) {
      v.removeEventListener('play', this._onPlayPauseSync);
      v.removeEventListener('pause', this._onPlayPauseSync);
    }

    this._onTimeUpdate = null;
    this._onLoadedMetadata = null;
    this._onCanPlay = null;
    this._onPlayPauseSync = null;
  }

  private _isVideoReady(): boolean {
    const v = this._selectedVideoEl;
    if (!v) return false;
    // Require metadata at least; duration must be known and finite.
    if (!Number.isFinite(v.duration) || v.duration <= 0) return false;
    return v.readyState >= 1;
  }

  private _maybeShowWhenReady(): void {
    if (!this._rootEl) return;
    if (!this._selectedVideoNode) return;
    const ready = this._isVideoReady();
    if (!ready) {
      this._hiddenForNotReady = true;
      this._rootEl.style.display = 'none';
      return;
    }
    if (this._hiddenForNotReady) {
      this._hiddenForNotReady = false;
      if (
        this._hiddenForDrag ||
        this._hiddenForTransform ||
        this._hiddenForZoom ||
        this._hiddenForSize
      ) {
        this._rootEl.style.display = 'none';
        return;
      }
      this._rootEl.style.display = 'block';
      this._scheduleSync();
    }
  }

  private _scheduleSync(): void {
    if (this._rafId != null) return;
    this._rafId = globalThis.requestAnimationFrame(() => {
      this._rafId = null;
      this._syncPosition();
    });
  }

  private _syncPosition(): void {
    if (!this._core || !this._rootEl || !this._selectedVideoNode) return;
    if (this._hiddenForDrag) return;
    if (this._hiddenForTransform) return;
    if (this._hiddenForZoom) return;

    if (!this._isVideoReady()) {
      this._hiddenForNotReady = true;
      this._rootEl.style.display = 'none';
      return;
    }
    if (this._hiddenForNotReady) {
      this._hiddenForNotReady = false;
      this._rootEl.style.display = 'block';
    }

    const worldScale = this._core.nodes.world.scaleX();
    const maxScale = this._options.maxWorldScaleToShow;
    if (maxScale != null && worldScale >= maxScale) {
      this._hiddenForWorldScale = true;
      this._rootEl.style.display = 'none';
      return;
    }
    if (this._hiddenForWorldScale) {
      this._hiddenForWorldScale = false;
      this._rootEl.style.display = 'block';
    }

    const konvaNode = this._selectedVideoNode.getKonvaNode();
    const bbox = (konvaNode as unknown as { getClientRect?: (o?: unknown) => KonvaRect })
      .getClientRect
      ? (konvaNode as unknown as { getClientRect: (o?: unknown) => KonvaRect }).getClientRect({
          skipShadow: true,
          skipStroke: false,
        })
      : null;

    if (!bbox) return;

    // Responsive modes instead of hard-hide for most small cases.
    const minHideW = 140;
    const minHideH = 64;
    if (bbox.width < minHideW || bbox.height < minHideH) {
      this._hiddenForSize = true;
      this._rootEl.style.display = 'none';
      return;
    }

    const scaleForUi = worldScale;
    const nextMode: 'full' | 'compact' | 'mini' =
      bbox.width < 260 || bbox.height < 110 || scaleForUi < 0.55
        ? 'mini'
        : bbox.width < 340 || bbox.height < 135 || scaleForUi < 0.75
          ? 'compact'
          : 'full';
    this._applyUiMode(nextMode);

    if (this._hiddenForSize) {
      this._hiddenForSize = false;
      this._rootEl.style.display = 'block';
    }

    // Root covers the whole stage container to allow floating panel positioning in container coords.
    const containerEl = this._core.stage.container();
    const cw = containerEl.clientWidth;
    const ch = containerEl.clientHeight;
    this._rootEl.style.left = '0px';
    this._rootEl.style.top = '0px';
    this._rootEl.style.width = String(cw) + 'px';
    this._rootEl.style.height = String(ch) + 'px';

    // Scale controls down a bit on smaller nodes (YouTube-like responsiveness).
    if (this._controlsEl) {
      const base = 360;
      const raw = bbox.width / base;
      const minScale = this._uiMode === 'full' ? 0.75 : this._uiMode === 'compact' ? 0.68 : 0.6;
      const scale = Math.max(minScale, Math.min(1, raw));
      this._controlsEl.style.transform = 'scale(' + String(scale) + ')';

      // Floating position (stable under zoom): below node by default, otherwise above.
      // When zoomed out сильно, bbox маленький и фиксированный отступ выглядит как "уехало".
      // Поэтому делаем отступ адаптивным от размеров bbox.
      const ref = Math.max(64, Math.min(240, bbox.height));
      const k = ref / 240;
      const safeInset = Math.max(10, Math.min(28, 28 * k));
      const gap = Math.max(4, Math.min(10, 10 * k));
      // Measure after transform is applied.
      const rect = this._controlsEl.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const belowY = bbox.y + bbox.height + safeInset + gap;
      const aboveY = bbox.y - safeInset - gap - h;
      const maxY = Math.max(0, ch - h - this._options.marginPx);
      let y = belowY;
      if (belowY > maxY && aboveY >= 0) y = aboveY;
      y = Math.max(this._options.marginPx, Math.min(maxY, y));

      const centerX = bbox.x + bbox.width / 2;
      const maxX = Math.max(0, cw - w - this._options.marginPx);
      let x = centerX - w / 2;
      x = Math.max(this._options.marginPx, Math.min(maxX, x));

      this._controlsEl.style.left = String(x) + 'px';
      this._controlsEl.style.top = String(y) + 'px';
      this._controlsEl.style.right = '';
      this._controlsEl.style.bottom = '';
    }

    const radiusValue: unknown =
      typeof (konvaNode as unknown as { cornerRadius?: () => unknown }).cornerRadius === 'function'
        ? (konvaNode as unknown as { cornerRadius: () => unknown }).cornerRadius()
        : 0;
    let radius = 0;
    if (Array.isArray(radiusValue)) {
      const arr = radiusValue as unknown[];
      const v = arr[0];
      radius = typeof v === 'number' && Number.isFinite(v) ? v : 0;
    } else {
      radius = typeof radiusValue === 'number' && Number.isFinite(radiusValue) ? radiusValue : 0;
    }
    this._rootEl.style.borderRadius = String(Math.max(0, radius)) + 'px';
  }

  private _syncControls(): void {
    const v = this._selectedVideoEl;
    if (!v) return;

    if (this._playBtn) this._playBtn.textContent = v.paused ? 'Play' : 'Pause';

    if (this._muteBtn) {
      const muted = v.muted || v.volume <= 0;
      this._muteBtn.textContent = muted ? 'Muted' : 'Mute';
      this._muteBtn.style.color = muted
        ? this._options.uiMutedTextColor
        : this._options.uiTextColor;
    }

    if (this._seekInput) {
      const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
      const ratio = duration > 0 ? Math.max(0, Math.min(1, v.currentTime / duration)) : 0;
      this._seekInput.max = String(duration);
      this._seekInput.value = String(
        duration > 0 ? Math.max(0, Math.min(duration, v.currentTime)) : 0,
      );
      this._updateRangeFill(this._seekInput, ratio);

      if (this._timeLabel) {
        this._timeLabel.textContent =
          this._formatTime(v.currentTime) + ' / ' + this._formatTime(duration);
      }
    }

    if (this._volInput) {
      this._volInput.value = String(Math.max(0, Math.min(1, v.volume)));
      this._updateRangeFill(this._volInput, Math.max(0, Math.min(1, v.volume)));
    }

    if (this._speedBtn) {
      const rate = v.playbackRate;
      this._speedBtn.textContent = String(Math.round(rate * 100) / 100) + 'x';
    }
  }

  private _formatTime(sec: number): string {
    const s = Number.isFinite(sec) && sec > 0 ? sec : 0;
    const total = Math.floor(s);
    const m = Math.floor(total / 60);
    const r = total % 60;
    const ss = r < 10 ? '0' + String(r) : String(r);
    return String(m) + ':' + ss;
  }

  private _applyUiMode(mode: 'full' | 'compact' | 'mini'): void {
    if (!this._controlsEl) return;
    if (this._uiMode === mode) return;
    this._uiMode = mode;

    // Order: play | seek | time | mute | vol | speed
    if (this._timeLabel) this._timeLabel.style.display = mode === 'full' ? 'inline' : 'none';
    if (this._volInput)
      this._volInput.style.display =
        mode === 'full' ? 'block' : mode === 'compact' ? 'block' : 'none';
    if (this._speedBtn) this._speedBtn.style.display = mode === 'full' ? 'inline-flex' : 'none';

    this._controlsEl.style.gap = mode === 'full' ? '10px' : '8px';
    this._controlsEl.style.padding = mode === 'full' ? '8px 10px' : '6px 8px';

    // In mini mode: keep the seekbar usable.
    if (this._seekInput) {
      this._seekInput.style.minWidth = mode === 'mini' ? '80px' : '120px';
    }
  }
}

interface KonvaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface KonvaEventTarget {
  on(eventName: string, handler: (...args: unknown[]) => void): void;
  off(eventName: string): void;
}
