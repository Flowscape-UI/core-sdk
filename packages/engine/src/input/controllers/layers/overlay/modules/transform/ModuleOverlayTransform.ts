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
import type { IHandleFocus } from "../../../../../../scene/layers/overlay/handles/shape";

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

    public isBlockingHover(screenPoint: Point): boolean {
        if (!this._context) {
            return false;
        }

        const { overlay } = this._context;

        if (!overlay.isEnabled()) {
            return false;
        }

        const modules = this._moduleManager.getAll();

        for (let i = modules.length - 1; i >= 0; i -= 1) {
            const module = modules[i];

            if (!module) {
                continue;
            }

            // Position (move) handle is pass-through for node hover.
            if (module.id === "overlay-transform-move") {
                continue;
            }

            if (!module.hasNode()) {
                continue;
            }

            if (module.hitTest(screenPoint)) {
                return true;
            }
        }

        return false;
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

            const clickSelectNode = this._consumeMoveClickSelectNode(activeModule);

            if (clickSelectNode) {
                const modulesChanged = this._setNodeForAllModules(clickSelectNode);
                const transformChanged = this._setNodeForTransformHandle(clickSelectNode);

                if (modulesChanged || transformChanged) {
                    this._context.emitChange();
                }
            }
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

    // Handle interaction has higher priority than node switching on click.
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

    if (hoveredNode && currentNodeId !== hoveredNode.id) {
        const modulesChanged = this._setNodeForAllModules(hoveredNode);
        const transformChanged = this._setNodeForTransformHandle(hoveredNode);

        if (modulesChanged || transformChanged) {
            this._context.emitChange();
        }

        return;
    }

    if (!hoveredNode) {
        const modulesChanged = this._clearAllModules();
        const transformChanged = this._clearTransformHandleNode();

        if (modulesChanged || transformChanged) {
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

    private _consumeMoveClickSelectNode(module: IOverlayTransformSubModule): IShapeBase | null {
        if (module.id !== "overlay-transform-move") {
            return null;
        }

        const candidate = module as {
            consumeClickSelectNode?: () => IShapeBase | null;
        };

        if (typeof candidate.consumeClickSelectNode !== "function") {
            return null;
        }

        return candidate.consumeClickSelectNode();
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

    private _setNodeForTransformHandle(node: IShapeBase): boolean {
        const handle = this._getTransformHandle();

        if (!handle) {
            return false;
        }

        const currentNodeId = handle.getNode()?.id ?? null;
        if (currentNodeId === node.id) {
            return false;
        }

        handle.setNode(node);
        handle.setEnabled(true);
        return true;
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

    private _clearTransformHandleNode(): boolean {
        const handle = this._getTransformHandle();

        if (!handle || !handle.hasNode()) {
            return false;
        }

        handle.clearNode();
        handle.setEnabled(false);
        return true;
    }

    private _getTransformHandle(): IHandleFocus | null {
        if (!this._context) {
            return null;
        }

        const handle = this._context.overlay.handleManager.getById("focus");

        if (!handle || typeof handle !== "object") {
            return null;
        }

        const candidate = handle as Partial<IHandleFocus>;

        if (
            typeof candidate.getNode !== "function" ||
            typeof candidate.setNode !== "function" ||
            typeof candidate.hasNode !== "function" ||
            typeof candidate.clearNode !== "function" ||
            typeof candidate.setEnabled !== "function"
        ) {
            return null;
        }

        return candidate as IHandleFocus;
    }

    private _getStagePointerFromInput(): Point {
        const stage = this._context!.stage;

        return Input.pointerToSurfacePoint(stage.container(), {
            width: stage.width(),
            height: stage.height(),
        });
    }
}
