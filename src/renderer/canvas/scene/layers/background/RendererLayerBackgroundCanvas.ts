import Konva from "konva";
import type { LayerBackground } from "../../../../../core/scene/layers/background/LayerBackground";
import type { IRendererLayerBackground } from "./types";

export class RendererLayerBackgroundCanvas implements IRendererLayerBackground {
    private readonly _layer: Konva.Layer;
    private readonly _fillRect: Konva.Rect;
    private readonly _imageNode: Konva.Image;

    private _background: LayerBackground | null = null;

    private _imageElement: HTMLImageElement | null = null;
    private _imageSrc: string = "";

    constructor() {
        this._layer = new Konva.Layer({
            listening: false,
        });

        this._fillRect = new Konva.Rect({
            listening: false,
        });

        this._imageNode = new Konva.Image({
            listening: false,
            visible: false,
        });

        this._layer.add(this._fillRect);
        this._layer.add(this._imageNode);
    }

    public getLayer(): Konva.Layer {
        return this._layer;
    }

    public attach(background: LayerBackground): void {
        this._background = background;
    }

    public detach(): void {
        this._background = null;

        this._imageElement = null;
        this._imageSrc = "";
        this._imageNode.image(null);
        this._imageNode.visible(false);
    }

    public render(): void {
        this._layer.draw();
    }

    public update(): void {
        if (!this._background) {
            return;
        }

        const width = this._background.getWidth();
        const height = this._background.getHeight();

        // --- Fill ---
        this._fillRect.setAttrs({
            x: 0,
            y: 0,
            width,
            height,
            fill: this._background.getFill(),
        });

        // --- Image ---
        const src = this._background.getImage();

        if (!src) {
            this._imageSrc = "";
            this._imageElement = null;
            this._imageNode.image(null);
            this._imageNode.visible(false);
            return;
        }

        if (src !== this._imageSrc) {
            this._loadImage(src);
            return;
        }

        if (this._imageElement) {
            this._applyImageAttrs();
        }
    }

    public destroy(): void {
        this.detach();
        this._layer.destroy();
    }


    /***************************************************************************/
    /*                              Image Helpers                              */
    /***************************************************************************/
    private _loadImage(src: string): void {
        this._imageSrc = src;
        this._imageElement = null;
        this._imageNode.visible(false);

        const image = new Image();

        image.onload = () => {
            if (src !== this._imageSrc) {
                return;
            }

            this._imageElement = image;
            this._imageNode.image(image);

            this._applyImageAttrs();
            this._layer.draw();
        };

        image.onerror = () => {
            if (src !== this._imageSrc) {
                return;
            }

            this._imageElement = null;
            this._imageNode.image(null);
            this._imageNode.visible(false);
            this._layer.draw();
        };

        image.src = src;
    }

    private _applyImageAttrs(): void {
        if (!this._background || !this._imageElement) {
            this._imageNode.visible(false);
            return;
        }

        this._imageNode.setAttrs({
            x: this._background.getImageX(),
            y: this._background.getImageY(),
            opacity: this._background.getImageOpacity(),
            width: this._background.getImageWidth(),
            height: this._background.getImageHeight(),
            offsetX: this._background.getImageOffsetX(),
            offsetY: this._background.getImageOffsetY(),
            image: this._imageElement,
            visible: true,
        });
    }
}