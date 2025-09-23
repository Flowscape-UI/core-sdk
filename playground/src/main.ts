import { CoreEngine } from '@flowscape-ui/core-sdk';

const core = new CoreEngine({
  container: document.querySelector('#app')!,
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

setTimeout(() => {
  core.nodes.remove(rect);
  core.eventBus.off('node:removed', onNodeRemoved);
}, 5000);
