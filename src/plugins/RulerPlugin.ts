import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface RulerPluginOptions {
  thicknessPx?: number; // Ruler thickness in pixels
  fontFamily?: string;
  fontSizePx?: number;
  color?: string; // Ruler text and ticks color
  bgColor?: string; // Ruler background color
  borderColor?: string; // Ruler border color
  enabled?: boolean; // Is ruler enabled by default
}

export class RulerPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerPluginOptions>;
  private _layer: Konva.Layer | null = null;

  private _hGroup?: Konva.Group;
  private _vGroup?: Konva.Group;

  private _hBg?: Konva.Rect;
  private _vBg?: Konva.Rect;

  private _hTicksShape?: Konva.Shape;
  private _vTicksShape?: Konva.Shape;

  private _hBorder?: Konva.Line;
  private _vBorder?: Konva.Line;

  private _redrawScheduled = false;
  private _lastRedrawTime = 0;
  private _redrawThrottleMs = 16; // ~60 FPS
  private _panThrottleMs = 32; // ~30 FPS for panning (more aggressive throttling)

  // Cache for optimization
  private _cachedActiveGuide: { type: 'h' | 'v'; coord: number } | null = null;
  private _cacheInvalidated = true;

  // Cache for step calculations (by scale)
  private _stepsCache = new Map<
    number,
    {
      step: number;
      stepPx: number;
      majorStep: number;
      mediumStep: number;
      labelStep: number;
      drawStep: number;
      // Precomputed constants for loop
      drawStepEpsilon: number;
      majorTickLength: number;
      mediumTickLength: number;
      minorTickLength: number;
      fontString: string;
    }
  >();

  constructor(options: RulerPluginOptions = {}) {
    super();
    const {
      thicknessPx = 30,
      fontFamily = 'Inter, Calibri, Arial, sans-serif',
      fontSizePx = 10,
      color = '#8c8c8c',
      bgColor = '#2c2c2c',
      borderColor = '#1f1f1f',
      enabled = true,
    } = options;
    this._options = {
      thicknessPx,
      fontFamily,
      fontSizePx,
      color,
      bgColor,
      borderColor,
      enabled,
    };
  }

  /**
   * Calculate optimal step for ruler ticks
   * Uses nice numbers: 1, 2, 5, 10, 20, 50, 100 and so on
   */
  private _calculateNiceStep(minWorldStep: number): number {
    if (!isFinite(minWorldStep) || minWorldStep <= 0) return 1;

    const magnitude = Math.pow(10, Math.floor(Math.log10(minWorldStep)));
    const normalized = minWorldStep / magnitude;

    let nice: number;
    if (normalized <= 1) nice = 1;
    else if (normalized <= 2) nice = 2;
    else if (normalized <= 5) nice = 5;
    else nice = 10;

    return nice * magnitude;
  }

  /**
   * Format number for display on ruler
   * Always returns an integer without decimal places
   */
  private _formatNumber(value: number): string {
    return Math.round(value).toString();
  }

  /**
   * Calculate and cache parameters for ticks for current scale
   */
  private _getStepsConfig(scale: number) {
    // Check cache
    const cached = this._stepsCache.get(scale);
    if (cached) return cached;

    const tPx = this._options.thicknessPx;
    const minStepPx = 50;
    const minWorldStep = minStepPx / scale;
    let step = this._calculateNiceStep(minWorldStep);

    // IMPORTANT: round to integer
    if (step < 1) step = 1;

    const stepPx = step * scale;

    // Adaptive system of levels for ticks and labels
    let majorStep: number;
    let mediumStep: number;
    let labelStep: number;
    let drawStep: number;

    if (stepPx >= 60) {
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step;
      drawStep = step;
    } else if (stepPx >= 40) {
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step * 5;
      drawStep = step;
    } else {
      majorStep = step * 10;
      mediumStep = step * 5;
      labelStep = step * 10;
      drawStep = step;
    }

    // Precompute constants for cycle
    const config = {
      step,
      stepPx,
      majorStep,
      mediumStep,
      labelStep,
      drawStep,
      drawStepEpsilon: drawStep * 0.01,
      majorTickLength: tPx * 0.6,
      mediumTickLength: tPx * 0.4,
      minorTickLength: tPx * 0.25,
      fontString: `${String(this._options.fontSizePx)}px ${this._options.fontFamily}`,
    };

    // Limit cache size (keep last 10 scales)
    if (this._stepsCache.size > 10) {
      const firstKey = this._stepsCache.keys().next().value;
      if (firstKey !== undefined) this._stepsCache.delete(firstKey);
    }

    this._stepsCache.set(scale, config);
    return config;
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Create layer for ruler and RulerHighlightPlugin
    this._layer = new Konva.Layer({
      name: 'ruler-layer',
      listening: true,
    });

    if (this._options.enabled) {
      core.stage.add(this._layer);
    }

    // Groups for horizontal and vertical ruler
    // listening: true to allow events from backgrounds to bubble to RulerGuidesPlugin
    this._hGroup = new Konva.Group({ listening: true });
    this._vGroup = new Konva.Group({ listening: true });
    this._layer.add(this._hGroup);
    this._layer.add(this._vGroup);

    // Ruler backgrounds (can listen to events from other plugins, e.g. RulerGuidesPlugin)
    this._hBg = new Konva.Rect({
      fill: this._options.bgColor,
      listening: true,
      name: 'ruler-h-bg',
    });
    this._vBg = new Konva.Rect({
      fill: this._options.bgColor,
      listening: true,
      name: 'ruler-v-bg',
    });
    this._hGroup.add(this._hBg);
    this._vGroup.add(this._vBg);

    // Ruler borders (dividers between ruler and working area)
    this._hBorder = new Konva.Line({
      stroke: this._options.borderColor,
      strokeWidth: 1,
      listening: false,
    });
    this._vBorder = new Konva.Line({
      stroke: this._options.borderColor,
      strokeWidth: 1,
      listening: false,
    });
    this._hGroup.add(this._hBorder);
    this._vGroup.add(this._vBorder);

    // Shape for horizontal ruler (ticks + labels)
    this._hTicksShape = new Konva.Shape({
      listening: false,
      sceneFunc: (ctx) => {
        // Get active guide once for both rulers
        const activeGuide = this._getActiveGuideInfo();
        this._drawHorizontalRuler(ctx, activeGuide);
      },
    });
    this._hGroup.add(this._hTicksShape);

    // Shape for vertical ruler (ticks + labels)
    this._vTicksShape = new Konva.Shape({
      listening: false,
      sceneFunc: (ctx) => {
        // Get active guide once for both rulers
        const activeGuide = this._getActiveGuideInfo();
        this._drawVerticalRuler(ctx, activeGuide);
      },
    });
    this._vGroup.add(this._vTicksShape);

    // Subscribe to camera and stage size changes
    const stage = core.stage;
    const world = core.nodes.world;

    stage.on('resize.ruler', () => {
      this._scheduleRedraw();
    });

    // Split panning and zooming events for different throttling
    world.on('xChange.ruler yChange.ruler', () => {
      this._invalidateGuideCache();
      this._scheduleRedraw(true); // true = panning (more aggressive throttling)
    });

    world.on('scaleXChange.ruler scaleYChange.ruler', () => {
      this._invalidateGuideCache();
      this._scheduleRedraw(false); // false = zoom (normal throttling)
    });

    // Subscribe to changes in guides for cache invalidation
    stage.on('guidesChanged.ruler', () => {
      this._invalidateGuideCache();
      this._scheduleRedraw();
    });

    // Initial draw
    this._redraw();
    core.stage.batchDraw();
  }

  protected onDetach(core: CoreEngine): void {
    // Unsubscribe from all events
    core.stage.off('.ruler');
    core.nodes.world.off('.ruler');

    // Remove layer
    if (this._layer) {
      this._layer.destroy();
      this._layer = null;
    }
  }

  /**
   * Get active guide from RulerGuidesPlugin (with caching)
   */
  private _getActiveGuideInfo(): { type: 'h' | 'v'; coord: number } | null {
    if (!this._core) return null;

    // Use cache if it is not invalidated
    if (!this._cacheInvalidated) {
      return this._cachedActiveGuide;
    }

    // Find RulerGuidesPlugin through stage
    const guidesLayer = this._core.stage.findOne('.guides-layer');
    if (!guidesLayer) {
      this._cachedActiveGuide = null;
      this._cacheInvalidated = false;
      return null;
    }

    // Get active guide
    const guides = (guidesLayer as unknown as Konva.Layer).find('Line');
    for (const guide of guides) {
      const line = guide as Konva.Line & { worldCoord: number };
      if (line.strokeWidth() === 2) {
        // Active line has strokeWidth = 2
        const worldCoord = line.worldCoord;
        const type = line.name() === 'guide-h' ? 'h' : 'v';
        this._cachedActiveGuide = { type, coord: worldCoord };
        this._cacheInvalidated = false;
        return this._cachedActiveGuide;
      }
    }

    this._cachedActiveGuide = null;
    this._cacheInvalidated = false;
    return null;
  }

  /**
   * Invalidate active guide cache
   */
  private _invalidateGuideCache() {
    this._cacheInvalidated = true;
  }

  /**
   * Universal ruler drawing (horizontal or vertical)
   * @param ctx - canvas context
   * @param axis - ruler axis ('h' for horizontal, 'v' for vertical)
   * @param activeGuide - cached active guide info
   */
  private _drawRuler(
    ctx: Konva.Context,
    axis: 'h' | 'v',
    activeGuide: { type: 'h' | 'v'; coord: number } | null,
  ) {
    if (!this._core) return;

    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const scale = world.scaleX() || 1e-9;
    const tPx = this._options.thicknessPx;

    const isHorizontal = axis === 'h';
    const stageSize = isHorizontal ? stage.width() : stage.height();
    const worldOffset = isHorizontal ? world.x() : world.y();

    // Horizontal ruler highlights vertical guide and vice versa
    const highlightCoord =
      activeGuide?.type === (isHorizontal ? 'v' : 'h') ? activeGuide.coord : null;

    // Get cached step configuration
    const config = this._getStepsConfig(scale);
    const {
      majorStep,
      mediumStep,
      labelStep,
      drawStep,
      drawStepEpsilon,
      majorTickLength,
      mediumTickLength,
      minorTickLength,
      fontString,
    } = config;

    ctx.save();

    // Calculate first visible tick
    const worldStart = -worldOffset / scale;
    const firstTick = Math.floor(worldStart / drawStep) * drawStep;

    // Collect ticks by type for batching
    const majorTicks: number[] = [];
    const mediumTicks: number[] = [];
    const minorTicks: number[] = [];
    const labels: { pos: number; text: string }[] = [];
    let highlightedTick: number | null = null;

    // First pass: classify ticks
    for (let worldPos = firstTick; ; worldPos += drawStep) {
      const screenPos = worldOffset + worldPos * scale;

      if (screenPos > stageSize) break;
      if (screenPos < 0) continue;

      // Check if this coordinate is an active guide
      const isHighlighted =
        highlightCoord !== null && Math.abs(worldPos - highlightCoord) < drawStepEpsilon;

      if (isHighlighted) {
        highlightedTick = screenPos;
        labels.push({ pos: screenPos, text: this._formatNumber(worldPos) });
        continue;
      }

      // Determine tick type
      const isMajor = Math.abs(worldPos % majorStep) < drawStepEpsilon;
      const isMedium = !isMajor && Math.abs(worldPos % mediumStep) < drawStepEpsilon;

      if (isMajor) {
        majorTicks.push(screenPos);
      } else if (isMedium) {
        mediumTicks.push(screenPos);
      } else {
        minorTicks.push(screenPos);
      }

      // Label
      const shouldShowLabel = Math.abs(worldPos % labelStep) < drawStepEpsilon;
      if (shouldShowLabel) {
        labels.push({ pos: screenPos, text: this._formatNumber(worldPos) });
      }
    }

    // Second pass: batch tick drawing
    // Draw minor ticks
    if (minorTicks.length > 0) {
      ctx.strokeStyle = this._options.color;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const pos of minorTicks) {
        if (isHorizontal) {
          ctx.moveTo(pos, tPx);
          ctx.lineTo(pos, tPx - minorTickLength);
        } else {
          ctx.moveTo(tPx, pos);
          ctx.lineTo(tPx - minorTickLength, pos);
        }
      }
      ctx.stroke();
    }

    // Draw medium ticks
    if (mediumTicks.length > 0) {
      ctx.strokeStyle = this._options.color;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const pos of mediumTicks) {
        if (isHorizontal) {
          ctx.moveTo(pos, tPx);
          ctx.lineTo(pos, tPx - mediumTickLength);
        } else {
          ctx.moveTo(tPx, pos);
          ctx.lineTo(tPx - mediumTickLength, pos);
        }
      }
      ctx.stroke();
    }

    // Draw major ticks
    if (majorTicks.length > 0) {
      ctx.strokeStyle = this._options.color;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const pos of majorTicks) {
        if (isHorizontal) {
          ctx.moveTo(pos, tPx);
          ctx.lineTo(pos, tPx - majorTickLength);
        } else {
          ctx.moveTo(tPx, pos);
          ctx.lineTo(tPx - majorTickLength, pos);
        }
      }
      ctx.stroke();
    }

    // Draw highlighted tick
    if (highlightedTick !== null) {
      ctx.strokeStyle = '#ff8c00';
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (isHorizontal) {
        ctx.moveTo(highlightedTick, tPx);
        ctx.lineTo(highlightedTick, tPx - majorTickLength);
      } else {
        ctx.moveTo(tPx, highlightedTick);
        ctx.lineTo(tPx - majorTickLength, highlightedTick);
      }
      ctx.stroke();
    }

    // Draw labels
    if (labels.length > 0) {
      ctx.font = fontString;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      for (const label of labels) {
        const isHighlighted = label.pos === highlightedTick;
        ctx.globalAlpha = isHighlighted ? 1 : 0.9;
        ctx.fillStyle = isHighlighted ? '#ff8c00' : this._options.color;

        if (isHorizontal) {
          ctx.fillText(label.text, label.pos + 4, 4);
        } else {
          // Rotate text for vertical ruler
          const x = 4;
          const y = label.pos + 4;
          ctx.setTransform(0, -1, 1, 0, x, y);
          ctx.fillText(label.text, 0, 0);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      }
    }

    // Additionally draw highlighted coordinate, even if it doesn't fall on regular grid
    if (highlightCoord !== null) {
      const screenPos = worldOffset + highlightCoord * scale;
      if (screenPos >= 0 && screenPos <= stageSize) {
        const alreadyDrawn = Math.abs(highlightCoord % drawStep) < drawStepEpsilon;

        if (!alreadyDrawn) {
          // Draw tick
          ctx.strokeStyle = '#ff8c00';
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (isHorizontal) {
            ctx.moveTo(screenPos, tPx);
            ctx.lineTo(screenPos, tPx - majorTickLength);
          } else {
            ctx.moveTo(tPx, screenPos);
            ctx.lineTo(tPx - majorTickLength, screenPos);
          }
          ctx.stroke();

          // Draw label
          ctx.fillStyle = '#ff8c00';
          ctx.font = fontString;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';

          if (isHorizontal) {
            ctx.fillText(this._formatNumber(highlightCoord), screenPos + 4, 4);
          } else {
            const x = 4;
            const y = screenPos + 4;
            ctx.setTransform(0, -1, 1, 0, x, y);
            ctx.fillText(this._formatNumber(highlightCoord), 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }
        }
      }
    }

    ctx.restore();
  }

  /**
   * Draw horizontal ruler
   * @param activeGuide - cached active guide info
   */
  private _drawHorizontalRuler(
    ctx: Konva.Context,
    activeGuide: { type: 'h' | 'v'; coord: number } | null,
  ) {
    this._drawRuler(ctx, 'h', activeGuide);
  }

  /**
   * Draw vertical ruler
   * @param activeGuide - cached active guide info
   */
  private _drawVerticalRuler(
    ctx: Konva.Context,
    activeGuide: { type: 'h' | 'v'; coord: number } | null,
  ) {
    this._drawRuler(ctx, 'v', activeGuide);
  }

  /**
   * Full ruler redraw
   */
  private _redraw() {
    if (!this._core || !this._layer) return;

    const stage = this._core.stage;
    const stageW = stage.width();
    const stageH = stage.height();
    const tPx = this._options.thicknessPx;

    // Update background sizes
    if (this._hBg) {
      this._hBg.size({ width: stageW, height: tPx });
    }
    if (this._vBg) {
      this._vBg.size({ width: tPx, height: stageH });
    }

    // Update borders
    if (this._hBorder) {
      this._hBorder.points([0, tPx, stageW, tPx]);
    }
    if (this._vBorder) {
      this._vBorder.points([tPx, 0, tPx, stageH]);
    }

    // Redraw rulers
    this._layer.batchDraw();
  }

  /**
   * Deferred redraw with improved throttling
   * Groups fast zoom/pan events for optimization
   * @param isPanning - true for panning (more aggressive throttling)
   */
  private _scheduleRedraw(isPanning = false) {
    if (!this._core || !this._layer) return;

    const now = globalThis.performance.now();
    const timeSinceLastRedraw = now - this._lastRedrawTime;

    // If redraw is already scheduled, skip
    if (this._redrawScheduled) return;

    this._redrawScheduled = true;

    // Choose throttle period based on event type
    const throttleMs = isPanning ? this._panThrottleMs : this._redrawThrottleMs;

    // If enough time has passed since last redraw, draw immediately
    if (timeSinceLastRedraw >= throttleMs) {
      globalThis.requestAnimationFrame(() => {
        this._redrawScheduled = false;
        this._lastRedrawTime = globalThis.performance.now();
        this._redraw();
      });
    } else {
      // Otherwise defer until throttle period expires
      const delay = throttleMs - timeSinceLastRedraw;
      globalThis.setTimeout(() => {
        globalThis.requestAnimationFrame(() => {
          this._redrawScheduled = false;
          this._lastRedrawTime = globalThis.performance.now();
          this._redraw();
        });
      }, delay);
    }
  }

  public show() {
    if (this._core && this._layer) {
      this._core.stage.add(this._layer);
      this._layer.moveToTop();
      this._redraw();
      this._core.stage.batchDraw();
    }
  }

  public hide() {
    if (this._layer?.getStage()) {
      this._layer.remove();
      this._core?.stage.batchDraw();
    }
  }

  /**
   * Toggle ruler visibility
   */
  public toggle() {
    if (this._layer?.getStage()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if ruler is visible
   */
  public isVisible(): boolean {
    return !!this._layer?.getStage();
  }
}
