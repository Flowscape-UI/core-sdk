export class LayerUIRoot {
    private readonly _container: HTMLDivElement;
    private readonly _root: HTMLDivElement;

    constructor(container: HTMLDivElement, zIndex: number = 10) {
        this._container = container;

        // ensure positioning context
        const style = this._container.style;
        if (!style.position) style.position = "relative";

        this._root = document.createElement("div");
        this._root.className = "flowscape-ui-root";
        this._root.style.position = "absolute";
        this._root.style.inset = "0";
        this._root.style.zIndex = String(zIndex);
        this._root.style.pointerEvents = "none"; // default: UI doesn't block canvas


        this._root.style.position = "absolute";
        this._root.style.left = "0";
        this._root.style.top = "0";
        this._root.style.right = "0";
        this._root.style.bottom = "0";
        this._root.style.zIndex = "9999";
        this._root.style.pointerEvents = "none";
        this._container.appendChild(this._root);

    }

    public getRoot(): HTMLDivElement {
        return this._root;
    }

    /** Create isolated DOM slot for a UI module */
    public createPortal(className?: string): HTMLDivElement {
        const el = document.createElement("div");
        if (className) el.className = className;
        el.style.position = "absolute";
        el.style.inset = "0";
        el.style.pointerEvents = "none";
        this._root.appendChild(el);
        return el;
    }

    public destroy() {
        this._root.remove();
    }
}