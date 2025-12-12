import type { NodeAddon } from '../../addons/NodeAddon';
import type { KonvaNode } from '../konva';

/**
 * Публичный интерфейс для работы с аддонами ноды.
 * Скрывает внутреннюю реализацию NodeAddons<BaseNode>.
 */
export interface NodeAddonsHandle {
  add(addons: NodeAddon | NodeAddon[]): unknown;
  remove(addons: NodeAddon | NodeAddon[]): unknown;
  list(): NodeAddon[];
  has(addon: NodeAddon): boolean;
  clear(): void;
}

/**
 * Базовый интерфейс для публичных Node Handle.
 * Конкретные реализации будут проксировать методы BaseNode.
 */
export interface NodeHandle<TKonva extends KonvaNode = KonvaNode> {
  readonly id: string;
  readonly addons: NodeAddonsHandle;

  getPosition(): { x: number; y: number };
  setPosition(position: { x: number; y: number }): this;

  remove(): void;

  /**
   * Безопасный доступ к низкоуровневому Konva-объекту.
   * Возвращает сам объект, без необходимости импортировать Konva из внешней зависимости.
   */
  getKonvaNode(): TKonva;
}

/**
 * Handle для ShapeNode (прямоугольник с скруглением)
 */
export interface ShapeNodeHandle extends NodeHandle {
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
  setCornerRadius(radius: number | number[]): this;
  setSize(size: { width: number; height: number }): this;
  getFill(): string | undefined;
  getStroke(): string | undefined;
  getStrokeWidth(): number;
  getCornerRadius(): number;
}

/**
 * Handle для TextNode
 */
export interface TextNodeHandle extends NodeHandle {
  getText(): string;
  setText(text: string): this;
  setFontSize(size: number): this;
  setFontFamily(family: string): this;
  setFill(color: string): this;
  setEditable(editable: boolean): this;
  isEditable(): boolean;
  onTextChange(
    callback: (event: { oldText: string; newText: string; cancelled: boolean }) => void,
  ): this;
  onEditStart(callback: () => void): this;
  onEditEnd(callback: () => void): this;
}

/**
 * Handle для ImageNode
 */
export interface ImageNodeHandle extends NodeHandle {
  setSrc(url: string, crossOrigin?: '' | 'anonymous' | 'use-credentials'): Promise<this>;
  setImage(image: HTMLImageElement): this;
  setSize(size: { width: number; height: number }): this;
  setCornerRadius(radius: number | number[]): this;
  getSize(): { width: number; height: number };
  getCornerRadius(): number;
}

/**
 * Handle для CircleNode
 */
export interface CircleNodeHandle extends NodeHandle {
  setRadius(radius: number): this;
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
  getRadius(): number;
  getFill(): string | undefined;
  getStroke(): string | undefined;
}

/**
 * Handle для EllipseNode
 */
export interface EllipseNodeHandle extends NodeHandle {
  setRadiusX(radiusX: number): this;
  setRadiusY(radiusY: number): this;
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
  getRadiusX(): number;
  getRadiusY(): number;
}

/**
 * Handle для ArcNode
 */
export interface ArcNodeHandle extends NodeHandle {
  setInnerRadius(radius: number): this;
  setOuterRadius(radius: number): this;
  setAngle(angle: number): this;
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
}

/**
 * Handle для ArrowNode
 */
export interface ArrowNodeHandle extends NodeHandle {
  setPoints(points: number[]): this;
  setPointerLength(length: number): this;
  setPointerWidth(width: number): this;
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
  getPoints(): number[];
}

/**
 * Handle для StarNode
 */
export interface StarNodeHandle extends NodeHandle {
  setNumPoints(points: number): this;
  setInnerRadius(radius: number): this;
  setOuterRadius(radius: number): this;
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
}

/**
 * Handle для RingNode
 */
export interface RingNodeHandle extends NodeHandle {
  setInnerRadius(radius: number): this;
  setOuterRadius(radius: number): this;
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
}

/**
 * Handle для RegularPolygonNode
 */
export interface RegularPolygonNodeHandle extends NodeHandle {
  setSides(sides: number): this;
  setRadius(radius: number): this;
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
  getRadius(): number;
  getSides(): number;
}

/**
 * Handle для GroupNode
 */
export interface GroupNodeHandle extends NodeHandle {
  addChild(child: KonvaNode | NodeHandle): this;
  removeChild(child: KonvaNode | NodeHandle): this;
  removeAllChildren(): this;
  getChildren(): KonvaNode[];
  findByName(name: string): KonvaNode[];
  setDraggable(draggable: boolean): this;
  isDraggable(): boolean;
  setListening(listening: boolean): this;
  isListening(): boolean;
  setClip(rect: { x: number; y: number; width: number; height: number }): this;
}
