import Konva from 'konva';
import type { NodeText } from '../../nodes-new';

export class NodeTextRenderer {
    private readonly node: NodeText;
    private readonly shape: Konva.Text;

    constructor(node: NodeText) {
        this.node = node;
        this.shape = new Konva.Text();

        this.sync();
    }

    public getShape(): Konva.Text {
        return this.shape;
    }

    public sync(): void {
        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        this.shape.x(pos.x);
        this.shape.y(pos.y);

        this.shape.width(this.node.getWidth());
        this.shape.height(this.node.getHeight());

        this.shape.scaleX(scale.x);
        this.shape.scaleY(scale.y);

        this.shape.text(this.node.getText());

        this.shape.fontSize(this.node.getFontSize());
        this.shape.fontFamily(this.node.getFontFamily());
        this.shape.fontStyle(this.node.getFontStyle());

        this.shape.align(this.node.getAlign());
        this.shape.verticalAlign(this.node.getVerticalAlign());

        this.shape.lineHeight(this.node.getLineHeight());
        this.shape.wrap(this.node.getWrap());
        this.shape.padding(this.node.getPadding());

        this.shape.fill(this.node.getFill());
    }
}