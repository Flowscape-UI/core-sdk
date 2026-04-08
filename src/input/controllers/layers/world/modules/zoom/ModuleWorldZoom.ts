import type { Point } from "../../../../../../core/camera";
import { Input } from "../../../../../Input";
import { KeyCode, MouseButton } from "../../../../../types";
import type { IInputModule } from "../../../../base";
import type { WorldInputContext } from "../../LayerWorldInputController";



export class ModuleWorldZoom implements IInputModule<WorldInputContext> {
    public readonly id = "world-zoom";

    private _context: WorldInputContext | null = null;
    private _dragAccum = 0;
    private _ctrlMouseZoomStartPoint: Point | null = null;

    public attach(context: WorldInputContext): void {
        this._context = context;
    }

    public detach(): void {
        this._context = null;
        this._dragAccum = 0;
        this._ctrlMouseZoomStartPoint = null;
    }

    public destroy(): void {
        this.detach();
    }

    public update(): void {
        if (!this._context) return;

        this._updateZoomFromKeyboard();
        this._updateCtrlWheelZoom();
        this._updateCtrlMouseZoom();
    }

    private _getCamera() {
        return this._context!.world.getCamera();
    }

    private _emitChange(): void {
        this._context!.emitChange();
    }

    private _updateCtrlWheelZoom(): void {
        const { options } = this._context!;
        if (!options.zoomEnabled) return;

        Input.configure({ preventWheelDefault: true });

        const scroll = Input.mouseScrollDelta;
        if (scroll.x === 0 && scroll.y === 0) return;
        if (!Input.scrollCtrl) return;

        const point = Input.mousePosition;
        const factor = scroll.y > 0
            ? 1 / options.zoomFactor
            : options.zoomFactor;

        this._getCamera().zoomAtScreen(point, factor);
        this._emitChange();
    }

    private _updateZoomFromKeyboard(): void {
        const { options, stage } = this._context!;
        if (!options.zoomEnabled) return;

        const center: Point = {
            x: stage.width() / 2,
            y: stage.height() / 2,
        };

        if (
            Input.getKeyDownCombo(KeyCode.LeftControl, KeyCode.Equals) ||
            Input.getKeyDownCombo(KeyCode.RightControl, KeyCode.Equals)
        ) {
            this._getCamera().zoomAtScreen(center, options.zoomFactor);
            this._emitChange();
            return;
        }

        if (
            Input.getKeyDownCombo(KeyCode.LeftControl, KeyCode.Minus) ||
            Input.getKeyDownCombo(KeyCode.RightControl, KeyCode.Minus)
        ) {
            this._getCamera().zoomAtScreen(center, 1 / options.zoomFactor);
            this._emitChange();
        }
    }

    private _updateCtrlMouseZoom(): void {
        const { options } = this._context!;
        if (!options.zoomEnabled) return;

        const isActive = Input.ctrlPressed && Input.getMouseButton(MouseButton.Right);

        if (!isActive) {
            this._ctrlMouseZoomStartPoint = null;
            this._dragAccum = 0;
            return;
        }

        if (this._ctrlMouseZoomStartPoint === null) {
            const origin = Input.getMouseButtonPressOrigin(MouseButton.Right);
            this._ctrlMouseZoomStartPoint = {
                x: origin.x,
                y: origin.y,
            };
        }

        const dy = Input.mousePositionDelta.y;
        if (dy === 0) return;

        this._dragAccum += dy;
        const sensitivity = 4;
        const point = this._ctrlMouseZoomStartPoint;

        while (Math.abs(this._dragAccum) >= sensitivity) {
            const factor = this._dragAccum > 0
                ? 1 / options.zoomFactor
                : options.zoomFactor;

            this._getCamera().zoomAtScreen(point, factor);
            this._dragAccum -= Math.sign(this._dragAccum) * sensitivity;
        }

        this._emitChange();
    }
}