import Konva from 'konva';
import type { NodeEllipse } from '../../nodes-new';

export class NodeEllipseRenderer {
    private readonly node: NodeEllipse;
    private readonly shape: Konva.Arc;

    constructor(node: NodeEllipse) {
        this.node = node;
        this.shape = new Konva.Arc();

        this.sync();
    }

    public getShape(): Konva.Arc {
        return this.shape;
    }

    public sync(): void {

        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        const radiusX = this.node.getRadiusX();
        const radiusY = this.node.getRadiusY();

        const innerRatio = this.node.getInnerRatio();

        const startAngle = this.node.getStartAngle();
        const endAngle = this.node.getEndAngle();

        const sweepAngle = endAngle - startAngle;

        const outerRadius = radiusX;
        const innerRadius = radiusX * innerRatio;

        const ellipseScale = radiusY / radiusX;

        this.shape.x(pos.x + radiusX);
        this.shape.y(pos.y + radiusY);

        this.shape.innerRadius(innerRadius);
        this.shape.outerRadius(outerRadius);

        this.shape.rotation(startAngle);
        this.shape.angle(sweepAngle);

        this.shape.scaleX(scale.x);
        this.shape.scaleY(scale.y * ellipseScale);

        this.shape.fill(this.node.getFill());
        this.shape.stroke(this.node.getStroke());
        this.shape.strokeWidth(this.node.getStrokeWidth());
    }
}