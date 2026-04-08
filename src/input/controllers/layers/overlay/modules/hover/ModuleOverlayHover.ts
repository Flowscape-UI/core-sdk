import { Input } from "../../../../../Input";
import type { IInputModule } from "../../../../base";
import type { OverlayInputContext } from "../../LayerOverlayInputController";


export class ModuleOverlayHover implements IInputModule<OverlayInputContext> {
    public readonly id = "overlay-hover";
    private _context: OverlayInputContext | null = null;

    public attach(context: OverlayInputContext): void {
        this._context = context;
    }

    public detach(): void {
        if (!this._context) {
            return;
        }

        const hadHover = this._context.overlay.getHoveredNode() !== null;
        this._context.overlay.clearHoveredNode();

        if (hadHover) {
            this._context.emitChange();
        }

        this._context = null;
    }

    public destroy(): void {
        this.detach();
    }

    public update(): void {
        if (!this._context) {
            return;
        }

        this._updateHover();
    }

    private _updateHover(): void {
        const { overlay, world } = this._context!;

        if (!overlay.isEnabled()) {
            const hadHover = overlay.getHoveredNode() !== null;
            if (!hadHover) {
                return;
            }

            overlay.clearHoveredNode();
            this._context!.emitChange();
            return;
        }

        if (!Input.pointerInside) {
            const hadHover = overlay.getHoveredNode() !== null;
            if (!hadHover) {
                return;
            }

            overlay.clearHoveredNode();
            this._context!.emitChange();
            return;
        }

        const screenPoint = this._getStagePointerFromInput();
        const worldPoint = world.getCamera().screenToWorld(screenPoint);

        const hoveredNode = world.findTopNodeAt(worldPoint);
        const currentHoveredNode = overlay.getHoveredNode();

        if (currentHoveredNode?.id === hoveredNode?.id) {
            return;
        }

        if (hoveredNode) {
            overlay.setHoveredNode(hoveredNode);
        } else {
            overlay.clearHoveredNode();
        }

        this._context!.emitChange();
    }

    private _getStagePointerFromInput(): { x: number; y: number } {
        const rect = this._context!.stage.container().getBoundingClientRect();

        return {
            x: Input.pointerPosition.x - rect.left,
            y: Input.pointerPosition.y - rect.top,
        };
    }
}