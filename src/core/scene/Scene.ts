import Konva from 'konva';
import { LayerBackground } from './layers/LayerBackground';
import { LayerWorld } from './layers/LayerWorld';
import { LayerWorldInputController } from './layers/LayerWorldInputController';
import { LayerOverlay } from './layers/LayerOverlay';
import { RulerUILayer } from './layers/LayerRuller';
import { LayerDOM } from './layers/LayerDOM';
import { RenderScheduler } from './RenderScheduler';
import type { IRenderable } from '../interfaces/IRenderable';

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
    private readonly _renderer: RenderScheduler;
    
    private readonly container: HTMLDivElement;
    private readonly stage: Konva.Stage;
    
    private readonly backgroundLayer: LayerBackground;
    private readonly worldLayer: LayerWorld;
    private readonly overlayLayer: LayerOverlay;
    private readonly uiRoot: LayerDOM;
    private readonly rulers: RulerUILayer;
    
    // Inputs
    private readonly _worldInputController: LayerWorldInputController;
    
    private _resizeRaf = 0;
    private _autoResize: boolean = false;

    private _resizeObserver: ResizeObserver | null = null;

    constructor(options: SceneOptions = {}) {
        const opts = { ...DEFAULTS, ...options };

        this.container = options.container ?? Scene.createDefaultContainer(opts.width, opts.height);
        this.container.style.position ||= "relative";

        if (opts.autoResize) {
            this.enableAutoResize();
            this._autoResize = true;
        }

        this.stage = new Konva.Stage({
            container: this.container,
            width: opts.width,
            height: opts.height,
            draggable: false,
        });

        this._renderer = new RenderScheduler(this.stage);

        // 0) Background (из отдельного файла)
        this.backgroundLayer = new LayerBackground(opts.width, opts.height, this.stage, this);
        this.backgroundLayer.setBackground(opts.background);

        // 1) World (твои ноды)
        this.worldLayer = new LayerWorld(opts.width, opts.height, this.stage, this, { listening: opts.listening });

        // 2) Overlay layer
        this.overlayLayer = new LayerOverlay(opts.width, opts.height, this.stage, this.worldLayer, this, { listening: true })

        // 3) UI LAYER
        this.uiRoot = new LayerDOM(opts.width, opts.height, this.container);
        this.rulers = new RulerUILayer(this.uiRoot, this.worldLayer, this, {
            thickness: 22,
        });


        // Inputs
        this._worldInputController = new LayerWorldInputController(this.stage, this.worldLayer, {
            panMode: "spaceLeft", // или "middle"
            zoomFactor: 1.08,
        });

        this.container.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    public invalidate(layer: IRenderable) {
        this._renderer.invalidate(layer);
    }

    /** слой для твоих нод */
    public getWorld(): LayerWorld {
        return this.worldLayer;
    }

    public getOverlay(): LayerOverlay {
        return this.overlayLayer;
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

    public getSize(): { width: number, height: number } {
        return {
            width: this.container.clientWidth,
            height: this.container.clientHeight,
        }
    }

    public setSize(width: number, height: number) {
        this.stage.size({ width, height });
        this.backgroundLayer.setSize(width, height);
        this.worldLayer.setSize(width, height);
        this.overlayLayer.setSize(width, height);
        this.uiRoot.setSize(width, height);

        this.invalidate(this.backgroundLayer);
        this.invalidate(this.worldLayer);
        this.invalidate(this.overlayLayer);
        this.invalidate(this.rulers);
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
        if (this._resizeRaf) return;

        this._resizeRaf = requestAnimationFrame(() => {
            this._resizeRaf = 0;

            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            if (width !== this.stage.width() || height !== this.stage.height()) {
                this.setSize(width, height);
            }
        });
    };

    public disableAutoResize() {
        if (!this._resizeObserver) return;
        this._resizeObserver.disconnect();
        this._resizeObserver = null;
    }

    public destroy() {
        this.disableAutoResize();
        this._worldInputController.destroy();

        this.backgroundLayer.destroy();
        this.worldLayer.destroy();
        this.stage.destroy();
        this.overlayLayer.destroy();

        this.rulers.destroy();
        this.uiRoot.destroy();

        this._renderer.destroy();
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