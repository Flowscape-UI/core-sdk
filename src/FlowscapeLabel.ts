import Konva from 'konva';

export type FlowscapeLabelOptions = Konva.LabelConfig;

export class FlowscapeLabel extends Konva.Label {
  private _textNode: Konva.Text;
  private _attachedNode: Konva.Node | null = null;
  private _world: Konva.Container | null = null;

  constructor(config: FlowscapeLabelOptions = {}) {
    super({ visible: false, listening: false, ...config });

    const tag = new Konva.Tag({
      fill: '#1677ff',
      cornerRadius: 3,
      opacity: 0.9,
    });
    const text = new Konva.Text({
      text: '',
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: 10,
      fill: 'white',
      padding: 4,
      align: 'center',
    });
    this.add(tag);
    this.add(text);
    this._textNode = text;
  }

  public updateFor(node: Konva.Node, world: Konva.Container): void {
    const bounds = node.getClientRect({ skipShadow: true, skipStroke: false, relativeTo: world });
    const cx = bounds.x + bounds.width / 2;
    const bottom = bounds.y + bounds.height;

    const absNode = node.getAbsoluteScale();
    const absWorld = world.getAbsoluteScale();
    const nodeOnlySx = (Math.abs(absNode.x) || 1) / (Math.abs(absWorld.x) || 1);
    const nodeOnlySy = (Math.abs(absNode.y) || 1) / (Math.abs(absWorld.y) || 1);

    interface WithSize {
      width: () => number;
      height: () => number;
    }
    const maybeSized = node as unknown as Partial<WithSize>;
    let logicalW = bounds.width;
    let logicalH = bounds.height;
    if (typeof maybeSized.width === 'function' && typeof maybeSized.height === 'function') {
      try {
        const wv = maybeSized.width();
        const hv = maybeSized.height();
        if (typeof wv === 'number') logicalW = wv * nodeOnlySx;
        if (typeof hv === 'number') logicalH = hv * nodeOnlySy;
      } catch {
        // fallback на bounds
      }
    }
    const fmt = (n: number) => n.toFixed(2);
    this._textNode.text(`${fmt(logicalW)} × ${fmt(logicalH)}`);

    const s = world.getAbsoluteScale();
    const sx = s.x || 1;
    const sy = s.y || 1;

    const scaledLabelWidthWorld = this.width() * (1 / sx);
    const screenOffsetYPx = 6;
    const offsetYWorld = screenOffsetYPx * (1 / sy);

    this.position({ x: cx - scaledLabelWidthWorld / 2, y: bottom + offsetYWorld });
    this.rotation(0);
    this.scale({ x: 1 / sx, y: 1 / sy });
  }

  public attach(node: Konva.Node, world: Konva.Container): void {
    this.detach();

    this._attachedNode = node;
    this._world = world;

    this.updateFor(node, world);
    this.visible(true);
    this._world.getLayer()?.batchDraw();
    this._world.getStage()?.batchDraw();

    node.on('dragstart.fs-label', () => {
      this.visible(false);
      this._world?.getStage()?.batchDraw();
    });
    node.on('dragend.fs-label', () => {
      if (!this._world) return;
      this.updateFor(node, this._world);
      this.visible(true);
      this._world.getStage()?.batchDraw();
    });
    node.on(
      'dragmove.fs-label transform.fs-label xChange.fs-label yChange.fs-label widthChange.fs-label heightChange.fs-label scaleXChange.fs-label scaleYChange.fs-label rotationChange.fs-label',
      () => {
        if (!this._world || !this._attachedNode) return;
        this.updateFor(this._attachedNode, this._world);
        this._world.getStage()?.batchDraw();
      },
    );

    world.on(
      'dragmove.fs-label transform.fs-label xChange.fs-label yChange.fs-label scaleXChange.fs-label scaleYChange.fs-label',
      () => {
        if (!this._world || !this._attachedNode) return;
        this.updateFor(this._attachedNode, this._world);
        this._world.getStage()?.batchDraw();
      },
    );
  }

  public detach(): void {
    if (this._attachedNode) {
      this._attachedNode.off('.fs-label');
    }
    if (this._world) {
      this._world.off('.fs-label');
    }
    this._attachedNode = null;
    this._world = null;
    this.visible(false);
  }
}
