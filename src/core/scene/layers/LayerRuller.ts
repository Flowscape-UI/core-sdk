import type { LayerWorld } from "./LayerWorld";
import type { LayerUIRoot } from "./LayerUI";
import Konva from "konva";

export type RulerOptions = {
    enabled?: boolean;
    thickness?: number; // px
    background?: string; // css color
    tickColor?: string; // css color
    textColor?: string; // css color
    font?: string; // css font
    minPxPerStep?: number; // legacy
    showCorner?: boolean;
    zIndex?: number;

    minLabelPx?: number;
    minTickPx?: number;
    minMajorTickPx?: number;
};

const DEFAULTS: Required<RulerOptions> = {
    enabled: true,
    thickness: 22,
    background: "rgba(30,30,30,0.92)",
    tickColor: "rgba(255,255,255,0.55)",
    textColor: "rgba(255,255,255,0.80)",
    font: "11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    minPxPerStep: 55,
    showCorner: true,
    zIndex: 9999,

    minLabelPx: 110,
    minTickPx: 8,
    minMajorTickPx: 20,
};

export class RulerUILayer {
    private readonly _world: LayerWorld;
    private readonly _portal: HTMLDivElement;
    private readonly _opts: Required<RulerOptions>;

    private readonly _topWrap: HTMLDivElement;
    private readonly _leftWrap: HTMLDivElement;
    private readonly _corner: HTMLDivElement;

    private readonly _topCanvas: HTMLCanvasElement;
    private readonly _leftCanvas: HTMLCanvasElement;

    // ---- Guides ----
    private _guidesLayer: Konva.Layer | null = null;
    private _activeGuide:
        | { axis: "x" | "y"; line: Konva.Line; pointerId: number; ownerEl: HTMLElement }
        | null = null;

    private _guides: { axis: "x" | "y"; worldValue: number; line: Konva.Line }[] = [];

    private _onPointerMoveBound = (e: PointerEvent) => this._onPointerMove(e);
    private _onPointerUpBound = (e: PointerEvent) => this._onPointerUp(e);

    // ---- Steps ----
    private _minorKIndex: number | null = null;
    private readonly _niceKs: number[] = this._buildNiceKs();

    private _unsubCam: (() => void) | null = null;
    private _raf = 0;

    constructor(ui: LayerUIRoot, world: LayerWorld, opts: RulerOptions = {}) {
        this._world = world;
        this._opts = { ...DEFAULTS, ...opts };

        this._portal = ui.createPortal("flowscape-ui-rulers");

        // portal above
        this._portal.style.position = "absolute";
        this._portal.style.inset = "0";
        this._portal.style.pointerEvents = "none";
        this._portal.style.zIndex = String(this._opts.zIndex);

        const t = this._opts.thickness;

        // top ruler
        this._topWrap = document.createElement("div");
        this._topWrap.style.position = "absolute";
        this._topWrap.style.left = `${t}px`;
        this._topWrap.style.top = "0";
        this._topWrap.style.right = "0";
        this._topWrap.style.height = `${t}px`;
        this._topWrap.style.background = this._opts.background;
        this._topWrap.style.pointerEvents = "auto";
        this._topWrap.style.cursor = "n-resize";

        this._topCanvas = document.createElement("canvas");
        this._topCanvas.style.display = "block";
        this._topCanvas.style.width = "100%";
        this._topCanvas.style.height = "100%";
        this._topWrap.appendChild(this._topCanvas);

        // left ruler
        this._leftWrap = document.createElement("div");
        this._leftWrap.style.position = "absolute";
        this._leftWrap.style.left = "0";
        this._leftWrap.style.top = `${t}px`;
        this._leftWrap.style.bottom = "0";
        this._leftWrap.style.width = `${t}px`;
        this._leftWrap.style.background = this._opts.background;
        this._leftWrap.style.pointerEvents = "auto";
        this._leftWrap.style.cursor = "w-resize";

        this._leftCanvas = document.createElement("canvas");
        this._leftCanvas.style.display = "block";
        this._leftCanvas.style.width = "100%";
        this._leftCanvas.style.height = "100%";
        this._leftWrap.appendChild(this._leftCanvas);

        // corner
        this._corner = document.createElement("div");
        this._corner.style.position = "absolute";
        this._corner.style.left = "0";
        this._corner.style.top = "0";
        this._corner.style.width = `${t}px`;
        this._corner.style.height = `${t}px`;
        this._corner.style.background = this._opts.background;
        this._corner.style.pointerEvents = "none";
        this._corner.style.display = this._opts.showCorner ? "block" : "none";

        // append order: corner last could cover borders, so keep as you want visually
        this._portal.appendChild(this._topWrap);
        this._portal.appendChild(this._leftWrap);
        this._portal.appendChild(this._corner);

        const border = "rgba(255,255,255,0.35)";
        this._topWrap.style.borderBottom = `1px solid ${border}`;
        this._leftWrap.style.borderRight = `1px solid ${border}`;
        this._corner.style.borderBottom = `1px solid ${border}`;
        this._corner.style.borderRight = `1px solid ${border}`;

        // guides konva layer
        this._ensureGuidesLayer();

        // drag guides from rulers
        this._topWrap.addEventListener("pointerdown", this._onTopPointerDown, { passive: false });
        this._leftWrap.addEventListener("pointerdown", this._onLeftPointerDown, { passive: false });

        // camera updates
        this._unsubCam = this._world.onCameraChange(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this._syncGuides();
                    this.requestDraw();
                });
            });
        });

        window.addEventListener("resize", this._onResize, { passive: true });

        this.requestDraw();
    }

    public destroy() {
        window.removeEventListener("resize", this._onResize);

        this._topWrap.removeEventListener("pointerdown", this._onTopPointerDown as any);
        this._leftWrap.removeEventListener("pointerdown", this._onLeftPointerDown as any);

        // if drag in progress - cancel cleanly
        this._cancelActiveGuideDrag();

        this._guidesLayer?.destroy();
        this._guidesLayer = null;
        this._activeGuide = null;

        if (this._unsubCam) this._unsubCam();
        if (this._raf) cancelAnimationFrame(this._raf);
        this._portal.remove();
    }

    private _onResize = () => this.requestDraw();

    public requestDraw() {
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
            this._raf = 0;
            this._draw();
        });
    }

    private _draw() {
        if (!this._opts.enabled) return;

        const dpr = window.devicePixelRatio || 1;
        const { viewW, viewH } = this._getViewportSizeSafe();
        if (viewW <= 1 || viewH <= 1) return;

        this._resizeCanvas(this._topCanvas, viewW - this._opts.thickness, this._opts.thickness, dpr);
        this._resizeCanvas(this._leftCanvas, this._opts.thickness, viewH - this._opts.thickness, dpr);

        const cam = this._world.camera.getState();

        const topCtx = this._topCanvas.getContext("2d");
        const leftCtx = this._leftCanvas.getContext("2d");
        if (!topCtx || !leftCtx) return;

        this._drawTop(topCtx, viewW - this._opts.thickness, this._opts.thickness, dpr, cam);
        this._drawLeft(leftCtx, this._opts.thickness, viewH - this._opts.thickness, dpr, cam);
    }

    private _getViewportSizeSafe(): { viewW: number; viewH: number } {
        const stage = (this._world as any)?._stage;
        const sw = typeof stage?.width === "function" ? stage.width() : 0;
        const sh = typeof stage?.height === "function" ? stage.height() : 0;
        if (sw && sh) return { viewW: sw, viewH: sh };

        const maybeStageContainer: HTMLDivElement | null =
            typeof stage?.container === "function" ? stage.container() : null;

        const el = maybeStageContainer ?? (this._portal.parentElement as HTMLElement | null);
        const rect = el?.getBoundingClientRect();
        return { viewW: Math.floor(rect?.width ?? 0), viewH: Math.floor(rect?.height ?? 0) };
    }

    // ------------------------------------------------------------
    // Helpers (steps)
    // ------------------------------------------------------------

    private _zoomOut01(scale: number) {
        const s = Math.max(scale, 1e-9);
        const z = Math.log10(1 / s);
        return Math.max(0, Math.min(1, z / 3));
    }

    private _lerp(a: number, b: number, t: number) {
        return a + (b - a) * t;
    }

    private _getStableScale(scale: number) {
        const s = Math.max(scale, 1e-9);
        const z = this._zoomOut01(s);

        const step = this._lerp(1 / 16, 1 / 4, z);
        const l = Math.log2(s);
        const q = Math.round(l / step) * step;
        return Math.pow(2, q);
    }

    private _buildNiceKs(): number[] {
        const nice = [1, 2, 5];
        const out: number[] = [];
        for (let p = 0; p <= 12; p++) {
            const pow = Math.pow(10, p);
            for (const n of nice) out.push(n * pow);
        }
        out.sort((a, b) => a - b);
        return out;
    }

    private _pickWithFadeFromBase(baseWorld: number, scaleForPicking: number, targetPx: number) {
        const desiredWorld = targetPx / Math.max(scaleForPicking, 1e-6);
        const desiredK = Math.max(1, desiredWorld / baseWorld);

        const ks = this._niceKs;

        if (this._minorKIndex === null) {
            let bIdx = 0;
            while (bIdx < ks.length && ks[bIdx] < desiredK) bIdx++;
            this._minorKIndex = Math.max(0, bIdx - 1);
        }

        const logK = Math.log10(desiredK);
        const zoomOut01 = Math.max(0, Math.min(1, (logK - 0.5) / 5.5));
        const H = 0.18 + (0.55 - 0.18) * zoomOut01;

        while (this._minorKIndex < ks.length - 1 && desiredK > ks[this._minorKIndex] * (1 + H)) {
            this._minorKIndex++;
        }
        while (this._minorKIndex > 0 && desiredK < ks[this._minorKIndex] * (1 - H)) {
            this._minorKIndex--;
        }

        const a = ks[this._minorKIndex];
        const b = ks[Math.min(this._minorKIndex + 1, ks.length - 1)];

        const stepA = baseWorld * a;
        const stepB = baseWorld * b;

        const band = 0.22 + (0.55 - 0.22) * this._zoomOut01(scaleForPicking);
        const lo = a * (1 - band);
        const hi = b * (1 + band);

        const ln = (x: number) => Math.log(Math.max(x, 1e-12));

        let t = 0;
        if (desiredK <= lo) t = 0;
        else if (desiredK >= hi) t = 1;
        else t = (ln(desiredK) - ln(lo)) / (ln(hi) - ln(lo));

        const mix = t * t * (3 - 2 * t);
        return { stepA, stepB, mix };
    }

    private _getRulerStepsFigma(scale: number) {
        const { minor } = this._world.gridView.getGridStepWorld();

        const z = this._zoomOut01(scale);
        const stableScale = this._getStableScale(scale);

        const tickPx = this._lerp(this._opts.minTickPx, 28, z);
        const labelPx = this._lerp(this._opts.minLabelPx, 160, z);

        const minorFade = this._pickWithFadeFromBase(minor, stableScale, tickPx);

        const majorA = minorFade.stepA * 5;
        const majorB = minorFade.stepB * 5;

        const stepPxA = minorFade.stepA * stableScale;
        const stepPxB = minorFade.stepB * stableScale;

        const labelA =
            stepPxA >= labelPx ? minorFade.stepA : this._snapUpToMultiple(labelPx / Math.max(stableScale, 1e-6), majorA);

        const labelB =
            stepPxB >= labelPx ? minorFade.stepB : this._snapUpToMultiple(labelPx / Math.max(stableScale, 1e-6), majorB);

        return {
            minor: { stepA: minorFade.stepA, stepB: minorFade.stepB, mix: minorFade.mix },
            major: { stepA: majorA, stepB: majorB, mix: minorFade.mix },
            label: { stepA: labelA, stepB: labelB, mix: minorFade.mix },
        };
    }

    private _snapUpToMultiple(value: number, multiple: number) {
        if (!isFinite(value) || !isFinite(multiple) || multiple <= 0) return value;
        const k = Math.max(1, Math.round(value / multiple));
        return multiple * k;
    }

    private _formatLabel(value: number): string {
        return String(Math.round(value));
    }

    // ------------------------------------------------------------
    // Guides
    // ------------------------------------------------------------

    private _ensureGuidesLayer() {
        if (this._guidesLayer) return;

        const stage = (this._world as any)?._stage as Konva.Stage | undefined;
        if (!stage) return;

        this._guidesLayer = new Konva.Layer({ listening: true });
        this._guidesLayer.name("flowscape-guides-layer");
        stage.add(this._guidesLayer);
        this._guidesLayer.moveToTop();
        this._guidesLayer.batchDraw();
    }

    private _clientToStageScreen(clientX: number, clientY: number) {
        const stage = (this._world as any)?._stage;
        const container: HTMLElement | null = typeof stage?.container === "function" ? stage.container() : null;
        const base = container ?? (this._portal.parentElement as HTMLElement | null);
        const r = base?.getBoundingClientRect();

        const sx = r ? (clientX - r.left) : clientX;
        const sy = r ? (clientY - r.top) : clientY;

        return { sx, sy };
    }

    private _screenToWorld(screenX: number, screenY: number) {
        const cam = this._world.camera.getState();
        const { viewW, viewH } = this._getViewportSizeSafe();

        const wx = cam.x + (screenX - viewW / 2) / cam.scale;
        const wy = cam.y + (screenY - viewH / 2) / cam.scale;

        return { x: wx, y: wy };
    }

    private _getVisibleWorldSpanWithMargin(marginPx = 200) {
        const cam = this._world.camera.getState();
        const { viewW, viewH } = this._getViewportSizeSafe();

        const halfW = (viewW / 2 + marginPx) / cam.scale;
        const halfH = (viewH / 2 + marginPx) / cam.scale;

        return {
            left: cam.x - halfW,
            right: cam.x + halfW,
            top: cam.y - halfH,
            bottom: cam.y + halfH,
        };
    }

    private _createGuide(axis: "x" | "y", screenValue: number) {
        this._ensureGuidesLayer();
        if (!this._guidesLayer) return null;

        const { viewW, viewH } = this._getViewportSizeSafe();

        const points =
            axis === "x"
                ? [screenValue, 0, screenValue, viewH]   // vertical
                : [0, screenValue, viewW, screenValue];  // horizontal

        const line = new Konva.Line({
            points,
            stroke: "rgba(0, 160, 255, 0.9)",
            strokeWidth: 1, // ← всегда 1px
            listening: true,
            perfectDrawEnabled: false,
            hitStrokeWidth: 8,
        });

        this._guidesLayer.add(line);
        this._guidesLayer.batchDraw();

        return line;
    }

    private _updateGuideLine(line: Konva.Line, axis: "x" | "y", screenValue: number) {
        const { viewW, viewH } = this._getViewportSizeSafe();

        if (axis === "x") {
            line.points([screenValue, 0, screenValue, viewH]);
        } else {
            line.points([0, screenValue, viewW, screenValue]);
        }

        this._guidesLayer?.batchDraw();
    }

    private _cancelActiveGuideDrag() {
        const g = this._activeGuide;
        if (!g) return;

        try { g.ownerEl.releasePointerCapture(g.pointerId); } catch { }

        window.removeEventListener("pointermove", this._onPointerMoveBound);
        window.removeEventListener("pointerup", this._onPointerUpBound);

        // cancel = destroy preview guide
        g.line.destroy();
        this._guidesLayer?.batchDraw();

        this._activeGuide = null;
    }

    private _startDragGuide(
        axis: "x" | "y",
        screenValue: number,
        pointerId: number,
        ownerEl: HTMLElement
    ) {
        if (this._activeGuide) this._cancelActiveGuideDrag();

        const line = this._createGuide(axis, screenValue);
        if (!line) return;

        this._activeGuide = { axis, line, pointerId, ownerEl };

        ownerEl.setPointerCapture(pointerId);

        window.addEventListener("pointermove", this._onPointerMoveBound, { passive: false });
        window.addEventListener("pointerup", this._onPointerUpBound, { passive: false });
    }

    private _onTopPointerDown = (e: PointerEvent) => {
        e.preventDefault();

        const { sx, sy } = this._clientToStageScreen(e.clientX, e.clientY);

        // top → horizontal line
        this._startDragGuide("y", sy, e.pointerId, this._topWrap);
    };

    private _onLeftPointerDown = (e: PointerEvent) => {
        e.preventDefault();

        const { sx } = this._clientToStageScreen(e.clientX, e.clientY);

        // left → vertical line
        this._startDragGuide("x", sx, e.pointerId, this._leftWrap);
    };

    private _syncGuides() {
        const cam = this._world.camera.getState();
        const { viewW, viewH } = this._getViewportSizeSafe();

        for (const g of this._guides) {

            if (g.axis === "x") {
                const screenX = (g.worldValue - cam.x) * cam.scale + viewW / 2;

                g.line.points([
                    screenX,
                    0,
                    screenX,
                    viewH
                ]);
            } else {
                const screenY = (g.worldValue - cam.y) * cam.scale + viewH / 2;

                g.line.points([
                    0,
                    screenY,
                    viewW,
                    screenY
                ]);
            }
        }

        this._guidesLayer?.batchDraw();
    }

    private _onPointerUp(e: PointerEvent) {
        const g = this._activeGuide;
        if (!g) return;
        if (e.pointerId !== g.pointerId) return;

        e.preventDefault();

        const { sx, sy } = this._clientToStageScreen(e.clientX, e.clientY);
        const world = this._screenToWorld(sx, sy);
        const finalValue = g.axis === "x" ? world.x : world.y;

        const committed = {
            axis: g.axis,
            worldValue: finalValue,
            line: g.line,
        };

        this._guides.push(committed);

        // 👇 ДОБАВИТЬ ВОТ ЭТО
        g.line.on("mousedown touchstart", (e) => {
            e.cancelBubble = true;

            const stage = g.line.getStage();
            if (!stage) return;

            stage.setPointersPositions(e.evt);

            this._startGuideReDrag(g.line, committed.axis);
        });

        g.line.on("mouseenter", () => {
    document.body.style.cursor = committed.axis === "x" ? "ew-resize" : "ns-resize";

    g.line.stroke("rgba(0,160,255,1)"); // ярче
    this._guidesLayer?.batchDraw();
});

g.line.on("mouseleave", () => {
    document.body.style.cursor = "default";

    g.line.stroke("rgba(0,160,255,0.9)"); // обратно
    this._guidesLayer?.batchDraw();
});

        const cancelZonePx = this._opts.thickness + 2;

        // ✅ правильная отмена:
        // horizontal guide (axis "y") пришёл с TOP => отмена если отпустил в верхней зоне
        // vertical guide (axis "x") пришёл с LEFT => отмена если отпустил в левой зоне
        const shouldCancel =
            (g.axis === "y" && sy <= cancelZonePx) ||
            (g.axis === "x" && sx <= cancelZonePx);

        if (shouldCancel) {
            g.line.destroy();
            this._guidesLayer?.batchDraw();
        }

        try { g.ownerEl.releasePointerCapture(g.pointerId); } catch { }

        window.removeEventListener("pointermove", this._onPointerMoveBound);
        window.removeEventListener("pointerup", this._onPointerUpBound);

        this._activeGuide = null;
    }

    private _startGuideReDrag(line: Konva.Line, axis: "x" | "y") {

        const onMove = (e: PointerEvent) => {
            const { sx, sy } = this._clientToStageScreen(e.clientX, e.clientY);
            const world = this._screenToWorld(sx, sy);

            const value = axis === "x" ? world.x : world.y;

            // обновляем сохранённый worldValue
            const guide = this._guides.find(g => g.line === line);
            if (guide) {
                guide.worldValue = value;
            }

            this._syncGuides();
        };

        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    }

    private _onPointerMove(e: PointerEvent) {
        const g = this._activeGuide;
        if (!g) return;
        if (e.pointerId !== g.pointerId) return;

        e.preventDefault();

        const { sx, sy } = this._clientToStageScreen(e.clientX, e.clientY);

        if (g.axis === "x") {
            this._updateGuideLine(g.line, "x", sx);
        } else {
            this._updateGuideLine(g.line, "y", sy);
        }
    }


    // ------------------------------------------------------------
    // Drawing (fade near corner)
    // ------------------------------------------------------------

    private _edgeFadeAlpha(distPx: number, fadeWidthPx: number) {
        if (fadeWidthPx <= 0) return 1;
        if (distPx >= fadeWidthPx) return 1;
        const t = Math.max(0, Math.min(1, distPx / fadeWidthPx));
        return t * t * (3 - 2 * t);
    }

    private _drawTop(
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        dpr: number,
        cam: { x: number; y: number; scale: number }
    ) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const steps = this._getRulerStepsFigma(cam.scale);

        const { viewW } = this._getViewportSizeSafe();
        const worldLeft = cam.x - (viewW / 2) / cam.scale;

        ctx.strokeStyle = this._opts.tickColor;
        ctx.fillStyle = this._opts.textColor;
        ctx.font = this._opts.font;
        ctx.textBaseline = "top";

        const t = this._opts.thickness;

        const minorLen = Math.max(3, Math.floor(h * 0.28));
        const majorLen = Math.max(6, Math.floor(h * 0.45));
        const labelY = 2;

        const fadeWidth = 40;

        const drawGrid = (stepWorld: number, majorWorld: number, alpha: number) => {
            if (alpha <= 0.001 || !isFinite(stepWorld) || stepWorld <= 0) return;

            const startIndex = Math.floor(worldLeft / stepWorld);
            const worldSpan = (w + t) / cam.scale;
            const count = Math.ceil(worldSpan / stepWorld) + 6;

            const eps = 1e-6;

            for (let i = -3; i <= count; i++) {
                const idx = startIndex + i;
                const xw = idx * stepWorld;

                const screenX = (xw - worldLeft) * cam.scale;
                const sx = screenX - t;
                if (sx < -80 || sx > w + 80) continue;

                const edgeA = this._edgeFadeAlpha(sx, fadeWidth);
                if (edgeA <= 0.01) continue;

                const isMajor = Math.abs(xw / majorWorld - Math.round(xw / majorWorld)) < eps;
                const len = isMajor ? majorLen : minorLen;

                const px = Math.round(sx) + 0.5;

                ctx.save();
                ctx.globalAlpha = alpha * edgeA;

                ctx.beginPath();
                ctx.moveTo(px, h);
                ctx.lineTo(px, h - len);
                ctx.stroke();

                ctx.restore();
            }
        };

        const drawLabels = (stepWorld: number, labelWorld: number) => {
            if (!isFinite(stepWorld) || stepWorld <= 0) return;

            const startIndex = Math.floor(worldLeft / stepWorld);
            const worldSpan = (w + t) / cam.scale;
            const count = Math.ceil(worldSpan / stepWorld) + 6;

            const eps = 1e-6;

            for (let i = -3; i <= count; i++) {
                const idx = startIndex + i;
                const xw = idx * stepWorld;

                const screenX = (xw - worldLeft) * cam.scale;
                const sx = screenX - t;
                if (sx < -80 || sx > w + 80) continue;

                const isLabel = Math.abs(xw / labelWorld - Math.round(xw / labelWorld)) < eps;
                if (!isLabel) continue;

                const edgeA = this._edgeFadeAlpha(sx, fadeWidth);
                if (edgeA <= 0.01) continue;

                const text = this._formatLabel(xw);
                const tw = ctx.measureText(text).width;

                ctx.save();
                ctx.globalAlpha = edgeA;
                ctx.fillText(text, sx - tw / 2, labelY);
                ctx.restore();
            }
        };

        const aAlpha = 1 - steps.minor.mix;
        const bAlpha = steps.minor.mix;

        const labelOnlyA = steps.label.stepA / steps.minor.stepA >= 5;
        const labelOnlyB = steps.label.stepB / steps.minor.stepB >= 5;

        if (labelOnlyA) drawGrid(steps.label.stepA, steps.label.stepA, aAlpha);
        else drawGrid(steps.minor.stepA, steps.major.stepA, aAlpha);

        if (labelOnlyB) drawGrid(steps.label.stepB, steps.label.stepB, bAlpha);
        else drawGrid(steps.minor.stepB, steps.major.stepB, bAlpha);

        const useB = steps.minor.mix >= 0.5;
        const labelStep = useB ? steps.label.stepB : steps.label.stepA;
        const minorStep = useB ? steps.minor.stepB : steps.minor.stepA;

        if (labelStep / minorStep >= 5) drawLabels(labelStep, labelStep);
        else drawLabels(minorStep, labelStep);

        ctx.restore();
    }

    private _drawLeft(
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        dpr: number,
        cam: { x: number; y: number; scale: number }
    ) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const steps = this._getRulerStepsFigma(cam.scale);

        const { viewH } = this._getViewportSizeSafe();
        const worldTop = cam.y - (viewH / 2) / cam.scale;

        ctx.strokeStyle = this._opts.tickColor;
        ctx.fillStyle = this._opts.textColor;
        ctx.font = this._opts.font;
        ctx.textBaseline = "middle";

        const t = this._opts.thickness;

        const minorLen = Math.max(3, Math.floor(w * 0.28));
        const majorLen = Math.max(6, Math.floor(w * 0.45));
        const labelPad = 8;

        const fadeWidth = 40;

        const drawGrid = (stepWorld: number, majorWorld: number, alpha: number) => {
            if (alpha <= 0.001 || !isFinite(stepWorld) || stepWorld <= 0) return;

            const startIndex = Math.floor(worldTop / stepWorld);
            const worldSpan = (h + t) / cam.scale;
            const count = Math.ceil(worldSpan / stepWorld) + 6;

            const eps = 1e-6;

            for (let i = -3; i <= count; i++) {
                const idx = startIndex + i;
                const yw = idx * stepWorld;

                const screenY = (yw - worldTop) * cam.scale;
                const sy = screenY - t;
                if (sy < -80 || sy > h + 80) continue;

                const edgeA = this._edgeFadeAlpha(sy, fadeWidth);
                if (edgeA <= 0.01) continue;

                const isMajor = Math.abs(yw / majorWorld - Math.round(yw / majorWorld)) < eps;
                const len = isMajor ? majorLen : minorLen;

                const py = Math.round(sy) + 0.5;

                ctx.save();
                ctx.globalAlpha = alpha * edgeA;

                ctx.beginPath();
                ctx.moveTo(w, py);
                ctx.lineTo(w - len, py);
                ctx.stroke();

                ctx.restore();
            }
        };

        const drawLabels = (stepWorld: number, labelWorld: number) => {
            if (!isFinite(stepWorld) || stepWorld <= 0) return;

            const startIndex = Math.floor(worldTop / stepWorld);
            const worldSpan = (h + t) / cam.scale;
            const count = Math.ceil(worldSpan / stepWorld) + 6;

            const eps = 1e-6;

            for (let i = -3; i <= count; i++) {
                const idx = startIndex + i;
                const yw = idx * stepWorld;

                const screenY = (yw - worldTop) * cam.scale;
                const sy = screenY - t;
                if (sy < -80 || sy > h + 80) continue;

                const isLabel = Math.abs(yw / labelWorld - Math.round(yw / labelWorld)) < eps;
                if (!isLabel) continue;

                const py = Math.round(sy) + 0.5;

                const edgeA = this._edgeFadeAlpha(py, fadeWidth);
                if (edgeA <= 0.01) continue;

                const text = this._formatLabel(yw);

                ctx.save();
                ctx.globalAlpha = edgeA;
                ctx.translate(labelPad, py);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(text, 0, 0);
                ctx.restore();
            }
        };

        const aAlpha = 1 - steps.minor.mix;
        const bAlpha = steps.minor.mix;

        const labelOnlyA = steps.label.stepA / steps.minor.stepA >= 5;
        const labelOnlyB = steps.label.stepB / steps.minor.stepB >= 5;

        if (labelOnlyA) drawGrid(steps.label.stepA, steps.label.stepA, aAlpha);
        else drawGrid(steps.minor.stepA, steps.major.stepA, aAlpha);

        if (labelOnlyB) drawGrid(steps.label.stepB, steps.label.stepB, bAlpha);
        else drawGrid(steps.minor.stepB, steps.major.stepB, bAlpha);

        const useB = steps.minor.mix >= 0.5;
        const labelStep = useB ? steps.label.stepB : steps.label.stepA;
        const minorStep = useB ? steps.minor.stepB : steps.minor.stepA;

        if (labelStep / minorStep >= 5) drawLabels(labelStep, labelStep);
        else drawLabels(minorStep, labelStep);

        ctx.restore();
    }

    private _resizeCanvas(canvas: HTMLCanvasElement, cssW: number, cssH: number, dpr: number) {
        const w = Math.max(1, Math.floor(cssW));
        const h = Math.max(1, Math.floor(cssH));
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
    }
}