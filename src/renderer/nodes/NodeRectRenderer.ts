import Konva from "konva";
import { NodeRect } from "../../nodes-new";

export class NodeRectRenderer {
    private readonly _node: NodeRect;
    private readonly _shape: Konva.Rect;

    constructor(node: NodeRect) {
        this._node = node;

        this._shape = new Konva.Rect();

        this.sync();
    }

    public getShape(): Konva.Rect {
        return this._shape;
    }

    public sync(): void {
        const pos = this._node.getPosition();
        const scale = this._node.getScale();

        this._shape.x(pos.x);
        this._shape.y(pos.y);

        this._shape.width(this._node.getWidth());
        this._shape.height(this._node.getHeight());

        this._shape.rotation(this._node.getRotation());

        this._shape.scaleX(scale.x);
        this._shape.scaleY(scale.y);

        this._shape.fill(this._node.getFill());
        this._shape.stroke(this._node.getStroke());
        this._shape.strokeWidth(this._node.getStrokeWidth());
        this._shape.cornerRadius(this._node.getCornerRadius());
    }
}