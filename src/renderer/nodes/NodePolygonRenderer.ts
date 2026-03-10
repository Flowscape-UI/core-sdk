import Konva from 'konva';
import type { NodePolygon } from '../../nodes-new';

export class NodePolygonRenderer {

    private readonly node: NodePolygon;
    private readonly shape: Konva.RegularPolygon;

    constructor(node: NodePolygon) {
        this.node = node;
        this.shape = new Konva.RegularPolygon();

        this.sync();
    }

    public getShape(): Konva.RegularPolygon {
        return this.shape;
    }

    public sync(): void {

        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        const width = this.node.getWidth();
        const height = this.node.getHeight();

        const radius = width / 2;

        this.shape.x(pos.x + width / 2);
        this.shape.y(pos.y + height / 2);

        this.shape.sides(this.node.getSideCount());
        this.shape.radius(radius);

        this.shape.scaleX(width / (radius * 2));
        this.shape.scaleY(height / (radius * 2));

        this.shape.scaleX(this.shape.scaleX() * scale.x);
        this.shape.scaleY(this.shape.scaleY() * scale.y);

        this.shape.fill(this.node.getFill());
        this.shape.stroke(this.node.getStroke());
        this.shape.strokeWidth(this.node.getStrokeWidth());
    }
}