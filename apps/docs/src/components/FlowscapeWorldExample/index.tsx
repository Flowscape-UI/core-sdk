import { useEffect, useRef } from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";
import styles from "./styles.module.css";
import {
	Scene,
	NodeRect,
	LayerWorld,
	RendererLayerWorldCanvas,
	CanvasRendererHost,
	LayerWorldInputController,
} from "@flowscape-ui/core-sdk";

type FlowscapeWorldExampleProps = {
	height?: number | string;
};

function FlowscapeWorldExampleInner({
	height,
}: Required<FlowscapeWorldExampleProps>) {
	const mountRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const mount = mountRef.current;
		if (!mount) {
			return;
		}

		const scene = new Scene(mount.clientWidth, mount.clientHeight);
		const layerWorld = new LayerWorld();
		scene.addLayer(layerWorld);

		const worldRenderer = new RendererLayerWorldCanvas();
		scene.bindLayerRenderer(layerWorld, worldRenderer);

		const host = new CanvasRendererHost(mount, -1);
		scene.addHost(host);

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
			emitChange: () => {
				scene.invalidate();
			},
		});

		const node = new NodeRect(1);
		node.setSize(220, 140);
		node.setPosition(0, 0);
		layerWorld.addNode(node);

		layerWorld.camera.setScale(0.95);
		scene.invalidate();

		const resizeObserver = new ResizeObserver(() => {
			scene.setSize(mount.clientWidth, mount.clientHeight);
			scene.invalidate();
		});
		resizeObserver.observe(mount);

		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
		};
		mount.addEventListener("wheel", onWheel, { passive: false });

		return () => {
			resizeObserver.disconnect();
			mount.removeEventListener("wheel", onWheel);
			scene.inputManager.remove(worldInputController.id);
			scene.removeHost(-1);
		};
	}, []);

	return (
		<div className={styles.exampleRoot} style={{ height }}>
			<div ref={mountRef} className={styles.exampleMount} />
		</div>
	);
}

export default function FlowscapeWorldExample({
	height = 320,
}: FlowscapeWorldExampleProps) {
	return (
		<BrowserOnly>
			{() => <FlowscapeWorldExampleInner height={height} />}
		</BrowserOnly>
	);
}
