import { CoreEngine, LogoPlugin } from '@flowscape-ui/core-sdk';
import logoUrl from './images/logo.png';
import { CameraHotkeysPlugin } from '../../src/plugins/CameraHotkeysPlugin';

const logoPlugin = new LogoPlugin({
  src: logoUrl,
  width: 330,
  height: 330,
  opacity: 0.5,
});

const hotkeys = new CameraHotkeysPlugin({});

const core = new CoreEngine({
  container: document.querySelector('#app')!,
  plugins: [logoPlugin, hotkeys],
});

const onNodeRemoved = (node: unknown) => {
  console.log('node removed', node);
};

core.eventBus.on('node:removed', onNodeRemoved);

const rect = core.nodes.addShape({
  x: 500,
  y: 250,
  width: 200,
  height: 120,
  fill: 'skyblue',
  stroke: 'red',
  strokeWidth: 4,
});

const rect2 = core.nodes.addShape({
  width: 200,
  height: 120,
  fill: 'skyblue',
  stroke: 'red',
  strokeWidth: 4,
});

rect2.setCornerRadius(20);

rect.setFill('orange');

rect.setPosition({ x: 900, y: 500 });

rect2.setPosition({ x: 1500, y: 550 });

// console.log(rect2.setFill('green').setCornerRadius(120000).setSize({ width: 120, height: 120 }));

setTimeout(() => {
  core.nodes.remove(rect);
  core.eventBus.off('node:removed', onNodeRemoved);
}, 5000);
