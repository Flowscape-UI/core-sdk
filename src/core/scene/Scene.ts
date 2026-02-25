import Konva from 'konva';
import { LayerBackground } from './layers/LayerBackground';

export type SceneOptions = {
    container?: HTMLDivElement;
    width?: number;
    height?: number;
    autoResize?: boolean;
    background?: string; // цвет или "linear-gradient(...)"
    listening?: boolean; // для world слоя
};

const DEFAULTS: Required<Omit<SceneOptions, 'container'>> = {
    width: 800,
    height: 800,
    autoResize: true,
    background: '#1e1e1e',
    listening: false,
};

export class Scene {
    private readonly container: HTMLDivElement;
    private readonly stage: Konva.Stage;

    private readonly backgroundLayer: LayerBackground;
    private readonly worldLayer: Konva.Layer;

    private _autoResize: boolean = false;

    private _resizeObserver: ResizeObserver | null = null;

    constructor(options: SceneOptions = {}) {
        const opts = { ...DEFAULTS, ...options };

        this.container = options.container ?? Scene.createDefaultContainer(opts.width, opts.height);

        this.stage = new Konva.Stage({
            container: this.container,
            width: opts.width,
            height: opts.height,
            draggable: false,
        });

        // 0) Background (из отдельного файла)
        this.backgroundLayer = new LayerBackground(this.stage, opts.width, opts.height);
        this.backgroundLayer.setBackground(opts.background);

        // 1) World (твои ноды)
        this.worldLayer = new Konva.Layer({ listening: opts.listening });
        this.stage.add(this.worldLayer);

        if (opts.autoResize) {
            this.enableAutoResize();
            this._autoResize = true;
        }
    }

    /** слой для твоих нод */
    public getLayer(): Konva.Layer {
        return this.worldLayer;
    }

    /** поменять фон: цвет или css-градиент ("linear-gradient(...)"). '' -> прозрачный */
    public setBackground(value: string) {
        this.backgroundLayer.setBackground(value);
    }

    /** поставить картинку на фон */
    public setBackgroundImage(options: {
        url: string,
        width?: number,
        height?: number,
        opacity?: number,
    }) {
        return this.backgroundLayer.setImage(options);
    }

    public setSize(width: number, height: number) {
        this.stage.size({ width, height });
        this.backgroundLayer.setSize(width, height);
    }

    public resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (!width || !height) return;

        if (width !== this.stage.width() || height !== this.stage.height()) {
            this.setSize(width, height);
        }
    }

    public enableAutoResize() {
        // Use ResizeObserver for better performance and accuracy
        if (typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver(() => {
                this._handleResize();
            });
            this._resizeObserver.observe(this.container);
        } else {
            // Fallback to window resize event for older browsers
            globalThis.addEventListener('resize', this._handleResize);
        }
    }

    private _handleResize = () => {
        if (!this._autoResize) return;

        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;

        // Only update if size actually changed
        if (width !== this.stage.width() || height !== this.stage.height()) {
            this.setSize(width, height);
        }
    };

    public disableAutoResize() {
        if (!this._resizeObserver) return;
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
    }

    public destroy() {
        this.disableAutoResize();
        this.backgroundLayer.destroy();
        this.stage.destroy();
    }

    private static createDefaultContainer(width: number, height: number): HTMLDivElement {
        if (typeof document === 'undefined') {
            throw new Error(
                '[Flowscape Scene] No DOM available. Pass { container } when using SSR/Node, or create Scene only in the browser.'
            );
        }

        const div = document.createElement('div');
        div.style.width = `${width}px`;
        div.style.height = `${height}px`;
        div.style.position = 'relative';
        document.body.appendChild(div);
        return div;
    }
}