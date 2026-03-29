import { EventEmitter } from "../EventEmitter";
import { MathF32 } from "../math";
import type { CameraState, ICamera, Point, Viewport } from "./types";


type CameraEvents = {
    change: CameraState,
}

export class Camera implements ICamera {
    private _x = 0;
    private _y = 0;
    private _scale = 1;
    private _rotation = 0; // radians

    private _minScale = 0.01;
    private _maxScale = 500;

    private _viewport: Viewport = { width: 1, height: 1 };

    private readonly _events = new EventEmitter<CameraEvents>();


    /***************************************************************************/
    /*                           Event Subscriptions                           */
    /***************************************************************************/
    public onChange(callback: (state: Readonly<CameraState>) => void): () => void {
        return this._events.on("change", callback);
    }


    /***************************************************************************/
    /*                                 Getters                                 */
    /***************************************************************************/
    public getState(): CameraState {
        return {
            x: this._x,
            y: this._y,
            scale: this._scale,
            rotation: this._rotation
        };
    }

    public getViewport(): Readonly<Viewport> {
        return this._viewport;
    }

    public worldToScreen(world: Point): Point {
        return this._worldToScreenWithState(
            world,
            this._viewport,
            {
                x: this._x,
                y: this._y,
                scale: this._scale,
                rotation: this._rotation,
            });
    }

    public screenToWorld(screen: Point): Point {
        return this._screenToWorldWithState(
            screen,
            this._viewport,
            {
                x: this._x,
                y: this._y,
                scale: this._scale,
                rotation: this._rotation,
            });
    }


    /***************************************************************************/
    /*                                 Setters                                 */
    /***************************************************************************/
    public setLimits(minScale: number, maxScale: number): void {
        const newMinScale = MathF32.toF32(minScale);
        const newMaxScale = MathF32.toF32(maxScale);
        if(
            this._minScale === newMinScale &&
            this._maxScale === newMaxScale
        ) {
            return;
        }
        this._minScale = newMinScale;
        this._maxScale = newMaxScale;
    }

    public setPosition(x: number, y: number): void {
        this._update({ x, y });
    }

    public setViewportSize(width: number, height: number): void {
        this._viewport = {
            width: MathF32.clamp(width, 1, width),
            height: MathF32.clamp(height, 1, height),
        };
    }

    public setScale(scale: number): void {
        this._update({ scale: MathF32.clamp(scale, this._minScale, this._maxScale) });
    }

    public setRotationRadians(radians: number): void {
        this._update({ rotation: radians });
    }


    /***************************************************************************/
    /*                                State API                                */
    /***************************************************************************/
    public reset(): void {
        this._update({
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
        });
    }

    public update(newState: Partial<CameraState>): void {
        this._update(newState);
    }


    /***************************************************************************/
    /*                         Screen-Space Operations                         */
    /***************************************************************************/
    // Pan with screen delta (px) - учитывает rotation и scale.
    public panByScreen(dx: number, dy: number): void {
        const wx = -(dx / this._scale);
        const wy = -(dy / this._scale);

        // после фикса знака в _applyCamera это будет ощущаться правильно
        const { x: rdx, y: rdy } = this._rotate({ x: wx, y: wy }, this._rotation);
        this._update({
            x: this._x + rdx,
            y: this._y + rdy,
        });
    }

    // Zoom anchored at screen point. Needs viewport size (for center pivot).
    public zoomAtScreen(screenPoint: Point, factor: number): void {
        const current = this.getState();
        const newScale = MathF32.clamp(current.scale * factor, this._minScale, this._maxScale);

        const before = this.screenToWorld(screenPoint);

        const nextState: CameraState = {
            ...current,
            scale: newScale,
        };

        const after = this._screenToWorldWithState(screenPoint, this._viewport, nextState);

        this._update({
            scale: newScale,
            x: current.x + (before.x - after.x),
            y: current.y + (before.y - after.y),
        });
    }

    // Rotation anchored at screen point (optional, но очень полезно)
    public rotateAtScreen(screenPoint: Point, deltaRadians: number): void {
        const current = this.getState();
        const before = this.screenToWorld(screenPoint);

        const nextState: CameraState = {
            ...current,
            rotation: current.rotation + deltaRadians,
        };

        const after = this._screenToWorldWithState(screenPoint, this._viewport, nextState);

        this._update({
            rotation: nextState.rotation,
            x: current.x + (before.x - after.x),
            y: current.y + (before.y - after.y),
        });
    }


    /***************************************************************************/
    /*                           Overridable Methods                           */
    /***************************************************************************/
    protected _rotate(p: Point, a: number): Point {
        const c = MathF32.cos(a);
        const s = MathF32.sin(a);
        return {
            x: MathF32.toF32(p.x * c - p.y * s),
            y: MathF32.toF32(p.x * s + p.y * c)
        };
    }

    protected _update(state: Partial<CameraState>): void {
        const prev = this.getState();

        if (state.x !== undefined) this._x = state.x;
        if (state.y !== undefined) this._y = state.y;
        if (state.scale !== undefined) {
            this._scale = MathF32.clamp(state.scale, this._minScale, this._maxScale);
        }
        if (state.rotation !== undefined) this._rotation = state.rotation;

        this._emitIfChanged(prev);
    }

    protected _worldToScreenWithState(
        world: Point,
        viewport: { width: number; height: number },
        cameraState: CameraState,
    ): Point {
        const cx = viewport.width / 2;
        const cy = viewport.height / 2;

        // 1) world relative to camera center
        const rel = { x: world.x - cameraState.x, y: world.y - cameraState.y };

        // 2) rotate by -rotation (камера вращает "вид", мир крутится в обратную)
        const rot = this._rotate(rel, -cameraState.rotation);

        // 3) scale
        const scaled = { x: rot.x * cameraState.scale, y: rot.y * cameraState.scale };

        // 4) move to screen center
        return { x: scaled.x + cx, y: scaled.y + cy };
    }

    protected _screenToWorldWithState(
        screen: Point,
        viewport: { width: number; height: number },
        cameraState: CameraState,
    ): Point {
        const cx = viewport.width / 2;
        const cy = viewport.height / 2;

        // 1) screen relative to center
        const rel = { x: screen.x - cx, y: screen.y - cy };

        // 2) unscale
        const unscaled = { x: rel.x / cameraState.scale, y: rel.y / cameraState.scale };

        // 3) rotate by +rotation
        const rot = this._rotate(unscaled, cameraState.rotation);

        // 4) add camera center
        return { x: rot.x + cameraState.x, y: rot.y + cameraState.y };
    }


    /***************************************************************************/
    /*                              Event Emitter                              */
    /***************************************************************************/
    protected _emitIfChanged(prev: CameraState): void {
        const next = this.getState();

        if (
            prev.x !== next.x ||
            prev.y !== next.y ||
            prev.scale !== next.scale ||
            prev.rotation !== next.rotation
        ) {
            this._events.emit("change", next);
        }
    }
}