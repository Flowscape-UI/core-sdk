import { CoreEngine, LogoPlugin, SelectionPlugin } from '@flowscape-ui/core-sdk';
import logoUrl from './images/logo.png';
import { CameraHotkeysPlugin } from '../../src/plugins/CameraHotkeysPlugin';

const logoPlugin = new LogoPlugin({
  src: logoUrl,
  width: 330,
  height: 330,
  opacity: 0.5,
});

const hotkeys = new CameraHotkeysPlugin({});

const selection = new SelectionPlugin({
  // selectablePredicate: (node) => {
  //   const cls = node.getClassName();
  //   return cls === 'Text';
  // },
});

// selection.setOptions({
//   selectablePredicate: (node) => {
//     const cls = node.getClassName();
//     return cls === 'Rect';
//   },
// });

const core = new CoreEngine({
  container: document.querySelector('#app')!,
  plugins: [logoPlugin, hotkeys, selection],
});

const onNodeRemoved = (node: unknown) => {
  console.log('node removed', node);
};

core.eventBus.once('node:removed', onNodeRemoved);

const text = core.nodes.addText({
  x: 200,
  y: 150,
  text: 'Hello, Flowscape!',
  fontSize: 120,
  fill: '#ffcc00',
  align: 'center',
  padding: 10,
});

console.log(text);

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

console.log(core.nodes.list(), '??');

// console.log(rect2.setFill('green').setCornerRadius(120000).setSize({ width: 120, height: 120 }));

setTimeout(() => {
  core.nodes.remove(rect);
  core.eventBus.off('node:removed', onNodeRemoved);
}, 5000);
