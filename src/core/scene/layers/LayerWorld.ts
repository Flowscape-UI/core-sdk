import Konva from "konva";
import { Camera, type CameraState, type Point } from "../../camera";
import { GridRenderer, type WorldGridOptions } from "../../grid/GridRenderer";
import { KonvaGridView } from "../../grid";
import { Layer } from "./Layer";
import { RenderOrder, type IInvalidatable } from "../../interfaces";

export type Rect = { x: number; y: number; width: number; height: number };

type BuildTuple<
    T,
    N extends number,
    R extends unknown[] = []
> = R['length'] extends N
    ? R
    : BuildTuple<T, N, [...R, T]>;

type FixedArray<T, N extends number> = BuildTuple<T, N>;

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
        maxLines: 1000,
        minorAlpha: 0.2,
        majorAlpha: 0.2,
    },
};

export class LayerWorld extends Layer {
    private readonly _worldRoot: Konva.Group;
    private readonly _contentRoot: Konva.Group;

    public readonly camera = new Camera();

    // Core + View adapter
    private readonly _gridRenderer = new GridRenderer();
    public readonly gridView: KonvaGridView;

    private _eventCameraSubscription: (() => void) | null = null;


    constructor(
        width: number,
        height: number,
        stage: Konva.Stage,
        invalidator: IInvalidatable,
        options: Partial<WorldOptions> = DEFAULT_OPTIONS
    ) {
        const mergedOptions = {
            ...DEFAULT_OPTIONS,
            ...options,
        }
        super(
            width,
            height,
            RenderOrder.World,
            stage,
            invalidator,
            {
                listening: mergedOptions.listening,
                perfectDrawEnabled: false,
            }
        );

        this._worldRoot = new Konva.Group();
        this._contentRoot = new Konva.Group();

        this.camera.setLimits(mergedOptions.minScale, mergedOptions.maxScale);
        this.camera.setViewportSize(width, height);

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
        this._bindCamera();
    }

    /****************************************************************/
    /*                            EVENTS                            */
    /****************************************************************/
    public onCameraChange(cb: any): () => void {
        return this.camera.onChange(cb);
    }


    public render() {}

    /****************************************************************/
    /*                           LIFECICLE                          */
    /****************************************************************/
    public override destroy() {
        this._unbindCameraListener();
        this.gridView.destroy();
        super.destroy();
    }

    public override setSize(width: number, height: number) {
        super.setSize(width, height);
        this.camera.setViewportSize(width, height);
        this._applyCamera(this.camera.getState()); // важно: pivot центр зависит от viewport
        this.requestDraw();
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
    public getViewportWorldCorners(): FixedArray<Point, 4> {
        const { width, height } = this.getSize();
        const tl = this.camera.screenToWorld({ x: 0, y: 0 });
        const tr = this.camera.screenToWorld({ x: width, y: 0 });
        const br = this.camera.screenToWorld({ x: width, y: height });
        const bl = this.camera.screenToWorld({ x: 0, y: height });
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
    private _applyCamera(state: CameraState): void {
        const { width, height } = this.getSize();
        const { x, y, scale, rotation } = state;

        const cx = width / 2;
        const cy = height / 2;

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