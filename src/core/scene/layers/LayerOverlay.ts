import Konva from "konva";
import type { LayerWorld } from "./LayerWorld";
import { type IOverlayModule, type OverlayContext, type OverlayOptions, type WorldCorners } from "./overlay";
import { HandleManager } from "./overlay/modules/HandleManager";
import { OffsetAnchor } from "./overlay/modules/HandleView";
import { DragSession } from "./overlay/modules/handles/DragSession";
import {
    HandleRotate,
    HandleResize,
    HandleSelectionBorder,
    HandleTransform,
    HandleBorderRadius,
    HandlePivot,
    HandleResizeBorderSide
} from "./overlay/modules/handles";

export const DEFAULT_OVERLAY_OPTIONS: Required<OverlayOptions> = {
    listening: true,

    handleSize: 8,          // 8px - золотая середина
    borderWidth: 1,         // тонкая, аккуратная линия

    showHandles: true,
    showBorder: true,

    showRotateHandle: true,
    rotateHandleSize: 20,   // чуть больше обычных хендлеров
    rotateHandleOffset: 10, // не слишком далеко
};

export class LayerOverlay {
    private readonly _stage: Konva.Stage;
    private readonly _world: LayerWorld;

    private readonly _layer: Konva.Layer;
    private readonly _root: Konva.Group;

    private _width: number;
    private _height: number;

    private _rafPending = false;

    private _unsubscribeCamera: (() => void) | null = null;

    private _selectionCornersWorld: WorldCorners | null = null;

    // options as normalized
    private _opts: Required<OverlayOptions>;

    // modules
    private readonly _modules: IOverlayModule[] = [];
    

    private readonly _drag: DragSession;


    public readonly handleSelectBoxManager: HandleManager;
    public readonly handleBorderTransformManager: HandleManager;
    public readonly handleTransformManager: HandleManager;
    public readonly handleRotationManager: HandleManager;
    public readonly handleBorderRadiusManager: HandleManager;
    public readonly handlePivotManager: HandleManager;

    constructor(stage: Konva.Stage, world: LayerWorld, width: number, height: number, opts: OverlayOptions = {}) {
        this._stage = stage;
        this._world = world;
        this._width = width;
        this._height = height;

        this._opts = { ...DEFAULT_OVERLAY_OPTIONS, ...opts };
        this._root = new Konva.Group({ listening: this._opts.listening });

        // Handle Managers
        this.handleSelectBoxManager = new HandleManager();
        this.handleBorderTransformManager = new HandleManager();
        this.handleTransformManager = new HandleManager();
        this.handleRotationManager = new HandleManager();
        this.handleBorderRadiusManager = new HandleManager();
        this.handlePivotManager = new HandleManager();


        // ========== Selection box ==========
        this._layer = new Konva.Layer({
            listening: this._opts.listening,
            perfectDrawEnabled: false,
        });

        this._layer.add(this._root);
        this._stage.add(this._layer);

        this._drag = new DragSession(this._stage);

        // camera subscription - just schedule draw
        this._unsubscribeCamera = this._world.onCameraChange(() => this.requestDraw());


        this._initHandles();
        this.requestDraw();
    }

    public destroy() {
        this._drag.destroy();
        this._unsubscribeCamera?.();
        this._unsubscribeCamera = null;

        for (const m of this._modules) m.destroy();
        this._layer.destroy();
    }

    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
        this.requestDraw();
    }

    public requestDraw() {
        if (this._rafPending) return;
        this._rafPending = true;

        requestAnimationFrame(() => {
            this._rafPending = false;

            const ctx: OverlayContext = {
                stage: this._stage,
                world: this._world,
                width: this._width,
                height: this._height,
                selectionCornersWorld: this._selectionCornersWorld,
                drag: this._drag,
            };

            for (const m of this._modules) m.setContext(ctx);
            for (const m of this._modules) m.draw();

            this._layer.batchDraw();
        });
    }

    public getLayer(): Konva.Layer {
        return this._layer;
    }

    // --- selection api ---
    public setSelectionCornersWorld(corners: WorldCorners | null) {
        this._selectionCornersWorld = corners;
        this.requestDraw();
    }

    public clearSelection() {
        this._selectionCornersWorld = null;
        this.requestDraw();
    }

    // --- internal ---
    private _addModule(m: IOverlayModule) {
        this._modules.push(m);
        this._root.add(m.getRoot());
    }

    private _initHandles() {
        this._initHandleSelectionBox();
        this._initHandleTransform();
        this._initHandleRotation();
        this._initHandleResize();
        this._initHandleBorderRadius();
        this._initHandlePivot();
    }

    private _initHandleBorderRadius() {
        const borderRadiusTL = new HandleBorderRadius("border-radius-top-left-0", {
            position: OffsetAnchor.TopLeft,
            offset: {x: 10, y: 10},
        });
        const borderRadiusTR = new HandleBorderRadius("border-radius-top-right-0", {
            position: OffsetAnchor.TopRight,
            offset: {x: -10, y: 10},
        });
        const borderRadiusBL = new HandleBorderRadius("border-radius-bottom-left-0", {
            position: OffsetAnchor.BottomLeft,
            offset: {x: 10, y: -10},
        });
        const borderRadiusBR = new HandleBorderRadius("border-radius-bottom-right-0", {
            position: OffsetAnchor.BottomRight,
            offset: {x: -10, y: -10},
        });

        this.handleBorderRadiusManager.add([
            borderRadiusTL,
            borderRadiusTR,
            borderRadiusBL,
            borderRadiusBR,
        ]);
        this._addModule(this.handleBorderRadiusManager);
    }

    private _initHandleResize() {
        const resizeTL = new HandleResize("resize-top-left-0", {
            position: OffsetAnchor.TopLeft,
            style: {
                cursor: "nw-resize",
            },
        });
        const resizeTR = new HandleResize("resize-top-right-0", {
            position: OffsetAnchor.TopRight,
            style: {
                cursor: "ne-resize",
            },
        });
        const resizeBL = new HandleResize("resize-bottom-left-0", {
            position: OffsetAnchor.BottomLeft,
            style: {
                cursor: "ne-resize"
            }
        });
        const resizeBR = new HandleResize("resize-bottom-right-0", {
            position: OffsetAnchor.BottomRight,
            style: {
                cursor: "nw-resize"
            }
        });

        const resizeBorderSideT = new HandleResizeBorderSide("resize-border-side-top-0", {
            position: OffsetAnchor.Top,
            style: {
                cursor: "n-resize",
            }
        });
        const resizeBorderSideL = new HandleResizeBorderSide("resize-border-side-left-0", {
            position: OffsetAnchor.Left,
            style: {
                cursor: "e-resize",
            }
        });
        const resizeBorderSideB = new HandleResizeBorderSide("resize-border-side-bottom-0", {
            position: OffsetAnchor.Bottom,
            style: {
                cursor: "n-resize",
            }
        });
        const resizeBorderSideR = new HandleResizeBorderSide("resize-border-side-right-0", {
            position: OffsetAnchor.Right,
            style: {
                cursor: "e-resize",
            }
        });

        this.handleBorderTransformManager.add([
            resizeBorderSideT,
            resizeBorderSideL,
            resizeBorderSideB,
            resizeBorderSideR,
            resizeTL,
            resizeTR,
            resizeBL,
            resizeBR,
        ]);
        this._addModule(this.handleBorderTransformManager);
    }

    private _initHandleRotation() {
        const rotateTL = new HandleRotate("rotate-top-left-0", {
            position: OffsetAnchor.TopLeft,
            offset: {x: -6, y: -6 },
        });
        const rotateTR = new HandleRotate("rotate-top-right-0", {
            position: OffsetAnchor.TopRight,
            offset: {x: 6, y: -6 },
        });
        const rotateBL = new HandleRotate("rotate-bottom-left-0", {
            position: OffsetAnchor.BottomLeft,
            offset: {x: -6, y: 6 },
        });
        const rotateBR = new HandleRotate("rotate-bottom-right-0", {
            position: OffsetAnchor.BottomRight,
            offset: {x: 6, y: 6 },
        });

        this.handleRotationManager.add([rotateTL, rotateTR, rotateBR, rotateBL]);
        this._addModule(this.handleRotationManager);
    }

    private _initHandleSelectionBox() {
        const selectionBox = new HandleSelectionBorder("selection-box-0", {
            style: {
                borderWidth: 1,
            }
        });
        this.handleTransformManager.add([selectionBox]);
        this._addModule(this.handleSelectBoxManager);
    }

    private _initHandleTransform() {
        const transformBox = new HandleTransform("box-transform-0");
        this.handleTransformManager.add([transformBox]);
        this._addModule(this.handleTransformManager);
    }

    private _initHandlePivot() {
        const pivot = new HandlePivot("pivot-0", {
            style: {
                cursor: "pointer"
            }
        });
        this.handleTransformManager.add([pivot]);
        this._addModule(this.handleTransformManager);
    }
}