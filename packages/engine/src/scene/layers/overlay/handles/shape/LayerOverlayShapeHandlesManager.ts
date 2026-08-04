import type { ID } from "../../../../../core/types";
import type { IHandleBase } from "../base";
import type { ILayerOverlayHandle } from "../types";
import { LayerOverlayHandleManager } from "../LayerOverlayHandlesManager";
import { HandleCornerRadius } from "./corner-radius";
import { HandleFocus } from "./focus";
import { HandleHover } from "./hover";

export class LayerOverlayShapeHandlesManager {
	private readonly _handles = new Map<ID, IHandleBase>();

	private readonly _registeredTargets =
		new Set<LayerOverlayHandleManager>();

	private _cornerRadiusHandleCount = 0;

	constructor() {
		this._registerDefaults();
	}

	public getById(id: ID): ILayerOverlayHandle | null {
		return this._handles.get(id) ?? null;
	}

	public getAll(): ILayerOverlayHandle[] {
		return [...this._handles.values()];
	}

	public registerTo(
		target: LayerOverlayHandleManager,
	): void {
		this._registeredTargets.add(target);

		for (const [id, handle] of this._handles) {
			target.add(id, handle);
		}
	}

	public ensureCornerRadiusHandleCount(
		count: number,
	): void {
		const targetCount = Math.max(
			0,
			Math.floor(count),
		);

		while (
			this._cornerRadiusHandleCount <
			targetCount
		) {
			const index =
				this._cornerRadiusHandleCount;

			const id =
				`corner-radius-${index}`;

			const handle =
				new HandleCornerRadius(index);

			this._add(id, handle);

			for (
				const target of
					this._registeredTargets
			) {
				target.add(id, handle);
			}

			this._cornerRadiusHandleCount += 1;
		}
	}

	private _add(
		id: ID,
		handle: IHandleBase,
	): void {
		if (this._handles.has(id)) {
			throw new Error(
				`Overlay shape handler with id "${id}" is already added.`,
			);
		}

		this._handles.set(id, handle);
	}

	private _registerDefaults(): void {
		this._add(
			"hover",
			new HandleHover(),
		);

		this._add(
			"focus",
			new HandleFocus(),
		);
	}
}