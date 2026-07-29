import { formatRgb, parse, type Color } from "culori";
import {
    Enableable,
    FLOAT32_MAX,
    MathF32,
    type Point
} from "../../../../../core";
import type { IShapeBase, Size } from "../../../../../nodes";
import { HandleDebugDrawType, HandleType, type IHandleBase } from "./types";


export class HandleBase extends Enableable implements IHandleBase {
    private static readonly DEFAULT_FILL_COLOR: Color = {
        mode: "rgb",
        r: 1,
        g: 1,
        b: 1,
    };

    private static readonly DEFAULT_STROKE_FILL_COLOR: Color = {
        mode: "rgb",
        r: 0,
        g: 0,
        b: 0,
    };

    private static readonly DEFAULT_HIT_FILL_COLOR: Color = {
        mode: "rgb",
        r: 1,
        g: 0,
        b: 0,
        alpha: 0,
    };

    private static readonly DEFAULT_DEBUG_FILL_COLOR: Color = {
        mode: "rgb",
        r: 1,
        g: 0,
        b: 0,
    };

    private static readonly DEFAULT_DEBUG_STOKE_FILL_COLOR: Color = {
        mode: "rgb",
        r: 0,
        g: 0,
        b: 1,
    };

    public readonly type: HandleType;

    private _visible: boolean;
    private _node: IShapeBase | null;

    private _width: number;
    private _height: number;
    private _hitWidth: number;
    private _hitHeight: number;
    private _hitFill: Color;
    private _hitOpacity: number;
    private _zIndex: number;

    private _x: number;
    private _y: number;

    private _offsetX: number;
    private _offsetY: number;

    private _fill: Color;
    private _strokeFill: Color;
    private _strokeWidth: number;
    private _opacity: number;

    private _debugEnabled: boolean;
    private _debugFillType: HandleDebugDrawType;
    private _debugOpacity: number;
    private _debugFill: Color;
    private _debugStrokeFill: Color;
    private _debugWidth: number;
    private _debugHeight: number;
    private _debugStrokeWidth: number;
    private _debugStrokeType: HandleDebugDrawType;

    constructor(type: HandleType = HandleType.Base) {
        super();
        this.type = type;

        this.disable();
        this._visible = true;
        this._node = null;

        this._width = 0;
        this._height = 0;
        this._hitWidth = 0;
        this._hitHeight = 0;
        this._hitFill = HandleBase.DEFAULT_HIT_FILL_COLOR;
        this._hitOpacity = 0.25;
        this._zIndex = 0;

        this._x = 0.5;
        this._y = 0.5;

        this._offsetX = 0;
        this._offsetY = 0;

        this._fill = HandleBase.DEFAULT_FILL_COLOR;
        this._strokeFill = HandleBase.DEFAULT_STROKE_FILL_COLOR;
        this._strokeWidth = 2;
        this._opacity = 1;

        this._debugEnabled = false;
        this._debugFillType = HandleDebugDrawType.Dashed;
        this._debugOpacity = 1;
        this._debugFill = HandleBase.DEFAULT_DEBUG_FILL_COLOR;
        this._debugStrokeFill = HandleBase.DEFAULT_DEBUG_STOKE_FILL_COLOR;
        this._debugWidth = 0;
        this._debugHeight = 0;
        this._debugStrokeWidth = 1;
        this._debugStrokeType = HandleDebugDrawType.Solid;
    }

    public static getTopHoveredHandle<THandle extends IHandleBase>(
        point: Point,
        handles: readonly THandle[],
    ): THandle | null {
        let topHandle: THandle | null = null;
        let topZIndex = -Infinity;
        let topOrder = -1;

        for (let i = 0; i < handles.length; i += 1) {
            const handle = handles[i];

            if (!handle) {
                continue;
            }

            if (!handle.isEnabled() || !handle.isVisible() || !handle.hitTest(point)) {
                continue;
            }

            const zIndex = handle.getZIndex();
            const isAbove =
                zIndex > topZIndex ||
                (zIndex === topZIndex && i > topOrder);

            if (!isAbove) {
                continue;
            }

            topHandle = handle;
            topZIndex = zIndex;
            topOrder = i;
        }

        return topHandle;
    }

    public static isHovered(
        handle: IHandleBase,
        point: Point,
        handles: readonly IHandleBase[],
    ): boolean {
        return HandleBase.getTopHoveredHandle(point, handles) === handle;
    }



    public isVisible(): boolean {
        return this._visible;
    }

    public show(): void {
        if(this._visible === true) {
            return;
        }
        this._visible = true;
    }

    public hide(): void {
        if(this._visible === false) {
            return;
        }
        this._visible = false;
    }

    public setVisible(value: boolean): void {
        if(this._visible === value) {
            return;
        }
        this._visible = value;
    }



    /**********************************************************/
    /*                          Nodes                         */
    /**********************************************************/
    public hitTest(point: Point): boolean {
        const width = this._hitWidth > 0 ? this._hitWidth : this._width;
        const height = this._hitHeight > 0 ? this._hitHeight : this._height;

        if (width <= 0 || height <= 0) {
            return false;
        }

        const worldPosition = this._getWorldAnchorPosition();
        const originX = worldPosition?.x ?? this._x;
        const originY = worldPosition?.y ?? this._y;

        const left = originX - this._offsetX;
        const top = originY - this._offsetY;
        const right = left + width;
        const bottom = top + height;

        return (
            point.x >= left &&
            point.x <= right &&
            point.y >= top &&
            point.y <= bottom
        );
    }

    public getNode(): IShapeBase | null {
        return this._node;
    }

    public hasNode(): boolean {
        return this._node !== null;
    }

    public setNode(value: IShapeBase | null): boolean {
        if (this._node === value) {
            return false;
        }
        if(value === null) {
            this.disable();
        } else {
            this.enable();
        }
        this._node = value;
        return true;
    }

    public clearNode(): void {
        if(this._node === null) {
            return;
        }
        this._node = null;
        this.disable();
    }



    /**********************************************************/
    /*                          Sizing                        */
    /**********************************************************/
    public getWidth(): number {
        return this._width;
    }

    public getHeight(): number {
        return this._height
    }

    public getSize(): Size {
        return {
            width: this._width,
            height: this._height,
        }
    }

    public setWidth(value: number): void {
        const newValue = MathF32.clamp(value, 0, FLOAT32_MAX);
        if(this._width === newValue) {
            return;
        }
        this._width = newValue;
    }

    public setHeight(value: number): void {
        const newValue = MathF32.clamp(value, 0, FLOAT32_MAX);
        if(this._height === newValue) {
            return;
        }
        this._height = newValue;
    }

    public setSize(width: number, height: number): void {
        this.setWidth(width);
        this.setHeight(height);
    }

    public getHitWidth(): number {
        return this._hitWidth;
    }

    public getHitHeight(): number {
        return this._hitHeight;
    }

    public getHitSize(): Size {
        return {
            width: this._hitWidth,
            height: this._hitHeight,
        };
    }

    public setHitWidth(value: number): void {
        const newValue = MathF32.clamp(value, 0, FLOAT32_MAX);
        if (this._hitWidth === newValue) {
            return;
        }
        this._hitWidth = newValue;
    }

    public setHitHeight(value: number): void {
        const newValue = MathF32.clamp(value, 0, FLOAT32_MAX);
        if (this._hitHeight === newValue) {
            return;
        }
        this._hitHeight = newValue;
    }

    public setHitSize(width: number, height: number): void {
        this.setHitWidth(width);
        this.setHitHeight(height);
    }

    public getHitFill(): string {
        return formatRgb(this._hitFill);
    }

    public setHitFill(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;
        if (!color) {
            return;
        }
        if (this._hitFill && formatRgb(this._hitFill) === formatRgb(color)) {
            return;
        }
        this._hitFill = color;
    }

    public getHitOpacity(): number {
        return this._hitOpacity;
    }

    public setHitOpacity(value: number): void {
        const newValue = MathF32.clamp(value, 0, 1);
        if (this._hitOpacity === newValue) {
            return;
        }
        this._hitOpacity = newValue;
    }

    public getZIndex(): number {
        return this._zIndex;
    }

    public setZIndex(value: number): void {
        const newValue = MathF32.toF32(value);
        if (this._zIndex === newValue) {
            return;
        }
        this._zIndex = newValue;
    }



    /**********************************************************/
    /*                        Positioning                     */
    /**********************************************************/
    public getX(): number {
        return this._x;
    }

    public getY(): number {
        return this._y;
    }

    public getPosition(): Point {
        return {
            x: this._x,
            y: this._y
        }
    }

    public setX(value: number): void {
        const newValue = this._normalizePositionX(value);
        if(this._x === newValue) {
            return;
        }
        this._x = newValue;
    }

    public setY(value: number): void {
        const newValue = this._normalizePositionY(value);
        if(this._y === newValue) {
            return;
        }
        this._y = newValue;
    }

    public setPosition(value: Point): void {
        this.setX(value.x);
        this.setY(value.y);
    }

    public getOffsetX(): number {
        return this._offsetX;
    }

    public getOffsetY(): number {
        return this._offsetY;
    }

    public getOffset(): Point {
        return {
            x: this._offsetX,
            y: this._offsetY
        }
    }

    public setOffsetX(value: number): void {
        const newValue = MathF32.toF32(value);
        if(this._offsetX === newValue) {
            return;
        }
        this._offsetX = newValue;
    }

    public setOffsetY(value: number): void {
        const newValue = MathF32.toF32(value);
        if(this._offsetY === newValue) {
            return;
        }
        this._offsetY = newValue;
    }

    public setOffset(value: Point): void {
        this.setOffsetX(value.x);
        this.setOffsetY(value.y);
    }



    /**********************************************************/
    /*                         Styling                        */
    /**********************************************************/
    public getFill(): string {
        return formatRgb(this._fill);
    }

    public setFill(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;
        if (!color) {
            return;
        }
        if (this._fill && formatRgb(this._fill) === formatRgb(color)) {
            return;
        }
        this._fill = color;
    }

    public getStrokeWidth(): number {
        return this._strokeWidth;
    }

    public setStrokeWidth(value: number): void {
        const newValue = MathF32.clamp(value, 0, FLOAT32_MAX);
        if(this._strokeWidth === newValue) {
            return;
        }
        this._strokeWidth = newValue;
    }

    public getStrokeFill(): string {
        return formatRgb(this._strokeFill);
    }

    public setStrokeFill(value: string): void {
        const color = typeof value === "string" ? parse(value) : value;
        if (!color) {
            return;
        }
        if (this._strokeFill && formatRgb(this._strokeFill) === formatRgb(color)) {
            return;
        }
        this._strokeFill = color;
    }

    public getOpacity(): number {
        return this._opacity;
    }

    public setOpacity(value: number): void {
        const newValue = MathF32.clamp(value, 0, 1);
        if(this._opacity === newValue) {
            return;
        }
        this._opacity = newValue;
    }



    /**********************************************************/
    /*                          Debug                         */
    /**********************************************************/
    public isEnabledDebug(): boolean {
        return this._debugEnabled;
    }

    public setEnabledDebug(value: boolean): void {
        if (this._debugEnabled === value) {
            return;
        }
        this._debugEnabled = value;
    }

    public enableDebug(): void {
        this.setEnabledDebug(true);
    }

    public disableDebug(): void {
        this.setEnabledDebug(false);
    }

    public getDebugFillType(): HandleDebugDrawType {
        return this._debugFillType;
    }

    public setDebugFillType(value: HandleDebugDrawType): void {
        if (this._debugFillType === value) {
            return;
        }
        this._debugFillType = value;
    }

    public getDebugOpacity(): number {
        return this._debugOpacity;
    }

    public setDebugOpacity(value: number): void {
        const newValue = MathF32.clamp(value, 0, 1);
        if (this._debugOpacity === newValue) {
            return;
        }
        this._debugOpacity = newValue;
    }

    public getDebugFill(): string {
        return formatRgb(this._debugFill);
    }

    public setDebugFill(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;
        if (!color) {
            return;
        }
        if (this._debugFill && formatRgb(this._debugFill) === formatRgb(color)) {
            return;
        }
        this._debugFill = color;
    }

    public getDebugWidth(): number {
        return this._debugWidth;
    }

    public getDebugHeight(): number {
        return this._debugHeight;
    }

    public getDebugSize(): Size {
        return {
            width: this._debugWidth,
            height: this._debugHeight,
        };
    }

    public setDebugWidth(value: number): void {
        const newValue = MathF32.clamp(value, 0, FLOAT32_MAX);
        if (this._debugWidth === newValue) {
            return;
        }
        this._debugWidth = newValue;
    }

    public setDebugHeight(value: number): void {
        const newValue = MathF32.clamp(value, 0, FLOAT32_MAX);
        if (this._debugHeight === newValue) {
            return;
        }
        this._debugHeight = newValue;
    }

    public setDebugSize(width: number, height: number): void {
        this.setDebugWidth(width);
        this.setDebugHeight(height);
    }

    public getDebugStrokeWidth(): number {
        return this._debugStrokeWidth;
    }

    public setDebugStrokeWidth(value: number): void {
        const newValue = MathF32.clamp(value, 0, FLOAT32_MAX);
        if (this._debugStrokeWidth === newValue) {
            return;
        }
        this._debugStrokeWidth = newValue;
    }

    public getDebugStrokeFill(): string {
        return formatRgb(this._debugStrokeFill);
    }

    public setDebugStrokeFill(value: string | Color): void {
        const color = typeof value === "string" ? parse(value) : value;
        if (!color) {
            return;
        }
        if (this._debugStrokeFill && formatRgb(this._debugStrokeFill) === formatRgb(color)) {
            return;
        }
        this._debugStrokeFill = color;
    }

    public getDebugStrokeType(): HandleDebugDrawType {
        return this._debugStrokeType;
    }

    public setDebugStrokeType(value: HandleDebugDrawType): void {
        if (this._debugStrokeType === value) {
            return;
        }
        this._debugStrokeType = value;
    }

    private _getWorldAnchorPosition(): Point | null {
        const node = this._node;

        if (!node) {
            return null;
        }

        const localViewObb = node.getLocalViewOBB();
        const localX = localViewObb.x + localViewObb.width * this._x;
        const localY = localViewObb.y + localViewObb.height * this._y;
        const matrix = node.getWorldMatrix();

        return {
            x: matrix.a * localX + matrix.c * localY + matrix.tx,
            y: matrix.b * localX + matrix.d * localY + matrix.ty,
        };
    }

    protected _normalizePositionX(value: number): number {
        return MathF32.clamp(value, 0, FLOAT32_MAX);
    }

    protected _normalizePositionY(value: number): number {
        return MathF32.clamp(value, 0, FLOAT32_MAX);
    }



    /**********************************************************/
    /*                          Clear                         */
    /**********************************************************/
    public clear(): void {
        this.clearNode();
    }



    /**********************************************************/
    /*                       Destroyable                      */
    /**********************************************************/
    public destroy(): void {
        this.clear();

        this._visible = false;
        this.disable();

        this._width = 0;
        this._height = 0;
        this._hitWidth = 0;
        this._hitHeight = 0;
        this._hitFill = HandleBase.DEFAULT_HIT_FILL_COLOR;
        this._hitOpacity = 0;
        this._zIndex = 0;

        this._x = 0.5;
        this._y = 0.5;

        this._offsetX = 0;
        this._offsetY = 0;

        this._fill = HandleBase.DEFAULT_FILL_COLOR;
        this._strokeFill = HandleBase.DEFAULT_STROKE_FILL_COLOR;
        this._strokeWidth = 0;
        this._opacity = 0;

        this._debugEnabled = false;
        this._debugFillType = HandleDebugDrawType.Dashed;
        this._debugOpacity = 0;
        this._debugFill = HandleBase.DEFAULT_DEBUG_FILL_COLOR;
        this._debugStrokeFill = HandleBase.DEFAULT_DEBUG_STOKE_FILL_COLOR;
        this._debugWidth = 0;
        this._debugHeight = 0;
        this._debugStrokeWidth = 0;
        this._debugStrokeType = HandleDebugDrawType.Solid;
    }
}
