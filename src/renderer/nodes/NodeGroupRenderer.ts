import Konva from 'konva';
import { NodeGroup } from '../../nodes-new';

export class NodeGroupRenderer {
    private readonly node: NodeGroup;
    private readonly shape: Konva.Group;

    constructor(node: NodeGroup) {
        this.node = node;
        this.shape = new Konva.Group();

        this.sync();
    }

    public getShape(): Konva.Group {
        return this.shape;
    }

    public sync(): void {
        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        this.shape.x(pos.x);
        this.shape.y(pos.y);

        this.shape.scaleX(scale.x);
        this.shape.scaleY(scale.y);

        this.shape.rotation(this.node.getRotation());
    }
}