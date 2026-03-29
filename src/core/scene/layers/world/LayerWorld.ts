import type { ID, IShapeBase, Rect } from "../../../../nodes";
import { Camera, type ICamera, type Point } from "../../../camera";
import { MathF32 } from "../../../math";
import { LayerBase, LayerType } from "../base";
import type { FixedArray, ILayerWorld } from "./types";

export class LayerWorld extends LayerBase implements ILayerWorld {
    public static readonly DEFAULT_CAMERA_ZOOM_MIN: number = 0.001;
    public static readonly DEFAULT_CAMERA_ZOOM_MAX: number = 500;
    private readonly _camera = new Camera();
    private readonly _nodes: IShapeBase[];
    
    constructor(width: number, height: number) {
        super(width, height, LayerType.World);
        this._nodes = [];
        this._camera.setLimits(
            LayerWorld.DEFAULT_CAMERA_ZOOM_MIN,
            LayerWorld.DEFAULT_CAMERA_ZOOM_MAX
        );
    }

    /****************************************************************/
    /*                            NODES                             */
    /****************************************************************/

    public findNodeById(id: ID): IShapeBase {
        const node = this._nodes.find((item) => item.id === id);
        if (!node) {
            throw new Error(`Node with id "${String(id)}" was not found.`);
        }
        return node;
    }

    public findNodeByName(name: string): IShapeBase[] {
        return this._nodes.filter((item) => item.getName() === name);
    }

    public getNodes(): IShapeBase[] {
        return [...this._nodes];
    }

    public setNodes(nodes: IShapeBase[]): void {
        this.deleteNodes();
        this._nodes.push(...nodes);
    }

    public addNode(node: IShapeBase): boolean {
        const exists = this._nodes.some((item) => item.id === node.id);

        if (exists) {
            return false;
        }

        this._nodes.push(node);
        return true;
    }

    public deleteNode(id: ID): boolean {
        const index = this._nodes.findIndex((item) => item.id === id);

        if (index === -1) {
            return false;
        }

        this._nodes.splice(index, 1);
        return true;
    }

    public deleteNodes(): void {
        this._nodes.length = 0;
    }


    /****************************************************************/
    /*                           VIEWPORT                           */
    /****************************************************************/

    public getViewportWorldCorners(): FixedArray<Point, 4> {
        const { width, height } = this.getSize();

        const tl = this._camera.screenToWorld({ x: 0, y: 0 });
        const tr = this._camera.screenToWorld({ x: width, y: 0 });
        const br = this._camera.screenToWorld({ x: width, y: height });
        const bl = this._camera.screenToWorld({ x: 0, y: height });

        return [tl, tr, br, bl];
    }

    public getViewportWorldAABB(): Rect {
        const [tl, tr, br, bl] = this.getViewportWorldCorners();

        const xs = [tl.x, tr.x, br.x, bl.x];
        const ys = [tl.y, tr.y, br.y, bl.y];

        const minX = MathF32.toF32(Math.min(...xs));
        const maxX = MathF32.toF32(Math.max(...xs));
        const minY = MathF32.toF32(Math.min(...ys));
        const maxY = MathF32.toF32(Math.max(...ys));

        return {
            x: minX,
            y: minY,
            width: MathF32.sub(maxX, minX),
            height: MathF32.sub(maxY, minY),
        };
    }

    /****************************************************************/
    /*                            HIT TEST                          */
    /****************************************************************/

    public findTopNodeAt(worldPoint: Point): IShapeBase | null {
        for (let i = this._nodes.length - 1; i >= 0; i--) {
            const node = this._nodes[i];
            if(node === undefined) {
                continue;
            }
            if (!node.isVisibleInHierarchy()) {
                continue;
            }
            if (node.hitTest(worldPoint)) {
                return node;
            }
        }
        return null;
    }


    /****************************************************************/
    /*                           Overrides                          */
    /****************************************************************/

    public override destroy(): void {
        this.deleteNodes();
        this._camera.reset();
        super.destroy();
    }

    public override setWidth(value: number): void {
        super.setWidth(value);
        this._camera.setViewportSize(this.getWidth(), this.getHeight());
    }

    public override setHeight(value: number): void {
        super.setHeight(value);
        this._camera.setViewportSize(this.getWidth(), this.getHeight());
    }

    public override setSize(width: number, height: number): void {
        super.setSize(width, height);
        this._camera.setViewportSize(this.getWidth(), this.getHeight());
    }



    /****************************************************************/
    /*                             Camera                           */
    /****************************************************************/
    public getCamera(): ICamera {
        return this._camera;
    }
}