import Konva from 'konva';
import type { NodeVideo } from '../../nodes-new';

export class NodeVideoRenderer {
    private readonly node: NodeVideo;
    private readonly shape: Konva.Image;

    private videoElement: HTMLVideoElement | null = null;
    private currentSrc: string | null = null;

    private animation: Konva.Animation | null = null;

    constructor(node: NodeVideo) {
        this.node = node;
        this.shape = new Konva.Image();

        this.sync();
    }

    public getShape(): Konva.Image {
        return this.shape;
    }

    private loadVideo(src: string): void {
        if (this.videoElement) {
            this.stopAnimation();

            this.videoElement.pause();
            this.videoElement.src = '';
            this.videoElement.load();

            this.videoElement = null;
        }

        const video = document.createElement('video');

        video.src = src;
        video.loop = this.node.getLoop();
        video.muted = this.node.getMuted();
        video.autoplay = this.node.getAutoplay();
        video.playsInline = true;
        video.preload = 'auto';
        video.crossOrigin = 'anonymous';

        video.onloadeddata = () => {
            this.videoElement = video;
            this.shape.image(video);

            if (this.node.getAutoplay()) {
                void video.play().catch(() => {});
            }

            this.startAnimation();
            this.shape.getLayer()?.batchDraw();
        };

        video.onplay = () => {
            this.startAnimation();
        };

        video.onpause = () => {
            this.stopAnimation();
            this.shape.getLayer()?.batchDraw();
        };

        video.onended = () => {
            if (!video.loop) {
                this.stopAnimation();
                this.shape.getLayer()?.batchDraw();
            }
        };

        video.onerror = () => {
            this.stopAnimation();
        };
    }

    private startAnimation(): void {
        const layer = this.shape.getLayer();
        if (!layer) return;

        if (this.animation) return;

        this.animation = new Konva.Animation(() => {}, layer);
        this.animation.start();
    }

    private stopAnimation(): void {
        if (!this.animation) return;

        this.animation.stop();
        this.animation = null;
    }

    public sync(): void {
        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        const width = this.node.getWidth();
        const height = this.node.getHeight();

        const src = this.node.getSrc();

        if (src !== this.currentSrc) {
            this.currentSrc = src;
            this.loadVideo(src);
        }

        if (this.videoElement) {
            this.videoElement.loop = this.node.getLoop();
            this.videoElement.muted = this.node.getMuted();
        }

        this.shape.x(pos.x);
        this.shape.y(pos.y);

        this.shape.width(width);
        this.shape.height(height);

        this.shape.scaleX(scale.x);
        this.shape.scaleY(scale.y);

        this.shape.cornerRadius(this.node.getCornerRadius());
    }

    public destroy(): void {
        this.stopAnimation();

        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.src = '';
            this.videoElement.load();
            this.videoElement = null;
        }

        this.shape.destroy();
    }
}