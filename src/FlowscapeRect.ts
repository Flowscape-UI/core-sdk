import Konva from 'konva';

export interface FlowscapeRectOptions extends Konva.RectConfig {
    transformer: Konva.Transformer;
    sizeLabel: Konva.Label;
    showSelection: (node: Konva.Node | null) => void;
    positionSizeLabelFor: (node: Konva.Node) => void;
}

export class FlowscapeRect extends Konva.Rect {
    private _hoverClone: Konva.Rect | null = null;

    constructor(options: FlowscapeRectOptions) {
        const {
            transformer,
            sizeLabel,
            showSelection,
            positionSizeLabelFor,
            ...rectConfig
        } = options;

        super({
            fill: '#D9D9D9',
            strokeScaleEnabled: false,
            draggable: true,
            ...rectConfig,
        });

        this.on('mouseenter', () => {
            const stage = this.getStage();
            if (stage) {
                stage.container().style.cursor = 'grab';
            }
            if (transformer.nodes().includes(this)) {
                return;
            }
            if (this._hoverClone) {
                this._hoverClone.destroy();
            }
            
            
            this._hoverClone = new Konva.Rect({
                ...this.getAttrs(),
                fill: 'transparent',
                stroke: '#22a6f2',
                strokeWidth: 2,
                listening: false,
            });
            this.getLayer()?.add(this._hoverClone);
            this._hoverClone.moveToTop();
            this.getLayer()?.batchDraw();
        });

        this.on('mouseleave', () => {
            const stage = this.getStage();
            if (stage) {
                stage.container().style.cursor = 'default';
            }
            if (this._hoverClone) {
                this._hoverClone.destroy();
                this._hoverClone = null;
                this.getLayer()?.batchDraw();
            }
        });

        this.on('dragstart', () => {
            const stage = this.getStage();
            if (stage) {
                stage.container().style.cursor = 'grabbing';
            }
            if (this._hoverClone) {
                this._hoverClone.destroy();
                this._hoverClone = null;
                this.getLayer()?.batchDraw();
            }
        });

        this.on('dragend', () => {
            const stage = this.getStage();
            if (stage) {
                stage.container().style.cursor = 'grab';
            }
            if (this._hoverClone) {
                this._hoverClone.show();
            }
            showSelection(this);
        });

        this.on('click', () => {
            if (this._hoverClone) {
                this._hoverClone.destroy();
                this._hoverClone = null;
                this.getLayer()?.batchDraw();
            }
            showSelection(this);
        });

        this.on('dragmove', () => {
            if (sizeLabel.visible()) {
                positionSizeLabelFor(this);
                transformer.moveToTop();
                sizeLabel.moveToTop();
                this.getStage()?.batchDraw();
            }
        });

        this.on('dragstart', () => {
            if (this._hoverClone) {
                this._hoverClone.destroy();
                this._hoverClone = null;
                this.getLayer()?.batchDraw();
            }
        });

        this.on('transform', () => {
            if (this._hoverClone) {
                this._hoverClone.setAttrs({
                    x: this.x(),
                    y: this.y(),
                    width: this.width(),
                    height: this.height(),
                    rotation: this.rotation(),
                    scaleX: this.scaleX(),
                    scaleY: this.scaleY(),
                });
            }
            if (sizeLabel.visible()) {
                positionSizeLabelFor(this);
                transformer.moveToTop();
                sizeLabel.moveToTop();
                this.getStage()?.batchDraw();
            }
        });

        this.on('destroy', () => {
            if (this._hoverClone) {
                this._hoverClone.destroy();
            }
            this.getStage()?.off('transform.hover', this._updateHoverClone);
        });

        this.on('added', () => {
            this.getStage()?.on('transform.hover', this._updateHoverClone);
        });
    }

    private _updateHoverClone = () => {
        if (!this._hoverClone) return;
        this._hoverClone.setAttrs({
            x: this.x(),
            y: this.y(),
            width: this.width(),
            height: this.height(),
            rotation: this.rotation(),
            scaleX: this.scaleX(),
            scaleY: this.scaleY(),
        });
    };
}
