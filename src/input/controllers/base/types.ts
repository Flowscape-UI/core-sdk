import type { IAttachable, IDestroyable, IUpdatable, IWithId } from "../../../core/interfaces";
import type { ModuleManager } from "./ModuleManager";

export interface IInputModule<T = unknown> extends IWithId, IAttachable<T>, IUpdatable, IDestroyable {
    readonly enabled?: boolean;
}

export interface IInputControllerBase<
    T = unknown,
    TModule extends IInputModule<T> = IInputModule<T>
> extends IWithId, IAttachable<T>, IUpdatable, IDestroyable {
    readonly moduleManager: ModuleManager<TModule>;
}

export type WorldInputOptions = {
    enabled?: boolean;

    /**
     * Pan activation mode.
     *
     * Режим активации pan.
     */
    panMode?: "middle" | "right" | "spaceLeft" | "left";

    /**
     * Enables zoom on Ctrl + wheel.
     *
     * Включает зум по Ctrl + wheel.
     */
    zoomEnabled?: boolean;

    /**
     * Zoom factor.
     *
     * Коэффициент зума.
     */
    zoomFactor?: number;

    /**
     * Prevents browser wheel default behavior over stage.
     *
     * Запрещает стандартное поведение wheel браузера над stage.
     */
    preventWheelDefault?: boolean;

    /**
     * Arrow pan speed in pixels per second.
     *
     * Скорость pan по стрелкам в пикселях в секунду.
     */
    keyboardPanSpeed?: number;

    /**
     * Shift multiplier for keyboard pan speed.
     *
     * Множитель скорости pan по стрелкам при Shift.
     */
    keyboardPanShiftMultiplier?: number;
};


export type OverlayInputOptions = {};