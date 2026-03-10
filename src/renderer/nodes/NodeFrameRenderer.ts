import Konva from 'konva';
import type { NodeFrame } from '../../nodes-new';

export class NodeFrameRenderer {
    private readonly node: NodeFrame;

    private readonly group: Konva.Group;
    private readonly background: Konva.Rect;
    private readonly contentGroup: Konva.Group;

    constructor(node: NodeFrame) {
        this.node = node;

        this.group = new Konva.Group();
        this.background = new Konva.Rect();
        this.contentGroup = new Konva.Group();

        this.group.add(this.background);
        this.group.add(this.contentGroup);

        this.sync();
    }

    public getShape(): Konva.Group {
        return this.group;
    }

    public getContentGroup(): Konva.Group {
        return this.contentGroup;
    }

    public sync(): void {
        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        const width = this.node.getWidth();
        const height = this.node.getHeight();

        this.group.x(pos.x);
        this.group.y(pos.y);

        this.group.scaleX(scale.x);
        this.group.scaleY(scale.y);

        this.background.x(0);
        this.background.y(0);
        this.background.width(width);
        this.background.height(height);

        this.background.fill(this.node.getFill());
        this.background.stroke(this.node.getStroke());
        this.background.strokeWidth(this.node.getStrokeWidth());
        this.background.cornerRadius(this.node.getCornerRadius());

        if (this.node.getClipContent()) {
            this.contentGroup.clip({
                x: 0,
                y: 0,
                width,
                height,
            });
        } else {
            this.contentGroup.clip(undefined);
        }
    }
}