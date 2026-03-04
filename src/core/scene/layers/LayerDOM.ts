import { RenderOrder, type IRenderable } from "../../interfaces";
import type { ILayer } from "./ILayer";

export type LayerDOMOptions = {
    zIndex?: number;
    pointerEvents?: "none" | "auto";
    className?: string;
    ensureRelativeContainer?: boolean; // чтобы не забывать про position: relative
};

const DEFAULT_DOM_OPTIONS: Required<LayerDOMOptions> = {
    zIndex: 10,
    pointerEvents: "none",
    className: "",
    ensureRelativeContainer: true,
};

export class LayerDOM implements ILayer {
    protected readonly _root: HTMLDivElement;
    protected readonly _container: HTMLDivElement;

    private _width: number;
    private _height: number;

    constructor(
        width: number,
        height: number,
        container: HTMLDivElement,
        options?: LayerDOMOptions,
    ) {
        const opts = { ...DEFAULT_DOM_OPTIONS, ...options };
        this._width = width;
        this._height = height;
        this._container = container;

        if (opts.ensureRelativeContainer) {
            const style = this._container.style;
            if (!style.position) style.position = "relative";
        }

        this._root = document.createElement("div");
        this._root.className = "flowscape-ui-root";
        if (opts.className) {
            this._root.className = opts.className;
        }

        Object.assign(this._root.style, {
            position: "absolute",
            width: `${width}px`,
            height: `${height}px`,
            left: "0",
            top: "0",
            zIndex: String(opts.zIndex),
            pointerEvents: opts.pointerEvents,
        });

        container.appendChild(this._root);
    }

    public getRoot(): HTMLDivElement {
        return this._root;
    }

    /** Create isolated DOM slot for a UI module */
    public createPortal(className?: string): HTMLDivElement {
        const el = document.createElement("div");
        if (className) el.className = className;
        el.style.position = "absolute";
        el.style.left = "0";
        el.style.top = "0";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.pointerEvents = "none";
        this._root.appendChild(el);
        return el;
    }

    public getSize(): { width: number, height: number } {
        return {
            width: this._width,
            height: this._height,
        }
    }

    public setSize(width: number, height: number): void {
        this._width = width;
        this._height = height;

        // если нужно фиксированное позиционирование
        this._root.style.width = `${width}px`;
        this._root.style.height = `${height}px`;
    }

    public destroy(): void {
        this._root.remove();
    }
}