import Konva from "konva";
import type { LayerWorld } from "../../../../../core/scene/layers/world/LayerWorld";
import type { IRendererLayerWorld } from "./types";
import { RendererCanvasEllipse, RendererCanvasImage, RendererCanvasLine, RendererCanvasManager, RendererCanvasPath, RendererCanvasPolygon, RendererCanvasRect, RendererCanvasRegistry, RendererCanvasStar, RendererCanvasText, RendererCanvasVideo } from "../../../nodes";
import { NodeType } from "../../../../../nodes";
import { GridRenderer, KonvaGridView } from "../../../../../core/grid";
import type { CameraState } from "../../../../../core/camera";

export class RendererLayerWorldCanvas implements IRendererLayerWorld {
    private readonly _layer: Konva.Layer;
    private readonly _content: Konva.Group;
    private readonly _gridContent: Konva.Group;

    private readonly _registry: RendererCanvasRegistry;
    private readonly _manager: RendererCanvasManager;

    private _world: LayerWorld | null = null;

    // Grid
    private readonly _gridView: KonvaGridView;

    constructor() {
        this._layer = new Konva.Layer({
            listening: false,
        });

        this._content = new Konva.Group({
            listening: false,
        });

        this._gridContent = new Konva.Group({
            listening: false,
        });

        this._registry = new RendererCanvasRegistry();
        this._manager = new RendererCanvasManager(this._registry, this._content);

        const gridRenderer = new GridRenderer();
        this._gridView = new KonvaGridView({
            renderer: gridRenderer,
            getDrawInput: () => {
                if (!this._world) {
                    return {
                        camera: { x: 0, y: 0, scale: 1, rotation: 0 },
                        viewportAabbWorld: { x: 0, y: 0, width: 0, height: 0 },
                    };
                }

                return {
                    camera: this._world.getCamera().getState(),
                    viewportAabbWorld: this._world.getViewportWorldAABB(),
                };
            },
        });

        this._gridContent.add(this._content);
        this._gridContent.add(this._gridView.getRoot());
        this._layer.add(this._gridContent);
        this._registerDefaultRenderers();
    }

    public getLayer(): Konva.Layer {
        return this._layer;
    }

    public attach(world: LayerWorld): void {
        this._world = world;

        this._gridView.setOptions({
            enabled: true,
            size: 1,
            majorEvery: 10,
            maxLines: 1000,
            minorAlpha: 0.2,
            majorAlpha: 0.2,
        });
    }

    public detach(): void {
        this._world = null;
        this._manager.clear();
        this._content.destroyChildren();

        this._gridContent.setAttrs({
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
        });
    }

    public update(): void {
        if (!this._world) {
            return;
        }

        this._applyCamera(this._world.getCamera().getState());
        this._manager.renderNodes(this._world.getNodes());
    }

    public render(): void {
        this._layer.draw();
    }

    public destroy(): void {
        this.detach();
        this._gridView.destroy();
        this._layer.destroy();
    }


    private _registerDefaultRenderers(): void {
        this._registry.register(NodeType.Rect, new RendererCanvasRect());
        this._registry.register(NodeType.Ellipse, new RendererCanvasEllipse());
        this._registry.register(NodeType.Polygon, new RendererCanvasPolygon());
        this._registry.register(NodeType.Star, new RendererCanvasStar());
        this._registry.register(NodeType.Line, new RendererCanvasLine());
        this._registry.register(NodeType.Text, new RendererCanvasText());
        this._registry.register(NodeType.Image, new RendererCanvasImage());
        this._registry.register(NodeType.Video, new RendererCanvasVideo());
        this._registry.register(NodeType.Path, new RendererCanvasPath());
    }

    private _applyCamera(state: CameraState): void {
        if (!this._world) {
            return;
        }

        const { width, height } = this._world.getSize();
        const { x, y, scale, rotation } = state;

        const cx = width / 2;
        const cy = height / 2;

        this._gridContent.position({ x: cx, y: cy });
        this._gridContent.offset({ x, y });
        this._gridContent.scale({ x: scale, y: scale });
        this._gridContent.rotation((-rotation * 180) / Math.PI);
    }
}