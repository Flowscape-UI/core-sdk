import Konva from 'konva';
import type { NodeImage } from '../../nodes-new';

export class NodeImageRenderer {
    private readonly node: NodeImage;
    private readonly shape: Konva.Image;

    private imageElement: HTMLImageElement | null = null;
    private currentSrc: string | null = null;

    constructor(node: NodeImage) {
        this.node = node;
        this.shape = new Konva.Image();

        this.sync();
    }

    public getShape(): Konva.Image {
        return this.shape;
    }

    private loadImage(src: string): void {
        const img = new Image();
        img.src = src;

        img.onload = () => {
            this.imageElement = img;
            this.shape.image(img);

            this.shape.getLayer()?.batchDraw();
        };
    }

    public sync(): void {
        const src = this.node.getSrc();

        // проверяем изменился ли src
        if (src !== this.currentSrc) {

            this.currentSrc = src;
            this.loadImage(src);

        }
        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        const width = this.node.getWidth();
        const height = this.node.getHeight();

        this.shape.x(pos.x);
        this.shape.y(pos.y);

        this.shape.width(width);
        this.shape.height(height);

        this.shape.scaleX(scale.x);
        this.shape.scaleY(scale.y);
    }
}