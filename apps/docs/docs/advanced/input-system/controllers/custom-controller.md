---
sidebar_position: 4
title: Custom Controller
sidebar_label: Custom Controller
description: "Guide to implementing modular input controllers in Flowscape."
---

## Custom Controller

If you want your own advanced controller to stay consistent with engine architecture, build it like built-ins:

- controller extends `InputControllerBase`
- behavior is split into modules (`IInputModule<TContext>`)
- `scene.inputManager` injects one typed context into the whole controller

This is exactly how `LayerWorldInputController` is structured.

## Target Architecture

```text
Input (static state)
  -> InputControllerBase
    -> ModuleWorldZoom
    -> ModuleWorldPan
```

Controller owns lifecycle and module orchestration.  
Modules own concrete behavior.

## Step 1. Define typed context

```ts
import type { LayerWorld } from "@flowscape-ui/core-sdk";
import type { WorldInputOptions } from "@flowscape-ui/core-sdk";

export type WorldInputContext = {
	stage: IStage;
	world: LayerWorld;
	options: Required<WorldInputOptions>;
	emitChange: () => void;
};
```

Why this matters:

- `stage` gives screen-space dimensions and DOM rect
- `world` gives camera access
- `options` configures behavior without hardcoding
- `emitChange` triggers redraw after state changes

## Step 2. Define module contract alias

```ts
import type { IInputModule } from "@flowscape-ui/core-sdk";

export type IWorldInputModule = IInputModule<WorldInputContext>;
```

Now every module in this controller is guaranteed to use the same context shape.

## Step 3. Create controller class and compose modules

```ts
import {
	InputControllerBase,
	type IInputModule,
	type WorldInputOptions,
} from "@flowscape-ui/core-sdk";
import { ModuleWorldZoom, ModuleWorldPan } from "./modules";

export type WorldInputContext = {
	stage: IStage;
	world: LayerWorld;
	options: Required<WorldInputOptions>;
	emitChange: () => void;
};

export type IWorldInputModule = IInputModule<WorldInputContext>;

export class LayerWorldInputController extends InputControllerBase<
	WorldInputContext,
	IWorldInputModule
> {
	public readonly id = 0;

	constructor() {
		super();
		this.addModule(new ModuleWorldZoom());
		this.addModule(new ModuleWorldPan());
	}
}
```

What base class gives you automatically:

- `attach(target)` for controller and all modules
- `update()` loop for all modules
- `detach()` and `destroy()` cleanup for all modules
- module replacement by `id` via `addModule(...)`

## Step 4. Implement one module (real example)

`ModuleWorldZoom` focuses only on zoom behavior.

```ts
import {
	type IInputModule,
	type Point,
	Input,
	KeyCode,
	MouseButton,
} from "@flowscape-ui/core-sdk";
import type { WorldInputContext } from "./LayerWorldInputController";

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
		return this._context!.world.camera;
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

		const point = this._toStagePoint(Input.mousePosition);
		const factor =
			scroll.y > 0 ? 1 / options.zoomFactor : options.zoomFactor;

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

		const isActive =
			Input.ctrlPressed && Input.getMouseButton(MouseButton.Right);

		if (!isActive) {
			this._ctrlMouseZoomStartPoint = null;
			this._dragAccum = 0;
			return;
		}

		if (this._ctrlMouseZoomStartPoint === null) {
			const origin = Input.getMouseButtonPressOrigin(MouseButton.Right);
			this._ctrlMouseZoomStartPoint = this._toStagePoint(origin);
		}

		const dy = Input.mousePositionDelta.y;
		if (dy === 0) return;

		this._dragAccum += dy;
		const sensitivity = 4;
		const point = this._ctrlMouseZoomStartPoint;

		while (Math.abs(this._dragAccum) >= sensitivity) {
			const factor =
				this._dragAccum > 0
					? 1 / options.zoomFactor
					: options.zoomFactor;

			this._getCamera().zoomAtScreen(point, factor);
			this._dragAccum -= Math.sign(this._dragAccum) * sensitivity;
		}

		this._emitChange();
	}

	private _toStagePoint(client: Point): Point {
		const stage = this._context!.stage;
		const rect = stage.container().getBoundingClientRect();

		const stageWidth = stage.width() || 1;
		const stageHeight = stage.height() || 1;

		const scaleX = rect.width > 0 ? rect.width / stageWidth : 1;
		const scaleY = rect.height > 0 ? rect.height / stageHeight : 1;

		return {
			x: (client.x - rect.left) / scaleX,
			y: (client.y - rect.top) / scaleY,
		};
	}
}
```

## Module responsibilities in this example

| Part                        | Responsibility                                    |
| --------------------------- | ------------------------------------------------- |
| `attach(context)`           | Receives typed runtime context.                   |
| `detach()`                  | Clears context and temporary zoom state.          |
| `update()`                  | Runs all zoom strategies per frame.               |
| `_updateCtrlWheelZoom()`    | Ctrl+wheel zoom anchored at cursor position.      |
| `_updateZoomFromKeyboard()` | Ctrl+`+` and Ctrl+`-` zoom at stage center.       |
| `_updateCtrlMouseZoom()`    | Ctrl+RMB drag zoom with sensitivity accumulator.  |
| `_toStagePoint(...)`        | Converts client coordinates to stage coordinates. |

## Step 5. Register controller in scene

```ts
const worldInputController = new LayerWorldInputController();

scene.inputManager.add(layerWorld, worldInputController, {
	stage: host.getRenderNode(),
	world: layerWorld,
	options: {
		enabled: true,
		panMode: "right",
		zoomEnabled: true,
		zoomFactor: 1.08,
		preventWheelDefault: true,
		keyboardPanSpeed: 900,
		keyboardPanShiftMultiplier: 1.5,
	},
	emitChange: () => scene.invalidate(),
});
```

## Step 6. Cleanup

```ts
scene.inputManager.remove(worldInputController.id);
```

## Practical rules

- Keep one module for one interaction responsibility.
- Keep module ids stable and unique.
- Reset module temporary state in `detach()`.
- Use context options instead of hardcoded behavior flags.
- Call `emitChange()` only when visible state changes.

## Next

- [Nodes Overview](../../nodes/overview)
