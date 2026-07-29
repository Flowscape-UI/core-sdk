import type { ICamera } from "../../../../../../core/camera";
import { Input } from "../../../../../Input";
import { KeyCode, MouseButton } from "../../../../../types";
import type { IInputModule } from "../../../../base";
import type { WorldInputContext } from "../../LayerWorldInputController";

export class ModuleWorldPan implements IInputModule<WorldInputContext> {
    public readonly id = "world-pan";

    private _context: WorldInputContext | null = null;
    private _isDragging = false;
    private _activeButton: number | null = null;

    public attach(context: WorldInputContext): void {
        this._context = context;

        Input.configure({
            preventContextMenu: true,
        });
    }

    public detach(): void {
        this._stopDrag();
        this._context = null;
    }

    public destroy(): void {
        this.detach();
    }

    public update(): void {
        if (!this._context) {
            return;
        }

        if (!this._context.options.enabled) {
            this._stopDrag();
            return;
        }

        this._updateDragPanState();
        this._updateWheelPan();
        this._updateDragPan();
        this._updateKeyboardPan();
    }

    private _getCamera(): ICamera {
        return this._context!.world.camera;
    }

    private _emitChange(): void {
        this._context!.emitChange();
    }

    private _stopDrag(): void {
        this._isDragging = false;
        this._activeButton = null;
        Input.resetCursor();
    }

    private _canStartRightPan(): boolean {
        return Input.getMouseButtonDown(MouseButton.Right) && !Input.ctrlPressed;
    }

    private _canStartMiddlePan(): boolean {
        return Input.getMouseButtonDown(MouseButton.Middle);
    }

    private _updateDragPanState(): void {
        if (!this._context) {
            return;
        }

        if (!this._isDragging) {
            if (this._canStartRightPan()) {
                this._isDragging = true;
                this._activeButton = MouseButton.Right;
                Input.setCursor("grab");
                return;
            }

            if (this._canStartMiddlePan()) {
                this._isDragging = true;
                this._activeButton = MouseButton.Middle;
                Input.setCursor("grab");
                return;
            }

            return;
        }

        if (this._activeButton !== null && Input.getMouseButtonUp(this._activeButton)) {
            this._stopDrag();
            this._emitChange();
            return;
        }

        if (this._activeButton !== null && !Input.getMouseButton(this._activeButton)) {
            this._stopDrag();
            this._emitChange();
        }
    }

    /**
     * Wheel / trackpad pan.
     * Ctrl + wheel не обрабатываем здесь, это зона zoom-модуля.
     * Shift + vertical wheel => horizontal pan.
     */
    private _updateWheelPan(): void {
        const scroll = Input.mouseScrollDelta;
        if (scroll.x === 0 && scroll.y === 0) {
            return;
        }

        if (Input.scrollCtrl) {
            return;
        }

        let dx = scroll.x;
        let dy = scroll.y;

        if (Input.scrollShift && Math.abs(dx) < 0.01) {
            dx = dy;
            dy = 0;
        }

        this._getCamera().panByScreen(-dx, -dy);
        this._emitChange();
    }

    /**
     * Drag pan through RMB or MMB.
     */
    private _updateDragPan(): void {
        if (!this._isDragging) {
            return;
        }

        const delta = Input.mousePositionDelta;
        if (delta.x === 0 && delta.y === 0) {
            return;
        }

        this._getCamera().panByScreen(delta.x, delta.y);
        this._emitChange();
    }

    private _updateKeyboardPan(): void {
        if(!this._context) {
            return;
        }
        const { options } = this._context;
        let dx = 0;
        let dy = 0;

        if (Input.getKeyRepeat(KeyCode.LeftArrow)) dx += 1;
        if (Input.getKeyRepeat(KeyCode.RightArrow)) dx -= 1;
        if (Input.getKeyRepeat(KeyCode.UpArrow)) dy += 1;
        if (Input.getKeyRepeat(KeyCode.DownArrow)) dy -= 1;

        if (dx === 0 && dy === 0) return;

        const speed = Input.shiftPressed
            ? options.keyboardPanSpeed * options.keyboardPanShiftMultiplier
            : options.keyboardPanSpeed;

        // getKeyRepeat работает в единицах кадра, нормируем на 60fps
        const step = speed / 60;

        this._getCamera().panByScreen(dx * step, dy * step);
        this._emitChange();
    }
}
