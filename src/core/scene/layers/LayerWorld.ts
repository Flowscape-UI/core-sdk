import Konva from "konva";
import { Camera, type CameraState, type Point } from "../../camera";
import { GridRenderer, type WorldGridOptions } from "../../grid/GridRenderer";
import { KonvaGridView } from "../../grid";

export type Rect = { x: number; y: number; width: number; height: number };

type WorldOptions = {
    x: number,
    y: number,
    minScale: number,
    maxScale: number,
    listening: boolean,
    grid: Partial<WorldGridOptions>,
}

const DEFAULT_OPTIONS: WorldOptions = {
    x: 0,
    y: 0,
    minScale: 0.001,
    maxScale: 500,
    listening: true,
    grid: {
        enabled: true,
        size: 1,
        majorEvery: 10,
        maxLines: 5000,
        minorAlpha: 0.2,
        majorAlpha: 0.2,
    },
};

export class LayerWorld {
    private readonly _stage: Konva.Stage;

    private readonly _layer: Konva.Layer;
    private readonly _worldRoot: Konva.Group;
    private readonly _contentRoot: Konva.Group;

    public readonly camera = new Camera();
    
    // Core + View adapter
    private readonly _gridRenderer = new GridRenderer();
    public readonly gridView: KonvaGridView;

    private _width: number;
    private _height: number;

    private _rafPending = false;

    private _eventCameraSubscription: (() => void) | null = null;


    constructor(
        stage: Konva.Stage,
        width: number,
        height: number,
        options: Partial<WorldOptions> = DEFAULT_OPTIONS
    ) {
        const mergedOptions = {
            ...DEFAULT_OPTIONS,
            ...options,
        }

        this._stage = stage;
        this._width = width;
        this._height = height;
        this._worldRoot = new Konva.Group();
        this._contentRoot = new Konva.Group();

        this._layer = new Konva.Layer({
            listening: mergedOptions.listening,
            perfectDrawEnabled: false,
        });


        this.camera.setLimits(mergedOptions.minScale, mergedOptions.maxScale);
        this.camera.setViewportSize(this._width, this._height);

        this._gridRenderer.setOptions(mergedOptions.grid);
        this.gridView = new KonvaGridView({
            renderer: this._gridRenderer,
            getDrawInput: () => ({
                camera: this.camera.getState(),
                viewportAabbWorld: this.getViewportWorldAABB(),
            }),
        });

        this._worldRoot.add(this._contentRoot);
        this._worldRoot.add(this.gridView.getRoot());
        this._layer.add(this._worldRoot);
        this._stage.add(this._layer);

        this._bindCamera();
    }
    
    /****************************************************************/
    /*                            EVENTS                            */
    /****************************************************************/
    public onCameraChange(cb: any): () => void {
        return this.camera.onChange(cb);
    }


    /****************************************************************/
    /*                           LIFECICLE                          */
    /****************************************************************/
    public destroy() {
        this._unbindCameraListener();
        this.gridView.destroy();
        this._layer.destroy();
    }

    public setSize(width: number, height: number) {
        this._width = width;
        this._height = height;
        this.camera.setViewportSize(width, height);
        this._applyCamera(this.camera.getState()); // важно: pivot центр зависит от viewport
        this.requestDraw();
    }

    public requestDraw() {
        if (this._rafPending) return;
        this._rafPending = true;

        requestAnimationFrame(() => {
            this._rafPending = false;
            this._layer.batchDraw();
        });
    }


    /****************************************************************/
    /*                           LIFECICLE                          */
    /****************************************************************/
    public add(node: Konva.Group | Konva.Shape) {
        this._contentRoot.add(node);
        this.requestDraw();
    }

    public remove(node: Konva.Node) {
        node.remove();
        this.requestDraw();
    }

    public clear() {
        this._contentRoot.destroyChildren();
        this.requestDraw();
    }

    public getLayer(): Konva.Layer {
        return this._layer;
    }

    public getWorldRoot(): Konva.Group {
        return this._worldRoot;
    }

    public getContentRoot(): Konva.Group {
        return this._contentRoot;
    }


    /****************************************************************/
    /*                           VIEWPORT                           */
    /****************************************************************/
    // С rotation "Rect" в мире не существует (это всегда 4 угла).
    // Дадим полезный метод: viewport corners in WORLD.
    public getViewportWorldCorners(): [Point, Point, Point, Point] {
        const tl = this.camera.screenToWorld({ x: 0, y: 0 });
        const tr = this.camera.screenToWorld({ x: this._width, y: 0 });
        const br = this.camera.screenToWorld({ x: this._width, y: this._height });
        const bl = this.camera.screenToWorld({ x: 0, y: this._height });
        return [tl, tr, br, bl];
    }

    // Если тебе всё равно нужен AABB в мире (например для простого grid/виртуализации):
    public getViewportWorldAABB(): Rect {
        const [tl, tr, br, bl] = this.getViewportWorldCorners();
        const xs = [tl.x, tr.x, br.x, bl.x];
        const ys = [tl.y, tr.y, br.y, bl.y];

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }


    /****************************************************************/
    /*                            PRIVATE                           */
    /****************************************************************/
    private _applyCamera(state: CameraState) {
        const { x, y, scale, rotation } = state;

        const cx = this._width / 2;
        const cy = this._height / 2;

        // screen pivot
        this._worldRoot.position({ x: cx, y: cy });

        // world pivot
        this._worldRoot.offset({ x, y });

        this._worldRoot.scale({ x: scale, y: scale });
        this._worldRoot.rotation((-rotation * 180) / Math.PI); // Konva degrees
    }

    private _bindCamera(): void {
        this._eventCameraSubscription = this.camera.onChange((state) => {
            this._applyCamera(state);
            this.requestDraw();
        });
    }

    private _unbindCameraListener(): void {
        this._eventCameraSubscription?.();
        this._eventCameraSubscription = null;
    }
}