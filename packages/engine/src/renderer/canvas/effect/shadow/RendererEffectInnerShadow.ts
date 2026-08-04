import Konva from "konva";
import { EffectShadow } from "../../../effect";
import { EffectType } from "../../../../nodes/shape/effect";

const INNER_SHADOW_GROUP_NAME = "effect-inner-shadow-group";

export class RendererEffectInnerShadow {
	public readonly type: EffectType;

	private readonly _effect: EffectShadow;
	private readonly _view: Konva.Group;
	private readonly _holeShape: Konva.Shape;

	constructor(effect: EffectShadow, holeShape: Konva.Shape) {
		this.type = EffectType.InnerShadow;
		this._effect = effect;

		this._view = new Konva.Group({
			name: INNER_SHADOW_GROUP_NAME,
			listening: false,
			visible: false,
		});

		this._holeShape = holeShape.clone() as Konva.Shape;

		this._holeShape.listening(false);
	}

	public getHoleShape(): Konva.Shape {
		return this._holeShape;
	}

	public getView(): Konva.Group {
		return this._view;
	}

	public mount(parent: Konva.Group): void {
		parent.add(this._view);
	}

	public update(): void {
		/*
		 * Inner shadow rendering is temporarily disabled.
		 *
		 * Keep the renderer contract intact so effects can
		 * continue creating, mounting, updating and destroying
		 * this renderer without breaking the scene.
		 */
		void this._effect;

		this._view.visible(false);
	}

	public clear(): void {
		this._view.visible(false);
	}

	public destroy(): void {
		this._holeShape.destroy();
		this._view.destroy();
	}
}
