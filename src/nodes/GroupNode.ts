import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

export interface GroupNodeOptions extends BaseNodeOptions {
  draggable?: boolean;
  listening?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
}

export class GroupNode extends BaseNode<Konva.Group> {
  constructor(options: GroupNodeOptions = {}) {
    const group = new Konva.Group({} as Konva.GroupConfig);
    group.x(options.x ?? 0);
    group.y(options.y ?? 0);
    group.draggable(options.draggable ?? true);
    if (options.listening !== undefined) group.listening(options.listening);
    if (options.clip) group.clip(options.clip);

    super(group, options);
  }

  public addChild(child: Konva.Node | BaseNode): this {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const raw: Konva.Node = (child as BaseNode).getNode
      ? ((child as BaseNode).getNode() as unknown as Konva.Node)
      : (child as Konva.Node);
    // Group.add ожидает Group | Shape, приведём тип к совместимому юниону
    this.konvaNode.add(raw as unknown as Konva.Group | Konva.Shape);
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  public removeChild(child: Konva.Node | BaseNode): this {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const raw: Konva.Node = (child as BaseNode).getNode
      ? (child as BaseNode).getNode()
      : (child as Konva.Node);
    raw.remove();
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  public removeAllChildren(): this {
    this.konvaNode.removeChildren();
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }

  public getChildren(): Konva.Node[] {
    return this.konvaNode.getChildren() as unknown as Konva.Node[];
  }

  public findByName(name: string): Konva.Node[] {
    return this.konvaNode.find(`.${name}`) as unknown as Konva.Node[];
  }

  public setDraggable(v: boolean): this {
    this.konvaNode.draggable(v);
    return this;
  }
  public isDraggable(): boolean {
    return this.konvaNode.draggable();
  }

  public setListening(v: boolean): this {
    this.konvaNode.listening(v);
    return this;
  }
  public isListening(): boolean {
    return this.konvaNode.listening();
  }

  public setClip(rect: { x: number; y: number; width: number; height: number }): this {
    this.konvaNode.clip(rect);
    this.konvaNode.getLayer()?.batchDraw();
    return this;
  }
}
