import type {
    IRenderable,
    IUpdatable
} from "../core/interfaces";
import type { IRendererHost } from "../renderer/hosts";

export class ManagerRenderHost implements IRenderable, IUpdatable {
    private readonly _hosts: IRendererHost[] = [];
    private readonly _hostsById = new Map<number, IRendererHost>();

    public add(host: IRendererHost): void {
        const id = Number(host.id);
        if (this._hostsById.has(id)) {
            throw new Error(`Render host "${id}" already exists.`);
        }

        this._hosts.push(host);
        this._hostsById.set(id, host);
    }

    public remove(id: number): boolean {
        const host = this._hostsById.get(id);

        if (!host) {
            return false;
        }

        this._hostsById.delete(id);

        const index = this._hosts.indexOf(host);
        if (index !== -1) {
            this._hosts.splice(index, 1);
        }

        return true;
    }

    public getAll(): readonly IRendererHost[] {
        return this._hosts;
    }

    public getById(id: number): IRendererHost | null {
        return this._hostsById.get(id) ?? null;
    }

    public update(): void {
        for (const host of this._hosts) {
            host.update();
        }
    }

    public render(): void {
        for (const host of this._hosts) {
            host.render();
        }
    }
}
