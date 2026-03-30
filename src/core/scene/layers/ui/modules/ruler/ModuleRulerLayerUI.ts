import { MathF32 } from "../../../../../math";
import type { LayerWorld } from "../../../world";
import { ModuleBaseLayerUI } from "../base";
import { RulerGuideLine } from "./RulerGuideLine";
import type { IModuleRulerUI, IRulerGuideLine } from "./types";


export class ModuleRulerUI extends ModuleBaseLayerUI implements IModuleRulerUI {
    /********************************************************************/
    /*                            Constants                             */
    /********************************************************************/

    public static readonly TYPE = "ruler";

    private static readonly DEFAULT_BACKGROUND     = "rgba(30,30,30,0.92)";
    private static readonly DEFAULT_TICK_COLOR     = "rgba(255,255,255,0.55)";
    private static readonly DEFAULT_TEXT_COLOR     = "rgba(255,255,255,0.80)";
    private static readonly DEFAULT_FONT           = "11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    private static readonly DEFAULT_GUIDE_COLOR    = "#0D93F3";
    private static readonly FOCUSED_GUIDE_COLOR    = "#F35D0D";
    private static readonly DEFAULT_THICKNESS      = 22;
    private static readonly DEFAULT_MIN_LABEL_PX   = 110;
    private static readonly DEFAULT_MIN_TICK_PX    = 8;
    private static readonly DEFAULT_MIN_MAJOR_TICK_PX = 20;


    /********************************************************************/
    /*                            Properties                            */
    /********************************************************************/

    private readonly _world: LayerWorld;

    private _cornerVisible: boolean;
    private _thickness: number;

    private _background: string;
    private _tickColor: string;
    private _textColor: string;
    private _font: string;

    private _minLabelPx: number;
    private _minTickPx: number;
    private _minMajorTickPx: number;


    /********************************************************************/
    /*                           DOM Refs                               */
    /********************************************************************/

    private _root: HTMLElement | null = null;
    private _portal: HTMLDivElement | null = null;
    private _topWrap: HTMLDivElement | null = null;
    private _leftWrap: HTMLDivElement | null = null;
    private _corner: HTMLDivElement | null = null;
    private _topCanvas: HTMLCanvasElement | null = null;
    private _leftCanvas: HTMLCanvasElement | null = null;


    /********************************************************************/
    /*                          Guides State                            */
    /********************************************************************/

    private readonly _guidesHorizontal: IRulerGuideLine[] = [];
    private readonly _guidesVertical: IRulerGuideLine[] = [];
    private readonly _guideElementsHorizontal: Map<number, HTMLDivElement> = new Map();
    private readonly _guideElementsVertical: Map<number, HTMLDivElement> = new Map();
    private _guideIdCounter: number = 1;

    private _focusedGuideId: number | null = null;
    private _focusedGuideAxis: "horizontal" | "vertical" | null = null;


    /********************************************************************/
    /*                          Drag State                              */
    /********************************************************************/

    private _activeGuidePreview: HTMLDivElement | null = null;
    private _activeGuideAxis: "horizontal" | "vertical" | null = null;
    private _activeGuidePointerId: number | null = null;
    private _activeGuideOwner: HTMLElement | null = null;
    private _activeDraggedGuideId: number | null = null;
    private _activeDraggedGuideAxis: "horizontal" | "vertical" | null = null;


    /********************************************************************/
    /*                           Constructor                            */
    /********************************************************************/

    constructor(world: LayerWorld) {
        super(ModuleRulerUI.TYPE);

        this._world = world;

        this._cornerVisible = true;
        this._thickness     = ModuleRulerUI.DEFAULT_THICKNESS;

        this._background = ModuleRulerUI.DEFAULT_BACKGROUND;
        this._tickColor  = ModuleRulerUI.DEFAULT_TICK_COLOR;
        this._textColor  = ModuleRulerUI.DEFAULT_TEXT_COLOR;
        this._font       = ModuleRulerUI.DEFAULT_FONT;

        this._minLabelPx    = ModuleRulerUI.DEFAULT_MIN_LABEL_PX;
        this._minTickPx     = ModuleRulerUI.DEFAULT_MIN_TICK_PX;
        this._minMajorTickPx = ModuleRulerUI.DEFAULT_MIN_MAJOR_TICK_PX;
    }


    /********************************************************************/
    /*                            Public API                            */
    /********************************************************************/

    public isCornerVisible(): boolean {
        return this._cornerVisible;
    }

    public setCornerVisible(value: boolean): void {
        if (this._cornerVisible === value) return;
        this._cornerVisible = value;
        this._syncCornerVisibility();
    }

    public getThickness(): number {
        return this._thickness;
    }

    public setThickness(value: number): void {
        const next = Math.max(0, MathF32.toF32(value));
        if (this._thickness === next) return;
        this._thickness = next;
        this._syncLayout();
    }

    public getBackground(): string { return this._background; }
    public setBackground(value: string): void {
        const next = value.trim();
        if (this._background === next) return;
        this._background = next;
        this._syncStyles();
    }

    public getTickColor(): string { return this._tickColor; }
    public setTickColor(value: string): void {
        const next = value.trim();
        if (this._tickColor === next) return;
        this._tickColor = next;
    }

    public getTextColor(): string { return this._textColor; }
    public setTextColor(value: string): void {
        const next = value.trim();
        if (this._textColor === next) return;
        this._textColor = next;
    }

    public getFont(): string { return this._font; }
    public setFont(value: string): void {
        const next = value.trim();
        if (this._font === next) return;
        this._font = next;
    }

    public getMinLabelPx(): number { return this._minLabelPx; }
    public setMinLabelPx(value: number): void {
        const next = Math.max(0, MathF32.toF32(value));
        if (this._minLabelPx === next) return;
        this._minLabelPx = next;
    }

    public getMinTickPx(): number { return this._minTickPx; }
    public setMinTickPx(value: number): void {
        const next = Math.max(0, MathF32.toF32(value));
        if (this._minTickPx === next) return;
        this._minTickPx = next;
    }

    public getMinMajorTickPx(): number { return this._minMajorTickPx; }
    public setMinMajorTickPx(value: number): void {
        const next = Math.max(0, MathF32.toF32(value));
        if (this._minMajorTickPx === next) return;
        this._minMajorTickPx = next;
    }


    /********************************************************************/
    /*                             Guides                               */
    /********************************************************************/

    public getGuideHorizontalRulerById(id: number): IRulerGuideLine | null {
        return this._guidesHorizontal.find(g => g.getId() === id) ?? null;
    }

    public getGuideVerticalRulerById(id: number): IRulerGuideLine | null {
        return this._guidesVertical.find(g => g.getId() === id) ?? null;
    }

    public getGuidesHorizontalRuler(): IRulerGuideLine[] {
        return [...this._guidesHorizontal];
    }

    public getGuidesVerticalRuler(): IRulerGuideLine[] {
        return [...this._guidesVertical];
    }

    public addGuideForHorizontalRuler(value: number): boolean {
        return this._addGuide("horizontal", value);
    }

    public addGuideForVerticalRuler(value: number): boolean {
        return this._addGuide("vertical", value);
    }

    public removeGuideFromHorizontalRuler(id: number): boolean {
        return this._removeGuide("horizontal", id);
    }

    public removeGuideFromVerticalRuler(id: number): boolean {
        return this._removeGuide("vertical", id);
    }

    public clearGuidesFromHorizontal(): void {
        this._clearGuides("horizontal");
    }

    public clearGuidesFromVertical(): void {
        this._clearGuides("vertical");
    }

    public clearGuides(): void {
        this._clearGuides("horizontal");
        this._clearGuides("vertical");
    }


    /********************************************************************/
    /*                            Lifecycle                             */
    /********************************************************************/

    public override attach(root: HTMLElement): void {
        this.detach();

        this._root = root;
        this._createDOM();
        this._syncLayout();
        this._syncStyles();
        this._syncCornerVisibility();
        this._syncGuideElements();

        this._topWrap?.addEventListener("pointerdown", this._onTopPointerDown, { passive: false });
        this._leftWrap?.addEventListener("pointerdown", this._onLeftPointerDown, { passive: false });
        window.addEventListener("pointerdown", this._onWindowPointerDown, true);
        window.addEventListener("keydown", this._onWindowKeyDown, true);
    }

    public override detach(): void {
        this._topWrap?.removeEventListener("pointerdown", this._onTopPointerDown);
        this._leftWrap?.removeEventListener("pointerdown", this._onLeftPointerDown);
        window.removeEventListener("pointerdown", this._onWindowPointerDown, true);
        window.removeEventListener("keydown", this._onWindowKeyDown, true);
        window.removeEventListener("pointermove", this._onWindowPointerMove);
        window.removeEventListener("pointerup", this._onWindowPointerUp);

        this._cancelActiveGuideDrag();
        this._portal?.remove();

        this._portal = null;
        this._topWrap = null;
        this._leftWrap = null;
        this._corner = null;
        this._topCanvas = null;
        this._leftCanvas = null;
        this._root = null;
    }

    public override clear(): void {
        this.clearGuides();
    }

    public override update(): void {
        if (!this._portal) return;

        this._portal.style.display = this.isEnabled() ? "block" : "none";

        if (!this.isEnabled()) return;

        this._syncGuideElements();
        this._draw();
    }

    public override destroy(): void {
        this.clear();
        super.destroy();
    }


    /********************************************************************/
    /*                         Event Handlers                           */
    /********************************************************************/

    private _onTopPointerDown = (e: PointerEvent): void => {
        if (!this._portal || !this._topWrap) return;
        e.preventDefault();

        const rect = this._portal.getBoundingClientRect();
        this._startGuideDrag("horizontal", e.clientY - rect.top, e.pointerId, this._topWrap);
    };

    private _onLeftPointerDown = (e: PointerEvent): void => {
        if (!this._portal || !this._leftWrap) return;
        e.preventDefault();

        const rect = this._portal.getBoundingClientRect();
        this._startGuideDrag("vertical", e.clientX - rect.left, e.pointerId, this._leftWrap);
    };

    private _onWindowPointerDown = (e: PointerEvent): void => {
        if (!(e.target instanceof HTMLElement)) {
            this._clearFocusedGuide();
            return;
        }

        if (!e.target.closest("[data-ruler-guide='true']")) {
            this._clearFocusedGuide();
        }
    };

    private _onWindowPointerMove = (e: PointerEvent): void => {
        if (!this._portal || e.pointerId !== this._activeGuidePointerId) return;
        e.preventDefault();

        const rect = this._portal.getBoundingClientRect();
        const cam = this._world.getCamera();

        if (this._activeDraggedGuideId !== null && this._activeDraggedGuideAxis) {
            const axis = this._activeDraggedGuideAxis;
            const guide = this._getGuideByAxisAndId(axis, this._activeDraggedGuideId);

            if (guide) {
                if (axis === "vertical") {
                    guide.setValue(cam.screenToWorld({ x: e.clientX - rect.left, y: 0 }).x);
                } else {
                    guide.setValue(cam.screenToWorld({ x: 0, y: e.clientY - rect.top }).y);
                }
                this._syncGuideElements();
            }
            return;
        }

        if (this._activeGuidePreview && this._activeGuideAxis) {
            if (this._activeGuideAxis === "vertical") {
                this._activeGuidePreview.style.left = `${e.clientX - rect.left}px`;
            } else {
                this._activeGuidePreview.style.top = `${e.clientY - rect.top}px`;
            }
        }
    };

    private _onWindowPointerUp = (e: PointerEvent): void => {
        if (!this._portal || e.pointerId !== this._activeGuidePointerId) return;
        e.preventDefault();

        if (!this._activeGuidePreview || !this._activeGuideAxis) {
            this._cancelActiveGuideDrag();
            return;
        }

        const rect = this._portal.getBoundingClientRect();
        const cam = this._world.getCamera();
        const cancelZone = this._thickness + 2;
        const axis = this._activeGuideAxis;

        if (axis === "vertical") {
            const screenX = Math.round(e.clientX - rect.left);
            if (screenX > cancelZone) {
                this._addGuide(axis, cam.screenToWorld({ x: screenX, y: 0 }).x);
            }
        } else {
            const screenY = Math.round(e.clientY - rect.top);
            if (screenY > cancelZone) {
                this._addGuide(axis, cam.screenToWorld({ x: 0, y: screenY }).y);
            }
        }

        this._cancelActiveGuideDrag();
    };

    private _onWindowKeyDown = (e: KeyboardEvent): void => {
        if (e.key !== "Delete" && e.key !== "Backspace") return;
        if (this._focusedGuideId === null || this._focusedGuideAxis === null) return;

        e.preventDefault();
        this._removeGuide(this._focusedGuideAxis, this._focusedGuideId);
        this._focusedGuideId = null;
        this._focusedGuideAxis = null;
    };

    private _onGuidePointerDown = (
        e: PointerEvent,
        axis: "horizontal" | "vertical",
        id: number
    ): void => {
        if (!this._portal) return;
        e.preventDefault();
        e.stopPropagation();

        this._focusGuide(axis, id);
        this._cancelActiveGuideDrag();

        this._activeGuidePointerId = e.pointerId;
        this._activeGuideAxis = axis;
        this._activeDraggedGuideId = id;
        this._activeDraggedGuideAxis = axis;

        window.addEventListener("pointermove", this._onWindowPointerMove, { passive: false });
        window.addEventListener("pointerup", this._onWindowPointerUp, { passive: false });
    };


    /********************************************************************/
    /*                         Guides Internal                          */
    /********************************************************************/

    private _addGuide(axis: "horizontal" | "vertical", value: number): boolean {
        const list = axis === "horizontal" ? this._guidesHorizontal : this._guidesVertical;
        const elements = axis === "horizontal" ? this._guideElementsHorizontal : this._guideElementsVertical;

        if (list.length >= 100 || !this._portal) return false;

        this._clearFocusedGuide();

        const guide = new RulerGuideLine(this._guideIdCounter++);
        guide.setValue(value);
        guide.setColor(ModuleRulerUI.FOCUSED_GUIDE_COLOR);

        const el = this._createGuideElement(axis, guide);
        this._portal.appendChild(el);

        list.push(guide);
        elements.set(guide.getId(), el);

        this._focusedGuideId = guide.getId();
        this._focusedGuideAxis = axis;

        this._syncGuideElements();
        return true;
    }

    private _removeGuide(axis: "horizontal" | "vertical", id: number): boolean {
        const list = axis === "horizontal" ? this._guidesHorizontal : this._guidesVertical;
        const elements = axis === "horizontal" ? this._guideElementsHorizontal : this._guideElementsVertical;

        const index = list.findIndex(g => g.getId() === id);
        if (index === -1) return false;

        list.splice(index, 1);
        elements.get(id)?.remove();
        elements.delete(id);

        if (this._focusedGuideAxis === axis && this._focusedGuideId === id) {
            this._focusedGuideId = null;
            this._focusedGuideAxis = null;
        }

        return true;
    }

    private _clearGuides(axis: "horizontal" | "vertical"): void {
        const list = axis === "horizontal" ? this._guidesHorizontal : this._guidesVertical;
        const elements = axis === "horizontal" ? this._guideElementsHorizontal : this._guideElementsVertical;

        for (const guide of list) {
            elements.get(guide.getId())?.remove();
        }

        list.length = 0;
        elements.clear();
    }

    private _focusGuide(axis: "horizontal" | "vertical", id: number): void {
        if (this._focusedGuideId === id && this._focusedGuideAxis === axis) return;

        this._clearFocusedGuide();

        const guide = this._getGuideByAxisAndId(axis, id);
        if (!guide) return;

        guide.setColor(ModuleRulerUI.FOCUSED_GUIDE_COLOR);
        this._focusedGuideId = id;
        this._focusedGuideAxis = axis;

        this._syncGuideElements();
    }

    private _clearFocusedGuide(): void {
        if (this._focusedGuideId === null || this._focusedGuideAxis === null) return;

        const guide = this._getGuideByAxisAndId(this._focusedGuideAxis, this._focusedGuideId);
        guide?.setColor(ModuleRulerUI.DEFAULT_GUIDE_COLOR);

        this._focusedGuideId = null;
        this._focusedGuideAxis = null;
        this._syncGuideElements();
    }

    private _getGuideByAxisAndId(axis: "horizontal" | "vertical", id: number): IRulerGuideLine | null {
        return axis === "horizontal"
            ? this.getGuideHorizontalRulerById(id)
            : this.getGuideVerticalRulerById(id);
    }


    /********************************************************************/
    /*                          Guide Drag                              */
    /********************************************************************/

    private _startGuideDrag(
        axis: "horizontal" | "vertical",
        value: number,
        pointerId: number,
        owner: HTMLElement
    ): void {
        if (!this._portal) return;

        this._cancelActiveGuideDrag();

        const preview = document.createElement("div");
        preview.style.cssText = "position:absolute; pointer-events:none; z-index:20;";
        preview.style.background = ModuleRulerUI.FOCUSED_GUIDE_COLOR;

        if (axis === "vertical") {
            preview.style.cssText += "top:0; bottom:0; width:1px;";
            preview.style.left = `${value}px`;
        } else {
            preview.style.cssText += "left:0; right:0; height:1px;";
            preview.style.top = `${value}px`;
        }

        this._portal.appendChild(preview);

        this._activeGuidePreview = preview;
        this._activeGuideAxis = axis;
        this._activeGuidePointerId = pointerId;
        this._activeGuideOwner = owner;

        try { owner.setPointerCapture(pointerId); } catch { }

        window.addEventListener("pointermove", this._onWindowPointerMove, { passive: false });
        window.addEventListener("pointerup", this._onWindowPointerUp, { passive: false });
    }

    private _cancelActiveGuideDrag(): void {
        if (this._activeGuideOwner && this._activeGuidePointerId !== null) {
            try { this._activeGuideOwner.releasePointerCapture(this._activeGuidePointerId); } catch { }
        }

        window.removeEventListener("pointermove", this._onWindowPointerMove);
        window.removeEventListener("pointerup", this._onWindowPointerUp);

        this._activeGuidePreview?.remove();
        this._activeGuidePreview = null;
        this._activeGuideAxis = null;
        this._activeGuidePointerId = null;
        this._activeGuideOwner = null;
        this._activeDraggedGuideId = null;
        this._activeDraggedGuideAxis = null;
    }


    /********************************************************************/
    /*                            DOM                                   */
    /********************************************************************/

    private _createDOM(): void {
        if (!this._root) return;

        const portal = document.createElement("div");
        portal.className = "flowscape-ui-ruler";
        portal.style.cssText = "position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;";

        const topWrap = document.createElement("div");
        topWrap.className = "flowscape-ui-ruler-top";
        topWrap.style.cssText = "position:absolute; pointer-events:auto;";
        topWrap.appendChild(this._createCanvas());

        const leftWrap = document.createElement("div");
        leftWrap.className = "flowscape-ui-ruler-left";
        leftWrap.style.cssText = "position:absolute; pointer-events:auto;";
        leftWrap.appendChild(this._createCanvas());

        const corner = document.createElement("div");
        corner.className = "flowscape-ui-ruler-corner";
        corner.style.cssText = "position:absolute; pointer-events:none;";

        portal.appendChild(topWrap);
        portal.appendChild(leftWrap);
        portal.appendChild(corner);
        this._root.appendChild(portal);

        this._portal = portal;
        this._topWrap = topWrap;
        this._leftWrap = leftWrap;
        this._corner = corner;
        this._topCanvas = topWrap.firstElementChild as HTMLCanvasElement;
        this._leftCanvas = leftWrap.firstElementChild as HTMLCanvasElement;
    }

    private _createCanvas(): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.style.cssText = "display:block; width:100%; height:100%;";
        return canvas;
    }

    private _createGuideElement(axis: "horizontal" | "vertical", guide: IRulerGuideLine): HTMLDivElement {
        const hitbox = document.createElement("div");
        hitbox.style.cssText = "position:absolute; pointer-events:auto; z-index:15;";
        hitbox.dataset["rulerGuide"] = "true";

        const line = document.createElement("div");
        line.style.cssText = "position:absolute; pointer-events:none;";
        line.style.background = guide.getColor();

        if (axis === "vertical") {
            hitbox.style.cssText += "top:0; bottom:0; width:10px; cursor:ew-resize;";
            line.style.cssText += "top:0; bottom:0; left:50%; transform:translateX(-50%);";
            line.style.width = `${Math.max(1, guide.getThickness())}px`;
        } else {
            hitbox.style.cssText += "left:0; right:0; height:10px; cursor:ns-resize;";
            line.style.cssText += "left:0; right:0; top:50%; transform:translateY(-50%);";
            line.style.height = `${Math.max(1, guide.getThickness())}px`;
        }

        hitbox.appendChild(line);
        this._applyGuideElementStyles(hitbox, axis, guide);

        hitbox.addEventListener("pointerdown", (e) => {
            this._onGuidePointerDown(e, axis, guide.getId());
        });

        return hitbox;
    }

    private _applyGuideElementStyles(el: HTMLDivElement, axis: "horizontal" | "vertical", guide: IRulerGuideLine): void {
        el.style.display = guide.isVisible() ? "block" : "none";

        const line = el.firstElementChild as HTMLDivElement | null;
        if (!line) return;

        const cam = this._world.getCamera();
        line.style.background = guide.getColor();

        if (axis === "vertical") {
            const screenX = cam.worldToScreen({ x: guide.getValue(), y: 0 }).x;
            el.style.left = `${screenX - 5}px`;
            line.style.width = `${Math.max(1, guide.getThickness())}px`;
        } else {
            const screenY = cam.worldToScreen({ x: 0, y: guide.getValue() }).y;
            el.style.top = `${screenY - 5}px`;
            line.style.height = `${Math.max(1, guide.getThickness())}px`;
        }
    }


    /********************************************************************/
    /*                             Sync                                 */
    /********************************************************************/

    private _syncLayout(): void {
        if (!this._topWrap || !this._leftWrap || !this._corner) return;

        const t = `${this._thickness}px`;

        this._topWrap.style.left   = t;
        this._topWrap.style.top    = "0";
        this._topWrap.style.right  = "0";
        this._topWrap.style.height = t;

        this._leftWrap.style.left   = "0";
        this._leftWrap.style.top    = t;
        this._leftWrap.style.bottom = "0";
        this._leftWrap.style.width  = t;

        this._corner.style.left   = "0";
        this._corner.style.top    = "0";
        this._corner.style.width  = t;
        this._corner.style.height = t;
    }

    private _syncStyles(): void {
        if (!this._topWrap || !this._leftWrap || !this._corner) return;

        const border = "1px solid rgba(255,255,255,0.35)";

        this._topWrap.style.background   = this._background;
        this._leftWrap.style.background  = this._background;
        this._corner.style.background    = this._background;

        this._topWrap.style.borderBottom  = border;
        this._leftWrap.style.borderRight  = border;
        this._corner.style.borderBottom   = border;
        this._corner.style.borderRight    = border;

        this._topWrap.style.cursor  = "n-resize";
        this._leftWrap.style.cursor = "w-resize";
    }

    private _syncCornerVisibility(): void {
        if (!this._corner) return;
        this._corner.style.display = this._cornerVisible ? "block" : "none";
    }

    private _syncGuideElements(): void {
        for (const guide of this._guidesHorizontal) {
            const el = this._guideElementsHorizontal.get(guide.getId());
            if (el) this._applyGuideElementStyles(el, "horizontal", guide);
        }

        for (const guide of this._guidesVertical) {
            const el = this._guideElementsVertical.get(guide.getId());
            if (el) this._applyGuideElementStyles(el, "vertical", guide);
        }
    }


    /********************************************************************/
    /*                             Draw                                 */
    /********************************************************************/

    private _draw(): void {
        if (!this._root || !this._topCanvas || !this._leftCanvas) return;

        const dpr  = window.devicePixelRatio || 1;
        const viewW = this._root.clientWidth;
        const viewH = this._root.clientHeight;

        if (viewW <= 1 || viewH <= 1) return;

        const cam = this._world.getCamera().getState();

        this._resizeCanvas(this._topCanvas,  viewW - this._thickness, this._thickness, dpr);
        this._resizeCanvas(this._leftCanvas, this._thickness, viewH - this._thickness, dpr);

        const topCtx  = this._topCanvas.getContext("2d");
        const leftCtx = this._leftCanvas.getContext("2d");
        if (!topCtx || !leftCtx) return;

        this._drawTop(topCtx,   viewW - this._thickness, this._thickness, dpr, cam);
        this._drawLeft(leftCtx, this._thickness, viewH - this._thickness, dpr, cam);
    }

    private _drawTop(
        ctx: CanvasRenderingContext2D,
        w: number, h: number, dpr: number,
        cam: { x: number; y: number; scale: number }
    ): void {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = this._tickColor;
        ctx.fillStyle   = this._textColor;
        ctx.font        = this._font;
        ctx.textBaseline = "top";

        const stepWorld = this._getRulerStepWorld(cam.scale);
        const viewW     = w + this._thickness;
        const worldLeft = cam.x - (viewW / 2) / cam.scale;
        const worldRight = cam.x + (viewW / 2) / cam.scale;
        const start = Math.floor(worldLeft  / stepWorld) - 2;
        const end   = Math.ceil(worldRight / stepWorld) + 2;

        for (let i = start; i <= end; i++) {
            const worldX  = i * stepWorld;
            const screenX = (worldX - worldLeft) * cam.scale - this._thickness;
            if (screenX < -50 || screenX > w + 50) continue;

            const alpha = this._edgeFadeAlpha(screenX, 40);
            if (alpha <= 0.01) continue;

            const isMajor  = i % 1 === 0;
            const tickSize = isMajor ? Math.max(6, h * 0.35) : Math.max(3, h * 0.18);
            const px       = Math.round(screenX) + 0.5;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(px, h);
            ctx.lineTo(px, h - tickSize);
            ctx.stroke();

            if (isMajor) {
                const text = String(Math.round(worldX));
                ctx.fillText(text, px - ctx.measureText(text).width / 2, 2);
            }

            ctx.restore();
        }

        ctx.restore();
    }

    private _drawLeft(
        ctx: CanvasRenderingContext2D,
        w: number, h: number, dpr: number,
        cam: { x: number; y: number; scale: number }
    ): void {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle  = this._tickColor;
        ctx.fillStyle    = this._textColor;
        ctx.font         = this._font;
        ctx.textBaseline = "middle";

        const stepWorld  = this._getRulerStepWorld(cam.scale);
        const viewH      = h + this._thickness;
        const worldTop   = cam.y - (viewH / 2) / cam.scale;
        const worldBottom = cam.y + (viewH / 2) / cam.scale;
        const start = Math.floor(worldTop    / stepWorld) - 2;
        const end   = Math.ceil(worldBottom / stepWorld) + 2;

        for (let i = start; i <= end; i++) {
            const worldY  = i * stepWorld;
            const screenY = (worldY - worldTop) * cam.scale - this._thickness;
            if (screenY < -50 || screenY > h + 50) continue;

            const alpha = this._edgeFadeAlpha(screenY, 40);
            if (alpha <= 0.01) continue;

            const isMajor  = i % 1 === 0;
            const tickSize = isMajor ? Math.max(6, w * 0.35) : Math.max(3, w * 0.18);
            const py       = Math.round(screenY) + 0.5;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(w, py);
            ctx.lineTo(w - tickSize, py);
            ctx.stroke();

            if (isMajor) {
                ctx.translate(8, py);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign    = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(String(Math.round(worldY)), 0, 0);
            }

            ctx.restore();
        }

        ctx.restore();
    }


    /********************************************************************/
    /*                           Draw Utils                             */
    /********************************************************************/

    private _resizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number, dpr: number): void {
        const w = Math.max(1, Math.floor(cssW * dpr));
        const h = Math.max(1, Math.floor(cssH * dpr));
        if (canvas.width  !== w) canvas.width  = w;
        if (canvas.height !== h) canvas.height = h;
    }

    private _getRulerStepWorld(scale: number): number {
        const targetWorld = Math.max(this._minLabelPx, 60) / Math.max(scale, 0.000001);
        const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
        return steps.find(s => s >= targetWorld) ?? steps[steps.length - 1] ?? 1000;
    }

    private _edgeFadeAlpha(distPx: number, fadeWidthPx: number): number {
        if (distPx >= fadeWidthPx) return 1;
        const t = Math.max(0, Math.min(1, distPx / fadeWidthPx));
        return t * t * (3 - 2 * t);
    }
}