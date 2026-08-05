import Konva from "konva";

import type { IShapeBase } from "../../../../nodes";
import type { IRendererNodeCanvas } from "./types";

const DEBUG_LAYER_NAME = "debug-layer";
const DEBUG_BOUNDS_NAME = "debug-bounds";
const DEBUG_PIVOT_NAME = "debug-pivot";
const DEBUG_PIVOT_ORBIT_NAME = "debug-orbit";

const DEBUG_AABB_NAME = "debug-aabb";
const DEBUG_WORLD_LAYER_NAME = "debug-world-layer";
const DEBUG_VIEW_BOUNDS_NAME = "debug-view-bounds";

export abstract class RendererCanvasBase<
	TNode extends IShapeBase = IShapeBase,
	TView extends Konva.Group = Konva.Group,
> implements IRendererNodeCanvas<TNode, TView> {
	public static DEBUG_OBB = false;
	public static DEBUG_AABB = false;
	public static DEBUG_ORBIT = false;
	public static DEBUG_PIVOT = false;
	public static DEBUG_VIEW_BOUNDS = false;

	private readonly _worldDebugLayers = new WeakMap<TView, Konva.Group>();
	
	public update(node: TNode, view: TView): void {
		this._updateIdentity(node, view);
		this._updateVisibility(node, view);
		this._updateOpacity(node, view);
		this._updateTransform(node, view);
		this._updateDebug(node, view);
		this.onUpdate(node, view);
	}
	
	public destroy(node: TNode, view: TView): void {
		try {
			this.onDestroy(node, view);
		} finally {
			this._destroyDebugLayers(view);
		}
	}
	
	public abstract create(node: TNode): TView;
	protected abstract onUpdate(node: TNode, view: TView): void;

	protected onDestroy(node: TNode, view: TView): void {
		void node;
		void view;
	}

	/*****************************************************************/
	/*                            Common                             */
	/*****************************************************************/

	protected _updateIdentity(node: TNode, view: Konva.Group): void {
		view.id(String(node.id));
	}

	protected _updateVisibility(node: TNode, view: Konva.Group): void {
		view.visible(node.isVisible());
	}

	protected _updateOpacity(node: TNode, view: Konva.Group): void {
		view.opacity(node.getOpacity());
	}

	/*****************************************************************/
	/*                           Transform                           */
	/*****************************************************************/
	protected _updateTransform(node: TNode, view: Konva.Group): void {
		const position = node.getPosition();
		const scale = node.getScale();
		const pivot = node.getPivot();
		const bounds = node.getLocalOBB();

		view.x(position.x);
		view.y(position.y);

		view.rotation(node.getRotation());

		view.scaleX(scale.x);
		view.scaleY(scale.y);

		view.offsetX(bounds.x + bounds.width * pivot.x);
		view.offsetY(bounds.y + bounds.height * pivot.y);
	}

	protected _findOneOrThrow<T extends Konva.Node>(
		view: Konva.Container,
		selector: string,
	): T {
		const child = view.findOne<T>(selector);

		if (!child) {
			throw new Error(`Konva node "${selector}" was not found.`);
		}

		return child;
	}

	// Debug
	protected _updateDebug(node: TNode, view: TView): void {
		const hasLocalDebug =
			RendererCanvasBase.DEBUG_OBB ||
			RendererCanvasBase.DEBUG_ORBIT ||
			RendererCanvasBase.DEBUG_PIVOT ||
			RendererCanvasBase.DEBUG_VIEW_BOUNDS;

		if (!hasLocalDebug && !RendererCanvasBase.DEBUG_AABB) {
			this._hideDebugLayers(view);
			return;
		}

		if (hasLocalDebug) {
			const debugLayer = this._ensureDebugLayer(view);
			const bounds = node.getLocalOBB();
			const pivot = node.getPivot();

			const pivotX = bounds.x + bounds.width * pivot.x;
			const pivotY = bounds.y + bounds.height * pivot.y;

			// =========================
			// OBB (Local Bounds)
			// =========================
			const boundsShape = this._findOneOrThrow<Konva.Rect>(
				debugLayer,
				`.${DEBUG_BOUNDS_NAME}`,
			);
			boundsShape.visible(RendererCanvasBase.DEBUG_OBB);

			if (RendererCanvasBase.DEBUG_OBB) {
				boundsShape.setAttrs({
					x: bounds.x,
					y: bounds.y,
					width: bounds.width,
					height: bounds.height,
				});
			}

			// =========================
			// Pivot
			// =========================
			const pivotShape = this._findOneOrThrow<Konva.Circle>(
				debugLayer,
				`.${DEBUG_PIVOT_NAME}`,
			);
			pivotShape.visible(RendererCanvasBase.DEBUG_PIVOT);

			if (RendererCanvasBase.DEBUG_PIVOT) {
				pivotShape.position({
					x: pivotX,
					y: pivotY,
				});
			}

			// =========================
			// Orbit
			// =========================
			const orbit = this._findOneOrThrow<Konva.Circle>(
				debugLayer,
				`.${DEBUG_PIVOT_ORBIT_NAME}`,
			);
			orbit.visible(RendererCanvasBase.DEBUG_ORBIT);

			if (RendererCanvasBase.DEBUG_ORBIT) {
				const radius = this._getPivotOrbitRadius(
					bounds,
					pivotX,
					pivotY,
				);

				orbit.position({
					x: pivotX,
					y: pivotY,
				});

				orbit.radius(radius);
			}

			// =========================
			// View Bounds
			// =========================
			const viewBoundsShape = this._findOneOrThrow<Konva.Rect>(
				debugLayer,
				`.${DEBUG_VIEW_BOUNDS_NAME}`,
			);
			viewBoundsShape.visible(RendererCanvasBase.DEBUG_VIEW_BOUNDS);

			if (RendererCanvasBase.DEBUG_VIEW_BOUNDS) {
				const viewBounds = node.getLocalViewOBB();

				viewBoundsShape.setAttrs({
					x: viewBounds.x,
					y: viewBounds.y,
					width: viewBounds.width,
					height: viewBounds.height,
				});
			}

			debugLayer.visible(true);
			debugLayer.moveToTop();
		} else {
			view.findOne<Konva.Group>(`.${DEBUG_LAYER_NAME}`)?.visible(false);
		}

		if (RendererCanvasBase.DEBUG_AABB) {
			const worldDebugLayer = this._ensureWorldDebugLayer(node, view);
			const aabbShape = this._findOneOrThrow<Konva.Rect>(
				worldDebugLayer,
				`.${DEBUG_AABB_NAME}`,
			);
			const aabb = node.getWorldAABB();

			aabbShape.setAttrs({
				x: aabb.x,
				y: aabb.y,
				width: aabb.width,
				height: aabb.height,
			});
			aabbShape.visible(true);
			worldDebugLayer.visible(true);
			worldDebugLayer.moveToTop();
		} else {
			this._hideWorldDebugLayer(view);
		}
	}

	protected _ensureDebugLayer(view: Konva.Group): Konva.Group {
		let debugLayer = view.findOne<Konva.Group>(`.${DEBUG_LAYER_NAME}`);

		if (debugLayer) {
			return debugLayer;
		}

		debugLayer = new Konva.Group({
			name: DEBUG_LAYER_NAME,
			listening: false,
			visible: false,
		});

		debugLayer.add(
			new Konva.Rect({
				name: DEBUG_BOUNDS_NAME,
				listening: false,
				stroke: "#00A3FF",
				strokeWidth: 1,
				dash: [4, 4],
			}),
			new Konva.Circle({
				name: DEBUG_PIVOT_NAME,
				listening: false,
				radius: 4,
				fill: "#34C759",
			}),
			new Konva.Circle({
				name: DEBUG_PIVOT_ORBIT_NAME,
				listening: false,
				stroke: "#FFD60A",
				strokeWidth: 1,
				dash: [4, 4],
			}),
			new Konva.Rect({
				name: DEBUG_VIEW_BOUNDS_NAME,
				listening: false,
				stroke: "#30D158",
				strokeWidth: 1,
				dash: [4, 4],
			}),
		);

		view.add(debugLayer);
		return debugLayer;
	}

	protected _ensureWorldDebugLayer(node: TNode, view: TView): Konva.Group {
		const parent = view.getParent();

		if (!parent) {
			throw new Error(
				"View has no parent. Cannot create world debug layer.",
			);
		}

		const debugLayerName = `${DEBUG_WORLD_LAYER_NAME}-${node.id}`;
		const currentDebugLayer = this._worldDebugLayers.get(view);

		if (currentDebugLayer) {
			if (currentDebugLayer.getParent() === parent) {
				return currentDebugLayer;
			}

			currentDebugLayer.destroy();
			this._worldDebugLayers.delete(view);
		}

		const debugLayer = new Konva.Group({
			name: debugLayerName,
			listening: false,
			visible: false,
		});

		debugLayer.add(
			new Konva.Rect({
				name: DEBUG_AABB_NAME,
				listening: false,
				stroke: "#FF3B30",
				strokeWidth: 1,
				dash: [6, 4],
			}),
		);

		parent.add(debugLayer);
		this._worldDebugLayers.set(view, debugLayer);

		return debugLayer;
	}

	private _hideDebugLayers(view: TView): void {
		view.findOne<Konva.Group>(`.${DEBUG_LAYER_NAME}`)?.visible(false);
		this._hideWorldDebugLayer(view);
	}

	private _hideWorldDebugLayer(view: TView): void {
		const debugLayer = this._worldDebugLayers.get(view);

		if (!debugLayer) {
			return;
		}

		if (debugLayer.getParent() !== view.getParent()) {
			debugLayer.destroy();
			this._worldDebugLayers.delete(view);
			return;
		}

		debugLayer.visible(false);
	}

	private _destroyDebugLayers(view: TView): void {
		view.findOne<Konva.Group>(`.${DEBUG_LAYER_NAME}`)?.destroy();

		const worldDebugLayer = this._worldDebugLayers.get(view);

		if (!worldDebugLayer) {
			return;
		}

		worldDebugLayer.destroy();
		this._worldDebugLayers.delete(view);
	}

	private _getPivotOrbitRadius(
		bounds: { x: number; y: number; width: number; height: number },
		pivotX: number,
		pivotY: number,
	): number {
		const corners = [
			{ x: bounds.x, y: bounds.y },
			{ x: bounds.x + bounds.width, y: bounds.y },
			{ x: bounds.x + bounds.width, y: bounds.y + bounds.height },
			{ x: bounds.x, y: bounds.y + bounds.height },
		];

		let radius = 0;

		for (const corner of corners) {
			const dx = corner.x - pivotX;
			const dy = corner.y - pivotY;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance > radius) {
				radius = distance;
			}
		}

		return radius;
	}
}
