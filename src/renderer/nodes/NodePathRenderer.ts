import Konva from 'konva';
import type { NodePath } from '../../nodes-new';

export class NodePathRenderer {
    private readonly node: NodePath;
    private readonly shape: Konva.Path;

    private currentPath: string | null = null;

    constructor(node: NodePath) {
        this.node = node;
        this.shape = new Konva.Path();

        this.sync();
    }

    public getShape(): Konva.Path {
        return this.shape;
    }

    public sync(): void {
        const pos = this.node.getPosition();
        const nodeScale = this.node.getScale();

        const width = this.node.getWidth();
        const height = this.node.getHeight();

        const path = this.node.getPath();

        if (path !== this.currentPath) {
            this.currentPath = path;
            this.shape.data(path);
        }

        const selfRect = this.shape.getSelfRect();

        const pathWidth = Math.max(1, selfRect.width);
        const pathHeight = Math.max(1, selfRect.height);

        const scaleX = width / pathWidth;
        const scaleY = height / pathHeight;

        this.shape.x(pos.x - selfRect.x * scaleX);
        this.shape.y(pos.y - selfRect.y * scaleY);

        this.shape.scaleX(scaleX * nodeScale.x);
        this.shape.scaleY(scaleY * nodeScale.y);

        this.shape.fill(this.node.getFill());
        this.shape.stroke(this.node.getStroke());
        this.shape.strokeWidth(this.node.getStrokeWidth());
    }
}