import type { IScene } from "./types";
import type {
    IAttachable,
    IDestroyable,
    IRenderable,
    IUpdatable
} from "../core/interfaces";
import type { IRendererHost } from "../renderer/hosts";
import { Input } from "../input";

export class ManagerRenderHost implements IAttachable<IScene>, IRenderable, IUpdatable, IDestroyable {
    private readonly _hosts: IRendererHost[] = [];
    private readonly _hostsById = new Map<number, IRendererHost>();
    private readonly _scene: IScene;

    constructor(scene: IScene) {
        this._scene = scene;
    }

    public add(host: IRendererHost): void {
        this.detach();
        const id = Number(host.id);
        if (this._hostsById.has(id)) {
            throw new Error(`Render host "${id}" already exists.`);
        }

        Input._registerSurface(host.getSurface());
        this._hosts.push(host);
        this._hostsById.set(id, host);
        this.attach();
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

        Input._unregisterSurface(host.getSurface());
        host.detach();
        host.destroy();

        return true;
    }

    public getAll(): readonly IRendererHost[] {
        return this._hosts;
    }

    public getById(id: number): IRendererHost | null {
        return this._hostsById.get(id) ?? null;
    }

    public attach(): void {
        this.detach();
        for (const host of this._hosts) {
            host.attach(this._scene);
        }
    }

    public detach(): void {
        for (const host of this._hosts) {
            host.detach();
        }
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

    public destroy(): void {
        for (const host of this._hosts) {
            host.detach();
            host.destroy();
        }

        this._hosts.length = 0;
        this._hostsById.clear();
    }
}