
import type { ID } from "../../../../../core/types";
import type { IShapeBase } from "../../../../../nodes";
import type { IHandleHover } from "./types";

export class HandleHover implements IHandleHover {
    public static readonly TYPE = "hover";

    private _enabled: boolean;
    private _node: IShapeBase | null;

    constructor() {
        this._enabled = true;
        this._node = null;
    }

    /**
     * Returns handler type.
     *
     * Возвращает тип хендлера.
     */
    public getType(): string {
        return HandleHover.TYPE;
    }

    /**
     * Returns whether handler is enabled.
     *
     * Возвращает, включён ли хендлер.
     */
    public isEnabled(): boolean {
        return this._enabled;
    }

    /**
     * Enables or disables handler.
     *
     * Включает или выключает хендлер.
     */
    public setEnabled(value: boolean): void {
        if (this._enabled === value) {
            return;
        }

        this._enabled = value;
    }

    /**
     * Returns hovered node.
     *
     * Возвращает hover-ноду.
     */
    public getNode(): IShapeBase | null {
        return this._node;
    }

    /**
     * Returns hovered node id.
     *
     * Возвращает id hover-ноды.
     */
    public getNodeId(): ID | null {
        return this._node?.id ?? null;
    }

    /**
     * Returns true if hovered node exists.
     *
     * Возвращает true, если hover-нода существует.
     */
    public hasNode(): boolean {
        return this._node !== null;
    }

    /**
     * Sets hovered node.
     *
     * Устанавливает hover-ноду.
     */
    public setNode(node: IShapeBase | null): void {
        if (this._node?.id === node?.id) {
            return;
        }

        this._node = node;
    }

    /**
     * Clears hovered node.
     *
     * Очищает hover-ноду.
     */
    public clearNode(): void {
        if (this._node === null) {
            return;
        }

        this._node = null;
    }

    /**
     * Clears handler runtime state.
     *
     * Очищает runtime-состояние хендлера.
     */
    public clear(): void {
        this._node = null;
    }

    /**
     * Destroys handler.
     *
     * Уничтожает хендлер.
     */
    public destroy(): void {
        this.clear();
        this._enabled = false;
    }
}