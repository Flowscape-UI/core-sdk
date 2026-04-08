import type { ID } from "../../../core/types";
import { NodeType } from "../../base";
import { NodeRect } from "../NodeRect";
import { ImageFit, type INodeImage } from "./types";

export class NodeImage extends NodeRect implements INodeImage {
    private _src: string;
    private _alt: string;
    private _fit: ImageFit;

    constructor(id: ID, name?: string, type?: NodeType) {
        super(id, name ?? "Image", type ?? NodeType.Image);

        this._src = "";
        this._alt = "";
        this._fit = ImageFit.Cover;
    }

    public getSrc(): string {
        return this._src;
    }

    public setSrc(value: string): void {
        if (value === this._src) {
            return;
        }

        this._src = value;
    }

    public getAlt(): string {
        return this._alt;
    }

    public setAlt(value: string): void {
        if (value === this._alt) {
            return;
        }

        this._alt = value;
    }

    public getFit(): ImageFit {
        return this._fit;
    }

    public setFit(value: ImageFit): void {
        if (value === this._fit) {
            return;
        }

        this._fit = value;
    }
}