import Konva from 'konva';

export interface FlowscapeRectOptions extends Konva.RectConfig {
  transformer: Konva.Transformer;
  sizeLabel: Konva.Label;
  showSelection: (node: Konva.Node | null) => void;
  positionSizeLabelFor: (node: Konva.Node) => void;
}

export class FlowscapeRect extends Konva.Rect {
  private _hoverTransformer: Konva.Transformer | null = null;

  constructor(options: FlowscapeRectOptions) {
    const { transformer, sizeLabel, showSelection, positionSizeLabelFor, ...rectConfig } = options;

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
      // Create or reuse a lightweight Transformer as a hover frame
      if (!this._hoverTransformer) {
        this._hoverTransformer = new Konva.Transformer({
          rotateEnabled: false,
          enabledAnchors: [],
          borderStroke: '#22a6f2',
          borderStrokeWidth: 2,
          ignoreStroke: true,
          padding: 0,
          listening: false,
          name: 'fs-hover-transformer',
        });
        // Attach hover transformer to the same parent as the node (world)
        this.getParent()?.add(this._hoverTransformer);
      }
      this._hoverTransformer.nodes([this]);
      this._hoverTransformer.moveToTop();
      this.getLayer()?.batchDraw();
    });

    this.on('mouseleave', () => {
      const stage = this.getStage();
      if (stage) {
        stage.container().style.cursor = 'default';
      }
      if (this._hoverTransformer) {
        this._hoverTransformer.nodes([]);
        this._hoverTransformer.getLayer()?.batchDraw();
      }
    });

    this.on('dragstart', () => {
      const stage = this.getStage();
      if (stage) {
        stage.container().style.cursor = 'grabbing';
      }
      if (this._hoverTransformer) {
        this._hoverTransformer.nodes([]);
        this._hoverTransformer.getLayer()?.batchDraw();
      }
    });

    this.on('dragend', () => {
      const stage = this.getStage();
      if (stage) {
        stage.container().style.cursor = 'grab';
      }
      // no-op for hover transformer; selection will take over
      showSelection(this);
    });

    this.on('click', () => {
      if (this._hoverTransformer) {
        this._hoverTransformer.nodes([]);
        this._hoverTransformer.getLayer()?.batchDraw();
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

    this.on('transform', () => {
      // hover transformer follows automatically via Konva internals
      if (sizeLabel.visible()) {
        positionSizeLabelFor(this);
        transformer.moveToTop();
        sizeLabel.moveToTop();
        this.getStage()?.batchDraw();
      }
    });

    this.on('destroy', () => {
      if (this._hoverTransformer) {
        this._hoverTransformer.destroy();
        this._hoverTransformer = null;
      }
    });
  }
}
