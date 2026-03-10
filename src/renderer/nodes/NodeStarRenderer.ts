import Konva from 'konva';
import type { NodeStar } from '../../nodes-new';

export class NodeStarRenderer {
    private readonly node: NodeStar;
    private readonly shape: Konva.Star;

    constructor(node: NodeStar) {
        this.node = node;
        this.shape = new Konva.Star();

        this.sync();
    }

    public getShape(): Konva.Star {
        return this.shape;
    }

    public sync(): void {
        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        const radius = this.node.getRadius();
        const ratio = this.node.getRatio();

        this.shape.x(pos.x + radius);
        this.shape.y(pos.y + radius);

        this.shape.numPoints(this.node.getSegmentCount());
        this.shape.outerRadius(radius);
        this.shape.innerRadius(radius * ratio);

        this.shape.scaleX(scale.x);
        this.shape.scaleY(scale.y);

        this.shape.fill(this.node.getFill());
        this.shape.stroke(this.node.getStroke());
        this.shape.strokeWidth(this.node.getStrokeWidth());
    }
}