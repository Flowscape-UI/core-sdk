import type { Point } from "../../../../../../core/camera";
import type { ID } from "../../../../../../core/types";
import type { IShapeBase } from "../../../../../../nodes";
import { Input } from "../../../../../Input";
import { MouseButton } from "../../../../../types";
import { ModuleManager, type IInputModule } from "../../../../base";
import type { OverlayInputContext } from "../../LayerOverlayInputController";
import { ModuleOverlayTransformMove } from "./move";
import { ModuleOverlayTransformPivot } from "./pivot";
import { ModuleOverlayTransformResize } from "./resize";
import { ModuleOverlayTransformRotate } from "./rotation";
import type { IOverlayTransformSubModule } from "./types";

export class ModuleOverlayTransform implements IInputModule<OverlayInputContext> {
    public readonly id = "overlay-transform";

    private _context: OverlayInputContext | null = null;
    private readonly _moduleManager = new ModuleManager<IOverlayTransformSubModule>();

    constructor() {
        this.addModule(new ModuleOverlayTransformRotate());
        this.addModule(new ModuleOverlayTransformMove());
        this.addModule(new ModuleOverlayTransformResize());
        this.addModule(new ModuleOverlayTransformPivot());
    }

    public addModule(module: IOverlayTransformSubModule): void {
        this._moduleManager.add(module);

        if (this._context) {
            module.attach(this._context);
        }
    }

    public removeModule(id: ID): boolean {
        const module = this._moduleManager.getById(id);
        if (!module) {
            return false;
        }

        module.detach();
        module.destroy();
        return this._moduleManager.remove(id);
    }

    public attach(context: OverlayInputContext): void {
        this._context = context;

        for (const module of this._moduleManager.getAll()) {
            module.attach(context);
        }
    }

    public detach(): void {
        for (const module of this._moduleManager.getAll()) {
            module.detach();
        }

        this._context = null;
    }

    public destroy(): void {
        this.detach();

        for (const module of this._moduleManager.getAll()) {
            module.destroy();
        }

        this._moduleManager.clear();
    }

    public update(): void {
    if (!this._context) {
        return;
    }

    const owner = this._context.getInteractionOwner();

    if (owner !== null && owner !== this.id) {
        return;
    }

    const modules = this._moduleManager.getAll();

    const activeModule = modules.find((module) => module.isActive());
    if (activeModule) {
        activeModule.update();

        if (!activeModule.isActive()) {
            this._context.endInteraction(this.id);
        }

        return;
    }

    const screenPoint = this._getStagePointerFromInput();

    let hoverCursor: string | null = null;

    for (let i = modules.length - 1; i >= 0; i--) {
        const module = modules[i];
        if (!module) {
            continue;
        }

        // @ts-ignore - temporary: hoverCursor API not typed yet
        if (!module.getHoverCursor) {
            continue;
        }

        // @ts-ignore - temporary: hoverCursor API not typed yet
        const cursor = module.getHoverCursor(screenPoint);
        if (!cursor) {
            continue;
        }

        hoverCursor = cursor;
        break;
    }

    if (hoverCursor) {
        Input.setCursor(hoverCursor);
    } else {
        Input.resetCursor();
    }

    if (!Input.getMouseButtonDown(MouseButton.Left)) {
        return;
    }

    const hoveredNode = this._context.overlay.getHoveredNode();
    const currentNodeId = this._getActiveNodeId();

    if (hoveredNode && currentNodeId !== hoveredNode.id) {
        const changed = this._setNodeForAllModules(hoveredNode);

        if (changed) {
            this._context.emitChange();
        }

        return;
    }

    if (currentNodeId !== null) {
        for (let i = modules.length - 1; i >= 0; i--) {
            const module = modules[i];
            if (module === undefined) {
                continue;
            }

            if (!module.hitTest(screenPoint)) {
                continue;
            }

            if (!this._context.tryBeginInteraction(this.id)) {
                return;
            }

            if (module.tryBegin(screenPoint)) {
                return;
            }

            this._context.endInteraction(this.id);
        }
    }

    if (!hoveredNode) {
        const changed = this._clearAllModules();

        if (changed) {
            this._context.emitChange();
        }
    }
}

    private _getActiveNodeId(): ID | null {
        for (const module of this._moduleManager.getAll()) {
            if (!module.hasNode()) {
                continue;
            }

            return module.getNodeId();
        }

        return null;
    }

    private _setNodeForAllModules(node: IShapeBase): boolean {
        let changed = false;

        for (const module of this._moduleManager.getAll()) {
            if (module.getNodeId() === node.id) {
                continue;
            }

            module.setNode(node);
            changed = true;
        }

        return changed;
    }

    private _clearAllModules(): boolean {
        let changed = false;

        for (const module of this._moduleManager.getAll()) {
            if (!module.hasNode()) {
                continue;
            }

            module.clearNode();
            changed = true;
        }

        return changed;
    }

    private _getStagePointerFromInput(): Point {
        const rect = this._context!.stage.container().getBoundingClientRect();

        return {
            x: Input.pointerPosition.x - rect.left,
            y: Input.pointerPosition.y - rect.top,
        };
    }
}