import type { NodeAddon } from '../../addons/NodeAddon';
import type { KonvaNode } from '../konva';

/**
 * Public interface for working with node addons.
 * Hides the internal implementation of NodeAddons<BaseNode>.
 */
export interface NodeAddonsHandle {
  add(addons: NodeAddon | NodeAddon[]): unknown;
  remove(addons: NodeAddon | NodeAddon[]): unknown;
  list(): NodeAddon[];
  has(addon: NodeAddon): boolean;
  clear(): void;
}

/**
 * Base interface for public Node Handles.
 * Concrete implementations will proxy BaseNode methods.
 */
export interface NodeHandle<TKonva extends KonvaNode = KonvaNode> {
  readonly id: string;
  readonly addons: NodeAddonsHandle;

  getPosition(): { x: number; y: number };
  setPosition(position: { x: number; y: number }): this;

  remove(): void;

  /**
   * Safe access to the low-level Konva object.
   * Returns the object itself without the need to import Konva from an external dependency.
   */
  getKonvaNode(): TKonva;
}

/**
 * Handle for ShapeNode (rectangle with rounded corners)
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
 * Handle for TextNode
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
 * Handle for ImageNode
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
 * Handle for CircleNode
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
 * Handle for EllipseNode
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
 * Handle for ArcNode
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
 * Handle for ArrowNode
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
 * Handle for StarNode
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
 * Handle for RingNode
 */
export interface RingNodeHandle extends NodeHandle {
  setInnerRadius(radius: number): this;
  setOuterRadius(radius: number): this;
  setFill(color: string): this;
  setStroke(color: string): this;
  setStrokeWidth(width: number): this;
}

/**
 * Handle for RegularPolygonNode
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
 * Handle for GroupNode
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

/**
 * Handle for SvgNode
 */
export interface SvgNodeHandle extends NodeHandle {
  setSrc(
    url: string,
    onLoad?: (node: unknown) => void,
    onError?: (error: Error) => void,
  ): Promise<unknown>;
  setSize(size: { width: number; height: number }): this;
  setCornerRadius(radius: number | number[]): this;
  setOpacity(opacity: number): this;
  getSize(): { width: number; height: number };
  getCornerRadius(): number;
  getOpacity(): number;
  isLoading(): boolean;
  isLoaded(): boolean;
}

/**
 * Handle for VideoNode
 */
export interface VideoNodeHandle extends NodeHandle {
  setSrc(url: string, options?: Record<string, unknown>): Promise<unknown>;
  play(): Promise<unknown>;
  pause(): this;
  stop(): this;
  setCurrentTime(time: number): this;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): this;
  getVolume(): number;
  setMuted(muted: boolean): this;
  isMuted(): boolean;
  setLoop(loop: boolean): this;
  isLoop(): boolean;
  setPlaybackRate(rate: number): this;
  getPlaybackRate(): number;
  isPlaying(): boolean;
  isLoaded(): boolean;
  getVideoElement(): HTMLVideoElement | null;
  setSize(size: { width: number; height: number }): this;
  setCornerRadius(radius: number | number[]): this;
  setOpacity(opacity: number): this;
  getSize(): { width: number; height: number };
  getCornerRadius(): number;
  getOpacity(): number;
}

/**
 * Handle for GifNode
 */
export interface GifNodeHandle extends NodeHandle {
  setSrc(url: string, options?: Record<string, unknown>): Promise<unknown>;
  play(): this;
  pause(): this;
  isPlaying(): boolean;
  isLoaded(): boolean;
  getFrameIndex(): number;
  getCanvas(): HTMLCanvasElement | null;
  setSize(size: { width: number; height: number }): this;
  setCornerRadius(radius: number | number[]): this;
  setOpacity(opacity: number): this;
  getSize(): { width: number; height: number };
  getCornerRadius(): number;
  getOpacity(): number;
}
