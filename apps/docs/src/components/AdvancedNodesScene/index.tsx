import { useEffect, useRef } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import clsx from 'clsx';
import styles from './styles.module.css';
import {
  Scene,
  NodeRect,
  LayerWorld,
  RendererLayerWorldCanvas,
  CanvasRendererHost,
  LayerWorldInputController,
} from '@flowscape-ui/core-sdk';

type AdvancedNodesSceneProps = {
  className?: string;
  height?: number | string;
};

function AdvancedNodesSceneInner({
  className,
  height,
}: Required<AdvancedNodesSceneProps>) {
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
        panMode: 'right',
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

    const rect = new NodeRect(0);
    layerWorld.addNode(rect);

    const camera = layerWorld.camera;
    camera.setPosition(0, 0);
    camera.setScale(1);
    scene.invalidate();

    const resizeObserver = new ResizeObserver(() => {
      scene.setSize(mount.clientWidth, mount.clientHeight);
      scene.invalidate();
    });
    resizeObserver.observe(mount);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
    };
    mount.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      resizeObserver.disconnect();
      mount.removeEventListener('wheel', onWheel);
      scene.inputManager.remove(worldInputController.id);
      scene.removeHost(-1);
    };
  }, []);

  return (
    <div className={clsx(styles.root, className)} style={{ height }}>
      <div ref={mountRef} className={styles.mount} />
    </div>
  );
}

export default function AdvancedNodesScene({
  className = '',
  height = 420,
}: AdvancedNodesSceneProps) {
  return (
    <BrowserOnly>
      {() => (
        <AdvancedNodesSceneInner className={className} height={height} />
      )}
    </BrowserOnly>
  );
}

