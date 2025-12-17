import { NodeAddon } from '../addons/NodeAddon';
import { PluginAddon } from '../addons/PluginAddon';
import { CoreEngine } from '../core/CoreEngine';
import { BaseNode } from '../nodes/BaseNode';

import { Plugin } from './Plugin';

class DragDropFromDataTransferAddon extends PluginAddon<ContentFromClipboardPlugin> {
  private _container: HTMLDivElement | null = null;
  private _onDragOver: ((e: DragEvent) => void) | null = null;
  private _onDrop: ((e: DragEvent) => void) | null = null;

  protected onAttach(plugin: ContentFromClipboardPlugin, core: CoreEngine): void {
    const container = core.stage.container();
    this._container = container;

    this._onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    this._onDrop = (e: DragEvent) => {
      void plugin.handleDrop(e);
    };

    container.addEventListener('dragover', this._onDragOver);
    container.addEventListener('drop', this._onDrop);
  }

  protected onDetach(_plugin: ContentFromClipboardPlugin, _core: CoreEngine): void {
    if (this._container && this._onDragOver) {
      this._container.removeEventListener('dragover', this._onDragOver);
    }
    if (this._container && this._onDrop) {
      this._container.removeEventListener('drop', this._onDrop);
    }
    this._container = null;
    this._onDragOver = null;
    this._onDrop = null;
  }
}

class RevokeObjectUrlAddon extends NodeAddon {
  private readonly _objectUrl: string;
  private _revoked = false;

  constructor(objectUrl: string) {
    super();
    this._objectUrl = objectUrl;
  }

  protected onAttach(_node: BaseNode): void {
    // no-op
  }

  protected onDetach() {
    if (this._revoked) return;
    URL.revokeObjectURL(this._objectUrl);
    this._revoked = true;
  }
}

export interface ContentFromClipboardPluginOptions {
  target?: Window | Document | HTMLElement | EventTarget;
  ignoreEditableTargets?: boolean;
  maxImageSize?: number;
  enableDragDrop?: boolean;
}

export class ContentFromClipboardPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<Omit<ContentFromClipboardPluginOptions, 'target'>> & {
    target: EventTarget;
  };

  private _dragDropAddon: DragDropFromDataTransferAddon | null = null;

  constructor(options: ContentFromClipboardPluginOptions = {}) {
    super();
    const { target = globalThis as unknown as EventTarget, ignoreEditableTargets = true } = options;

    this._options = {
      target,
      ignoreEditableTargets,
      maxImageSize: options.maxImageSize ?? Number.POSITIVE_INFINITY,
      enableDragDrop: options.enableDragDrop ?? true,
    };

    if (this._options.enableDragDrop) {
      this._dragDropAddon = new DragDropFromDataTransferAddon();
      this.addons.add(this._dragDropAddon);
    }
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;
    this._options.target.addEventListener('paste', this._onPaste as EventListener);
  }

  protected onDetach(_core: CoreEngine): void {
    this._options.target.removeEventListener('paste', this._onPaste as EventListener);
    this._core = undefined as unknown as CoreEngine;
  }

  private _onPaste = (e: ClipboardEvent) => {
    void this._handlePaste(e);
  };

  private async _handlePaste(e: ClipboardEvent): Promise<void> {
    if (!this._core) return;

    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) {
      return;
    }

    const dt = e.clipboardData;
    if (!dt) return;

    const pastePosition = this._getPastePosition();
    await this._handleDataTransfer(dt, pastePosition, e);
  }

  public async handleDrop(e: DragEvent): Promise<void> {
    if (!this._core) return;

    const dt = e.dataTransfer;
    if (!dt) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    // DOM event -> Konva needs manual pointer registration
    this._core.stage.setPointersPositions(e);

    const pointer = this._core.stage.getPointerPosition();
    if (!pointer) return;

    const world = this._core.nodes.world;
    const worldTransform = world.getAbsoluteTransform().copy().invert();
    const worldPos = worldTransform.point(pointer);

    await this._handleDataTransfer(dt, { x: worldPos.x, y: worldPos.y }, e);
  }

  private async _handleDataTransfer(
    dt: DataTransfer,
    position: { x: number; y: number },
    e: { preventDefault: () => void } | null,
  ): Promise<void> {
    if (!this._core) return;

    const items = Array.from(dt.items);
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (!item) continue;

      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file?.type === 'image/svg+xml' || file?.name.toLowerCase().endsWith('.svg')) {
          e?.preventDefault();
          await this._pasteSvgFile(file, position);
          return;
        }
        if (file && (file.type.startsWith('video/') || this._looksLikeVideoFile(file))) {
          e?.preventDefault();
          await this._pasteVideoFile(file, position);
          return;
        }
        if (file && (file.type.startsWith('image/') || file.type === '')) {
          e?.preventDefault();
          await this._pasteImageFile(file, position);
          return;
        }
      }

      if (item.kind === 'string' && (item.type === 'text/plain' || item.type === 'text/html')) {
        const raw = await this._getAsString(item);

        const svgMarkup = this._extractSvgMarkup(raw);
        if (svgMarkup) {
          e?.preventDefault();
          this._pasteSvgText(svgMarkup, position);
          return;
        }

        const text = item.type === 'text/html' ? this._htmlToText(raw) : raw;
        if (text.trim().length > 0) {
          e?.preventDefault();
          this._core.nodes.addText({ x: position.x, y: position.y, text });
          return;
        }
      }
    }

    // Fallbacks for browsers where dataTransfer.items is empty or does not expose strings
    const files = Array.from((dt as unknown as { files?: FileList }).files ?? []);
    for (let i = files.length - 1; i >= 0; i--) {
      const file = files[i];
      if (!file) continue;

      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        e?.preventDefault();
        await this._pasteSvgFile(file, position);
        return;
      }
      if (file.type.startsWith('video/') || this._looksLikeVideoFile(file)) {
        e?.preventDefault();
        await this._pasteVideoFile(file, position);
        return;
      }
      if (file.type.startsWith('image/') || file.type === '') {
        e?.preventDefault();
        await this._pasteImageFile(file, position);
        return;
      }
    }

    const rawText = dt.getData('text/plain') || '';
    const rawHtml = dt.getData('text/html') || '';

    const svgMarkup = this._extractSvgMarkup(rawHtml) ?? this._extractSvgMarkup(rawText);
    if (svgMarkup) {
      e?.preventDefault();
      this._pasteSvgText(svgMarkup, position);
      return;
    }

    const text = this._htmlToText(rawHtml || rawText);
    if (text.trim().length > 0) {
      e?.preventDefault();
      this._core.nodes.addText({ x: position.x, y: position.y, text });
      return;
    }
  }

  private _pasteSvgText(
    svgText: string,
    position: {
      x: number;
      y: number;
    },
  ): void {
    if (!this._core) return;

    const src = this._svgTextToSrc(svgText);
    const natural = this._extractSvgSize(svgText);
    const fitted = this._fitIntoMaxSize(natural, this._options.maxImageSize);

    this._core.nodes.addSvg({
      x: position.x,
      y: position.y,
      src,
      width: fitted.width,
      height: fitted.height,
    });
  }

  private async _pasteSvgFile(
    file: File,
    position: {
      x: number;
      y: number;
    },
  ): Promise<void> {
    const svgText = await this._readFileAsText(file);
    this._pasteSvgText(svgText, position);
  }

  private async _pasteImageFile(
    file: File,
    position: {
      x: number;
      y: number;
    },
  ): Promise<void> {
    if (!this._core) return;

    const objectUrl = URL.createObjectURL(file);
    try {
      const natural = await this._loadImageSize(objectUrl);
      const fitted = this._fitIntoMaxSize(natural, this._options.maxImageSize);

      const imageNode = this._core.nodes.addImage({
        x: position.x,
        y: position.y,
        src: objectUrl,
        width: fitted.width,
        height: fitted.height,
      });

      imageNode.addons.add(new RevokeObjectUrlAddon(objectUrl));
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  private async _pasteVideoFile(
    file: File,
    position: {
      x: number;
      y: number;
    },
  ): Promise<void> {
    if (!this._core) return;

    const objectUrl = URL.createObjectURL(file);
    try {
      const videoNode = this._core.nodes.addVideo({
        x: position.x,
        y: position.y,
        width: 320,
        height: 240,
        autoplay: true,
        loop: true,
        muted: false,
        volume: 1,
      });

      await videoNode.setSrc(objectUrl, {
        autoplay: true,
        loop: true,
        muted: false,
        volume: 1,
      });

      const el = videoNode.getVideoElement();
      const natural = el
        ? { width: el.videoWidth || 0, height: el.videoHeight || 0 }
        : { width: 0, height: 0 };
      const fitted = this._fitIntoMaxSize(natural, this._options.maxImageSize);
      videoNode.setSize({ width: fitted.width, height: fitted.height });

      videoNode.addons.add(new RevokeObjectUrlAddon(objectUrl));
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }

  private _fitIntoMaxSize(
    size: { width: number; height: number },
    maxSize: number,
  ): { width: number; height: number } {
    if (!isFinite(size.width) || !isFinite(size.height) || size.width <= 0 || size.height <= 0) {
      return { width: 150, height: 150 };
    }

    if (!isFinite(maxSize) || maxSize <= 0) {
      return size;
    }

    const maxDim = Math.max(size.width, size.height);
    if (maxDim <= maxSize) return size;

    const scale = maxSize / maxDim;
    return {
      width: Math.max(1, Math.round(size.width * scale)),
      height: Math.max(1, Math.round(size.height * scale)),
    };
  }

  private _isEditableTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  private _getPastePosition(): { x: number; y: number } {
    if (!this._core) return { x: 0, y: 0 };

    const stage = this._core.stage;
    const pointer = stage.getPointerPosition();

    if (pointer && this._isPointerOnScreen(pointer)) {
      const world = this._core.nodes.world;
      const worldTransform = world.getAbsoluteTransform().copy().invert();
      const worldPos = worldTransform.point(pointer);
      return { x: worldPos.x, y: worldPos.y };
    }

    return this._getScreenCenter();
  }

  private _isPointerOnScreen(pointer: { x: number; y: number }): boolean {
    if (!this._core) return false;
    const stage = this._core.stage;
    const width = stage.width();
    const height = stage.height();
    return pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
  }

  private _getScreenCenter(): { x: number; y: number } {
    if (!this._core) return { x: 0, y: 0 };

    const stage = this._core.stage;
    const world = this._core.nodes.world;

    const centerX = stage.width() / 2;
    const centerY = stage.height() / 2;

    const worldTransform = world.getAbsoluteTransform().copy().invert();
    const worldPos = worldTransform.point({ x: centerX, y: centerY });

    return { x: worldPos.x, y: worldPos.y };
  }

  private _getAsString(item: DataTransferItem): Promise<string> {
    return new Promise((resolve) => {
      item.getAsString((s) => {
        resolve(s);
      });
    });
  }

  private _looksLikeVideoFile(file: File): boolean {
    const name = typeof file.name === 'string' ? file.name.toLowerCase() : '';
    if (!name) return false;
    return (
      name.endsWith('.mp4') ||
      name.endsWith('.webm') ||
      name.endsWith('.mov') ||
      name.endsWith('.m4v') ||
      name.endsWith('.mkv') ||
      name.endsWith('.avi')
    );
  }

  private _htmlToText(html: string): string {
    const DomParserCtor =
      (globalThis as unknown as { DOMParser?: new () => DOMParser }).DOMParser ?? null;
    if (!DomParserCtor) return html;
    const parser = new DomParserCtor();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

  private _readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result;
        if (typeof res === 'string') {
          resolve(res);
          return;
        }
        reject(new Error('Failed to read clipboard SVG'));
      };
      reader.onerror = () => {
        reject(new Error('Failed to read clipboard SVG'));
      };
      reader.readAsText(file);
    });
  }

  private _extractSvgMarkup(input: string): string | null {
    const s = input.trim();
    const lower = s.toLowerCase();
    const start = lower.indexOf('<svg');
    if (start === -1) return null;
    const end = lower.lastIndexOf('</svg>');
    if (end === -1) return null;
    return s.slice(start, end + 6);
  }

  private _svgTextToSrc(svgText: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  private _parseSvgNumber(value: string): number {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }

  private _extractSvgSize(svgText: string): { width: number; height: number } {
    const widthRe = /\bwidth\s*=\s*["']([^"']+)["']/i;
    const heightRe = /\bheight\s*=\s*["']([^"']+)["']/i;
    const widthMatch = widthRe.exec(svgText);
    const heightMatch = heightRe.exec(svgText);
    const w = widthMatch?.[1] ? this._parseSvgNumber(widthMatch[1]) : 0;
    const h = heightMatch?.[1] ? this._parseSvgNumber(heightMatch[1]) : 0;
    if (w > 0 && h > 0) return { width: w, height: h };

    const viewBoxRe = /\bviewBox\s*=\s*["']([^"']+)["']/i;
    const viewBoxMatch = viewBoxRe.exec(svgText);
    if (viewBoxMatch?.[1]) {
      const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
      const vbWStr = parts.length >= 4 ? parts[2] : undefined;
      const vbHStr = parts.length >= 4 ? parts[3] : undefined;
      const vbW = vbWStr ? this._parseSvgNumber(vbWStr) : 0;
      const vbH = vbHStr ? this._parseSvgNumber(vbHStr) : 0;
      if (vbW > 0 && vbH > 0) return { width: vbW, height: vbH };
    }

    return { width: 150, height: 150 };
  }

  private _loadImageSize(src: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const ImgCtor =
        (globalThis as unknown as { Image?: new () => HTMLImageElement }).Image ?? null;
      if (!ImgCtor) {
        reject(new Error('Image constructor is not available in current environment'));
        return;
      }

      const img = new ImgCtor();
      img.onload = () => {
        resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load clipboard image'));
      };
      img.src = src;
    });
  }
}
