import Konva from "konva";

import { Camera, type CameraState, type Point } from "../../camera";
import { GridRenderer, type WorldGridOptions } from "../../grid/GridRenderer";
import { KonvaGridView } from "../../grid";
import { Layer } from "./Layer";

import { RenderOrder, type IInvalidatable } from "../../interfaces";
import {
    RendererCanvasRegistry,
    RendererCanvasManager,
    RendererCanvasRect,
    RendererCanvasEllipse,
    RendererCanvasPolygon,
    RendererCanvasStar,
    RendererCanvasLine,
    RendererCanvasText,
    RendererCanvasImage,
    RendererCanvasVideo,
    RendererCanvasPath
} from "../../../renderer";
import { NodeType, type INode } from "../../../nodes";


export type Rect = { x: number; y: number; width: number; height: number };

type BuildTuple<
    T,
    N extends number,
    R extends unknown[] = []
> = R["length"] extends N
    ? R
    : BuildTuple<T, N, [...R, T]>;

type FixedArray<T, N extends number> = BuildTuple<T, N>;

type WorldOptions = {
    x: number;
    y: number;
    minScale: number;
    maxScale: number;
    listening: boolean;
    grid: Partial<WorldGridOptions>;
};

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

    private readonly _rendererRegistry: RendererCanvasRegistry;
    private readonly _rendererManager: RendererCanvasManager;

    private readonly _rootNodes: INode[] = [];

    public readonly camera = new Camera();

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
        const mergedOptions: WorldOptions = {
            ...DEFAULT_OPTIONS,
            ...options,
            grid: {
                ...DEFAULT_OPTIONS.grid,
                ...options.grid,
            },
        };

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

        this._rendererRegistry = new RendererCanvasRegistry();
        this._rendererManager = new RendererCanvasManager(
            this._rendererRegistry,
            this._contentRoot
        );

        this._registerDefaultRenderers();

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
        this._applyCamera(this.camera.getState());
    }

    /****************************************************************/
    /*                            EVENTS                            */
    /****************************************************************/

    public onCameraChange(cb: (state: CameraState) => void): () => void {
        return this.camera.onChange(cb);
    }

    /****************************************************************/
    /*                            NODES                             */
    /****************************************************************/

    /**
     * Replaces the current root node list.
     *
     * Заменяет текущий список корневых нод.
     */
    public setNodes(nodes: readonly INode[]): void {
        this._rootNodes.length = 0;
        this._rootNodes.push(...nodes);
        this.requestDraw();
    }

    /**
     * Adds a root node to the world.
     *
     * Добавляет корневую ноду в мир.
     */
    public addNode(node: INode): void {
        this._rootNodes.push(node);
        this.requestDraw();
    }

    /**
     * Removes a root node from the world.
     *
     * Удаляет корневую ноду из мира.
     */
    public removeNode(node: INode): void {
        const index = this._rootNodes.findIndex((item) => item.id === node.id);

        if (index === -1) {
            return;
        }

        this._rootNodes.splice(index, 1);
        this._rendererManager.removeNode(node);
        this.requestDraw();
    }

    /**
     * Removes all root nodes from the world.
     *
     * Удаляет все корневые ноды из мира.
     */
    public clearNodes(): void {
        this._rootNodes.length = 0;
        this._rendererManager.clear();
        this.requestDraw();
    }

    /**
     * Synchronizes scene nodes with Konva views.
     *
     * Синхронизирует ноды сцены с Konva-представлениями.
     */
    public render(): void {
        this._rendererManager.renderNodes(this._rootNodes);
        this.requestDraw();
    }

    /****************************************************************/
    /*                           LIFECYCLE                          */
    /****************************************************************/

    public override destroy(): void {
        this._unbindCameraListener();
        this._rendererManager.clear();
        this.gridView.destroy();
        super.destroy();
    }

    public override setSize(width: number, height: number): void {
        super.setSize(width, height);
        this.camera.setViewportSize(width, height);
        this._applyCamera(this.camera.getState());
        this.requestDraw();
    }

    public getLayer(): Konva.Layer {
        return this._layer;
    }

    public getWorldRoot(): Konva.Group {
        return this._worldRoot;
    }

    /****************************************************************/
    /*                           VIEWPORT                           */
    /****************************************************************/

    public getViewportWorldCorners(): FixedArray<Point, 4> {
        const { width, height } = this.getSize();

        const tl = this.camera.screenToWorld({ x: 0, y: 0 });
        const tr = this.camera.screenToWorld({ x: width, y: 0 });
        const br = this.camera.screenToWorld({ x: width, y: height });
        const bl = this.camera.screenToWorld({ x: 0, y: height });

        return [tl, tr, br, bl];
    }

    public getViewportWorldAABB(): Rect {
        const [tl, tr, br, bl] = this.getViewportWorldCorners();

        const xs = [tl.x, tr.x, br.x, bl.x];
        const ys = [tl.y, tr.y, br.y, bl.y];

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }

    /****************************************************************/
    /*                            PRIVATE                           */
    /****************************************************************/

    private _registerDefaultRenderers(): void {
        this._rendererRegistry.register(NodeType.Rect, new RendererCanvasRect());
        this._rendererRegistry.register(NodeType.Ellipse, new RendererCanvasEllipse());
        this._rendererRegistry.register(NodeType.Polygon, new RendererCanvasPolygon());
        this._rendererRegistry.register(NodeType.Star, new RendererCanvasStar());
        this._rendererRegistry.register(NodeType.Line, new RendererCanvasLine());
        this._rendererRegistry.register(NodeType.Text, new RendererCanvasText());
        this._rendererRegistry.register(NodeType.Image, new RendererCanvasImage());
        this._rendererRegistry.register(NodeType.Video, new RendererCanvasVideo());
        this._rendererRegistry.register(NodeType.Path, new RendererCanvasPath());
    }

    private _applyCamera(state: CameraState): void {
        const { width, height } = this.getSize();
        const { x, y, scale, rotation } = state;

        const cx = width / 2;
        const cy = height / 2;

        this._worldRoot.position({ x: cx, y: cy });
        this._worldRoot.offset({ x, y });
        this._worldRoot.scale({ x: scale, y: scale });
        this._worldRoot.rotation((-rotation * 180) / Math.PI);
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