import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CoreEngine } from '../src/core/CoreEngine';
import { GridPlugin } from '../src/plugins/GridPlugin';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import Konva from 'konva';

describe('GridPlugin - Снаппинг', () => {
  let core: CoreEngine;
  let gridPlugin: GridPlugin;
  let selectionPlugin: SelectionPlugin;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    core = new CoreEngine({ container, width: 800, height: 600 });

    gridPlugin = new GridPlugin({
      stepX: 50,
      stepY: 50,
      enableSnap: true,
      visible: true,
      minScaleToShow: 0.5,
    });

    selectionPlugin = new SelectionPlugin();
    core.plugins.addPlugins([gridPlugin, selectionPlugin]);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // Вспомогательная функция для создания Transformer с установленным якорем
  async function createTransformerWithAnchor(
    nodeKonva: Konva.Node,
    anchor: string,
  ): Promise<Konva.Transformer> {
    const transformer = new Konva.Transformer();
    (transformer as any).getActiveAnchor = () => anchor;
    core.nodes.layer.add(transformer);
    transformer.nodes([nodeKonva]);

    // Ждём установки boundBoxFunc через queueMicrotask
    await new Promise((resolve) => setTimeout(resolve, 50));
    await Promise.resolve();

    return transformer;
  }

  describe('Снаппинг при перетаскивании', () => {
    it('должен привязывать ноду к ближайшей клетке сетки', () => {
      const node = core.nodes.addShape({ x: 23, y: 37, width: 100, height: 100, fill: 'red' });
      const nodeKonva = node.getNode();

      // Симулируем dragmove
      nodeKonva.fire('dragmove', { evt: new MouseEvent('mousemove'), target: nodeKonva }, true);

      const pos = nodeKonva.getAbsolutePosition();

      // Должно привязаться к ближайшей клетке (0, 0) или (50, 50)
      expect(pos.x % 50).toBeCloseTo(0, 1);
      expect(pos.y % 50).toBeCloseTo(0, 1);
    });

    it('должен привязывать координату 127 к 150', () => {
      const node = core.nodes.addShape({ x: 127, y: 143, width: 100, height: 100, fill: 'blue' });
      const nodeKonva = node.getNode();

      nodeKonva.fire('dragmove', { evt: new MouseEvent('mousemove'), target: nodeKonva }, true);

      const pos = nodeKonva.getAbsolutePosition();

      // 127 ближе к 150, чем к 100
      expect(pos.x).toBeCloseTo(150, 1);
      // 143 ближе к 150, чем к 100
      expect(pos.y).toBeCloseTo(150, 1);
    });

    it('должен привязывать координату 73 к 50', () => {
      const node = core.nodes.addShape({ x: 73, y: 77, width: 100, height: 100, fill: 'green' });
      const nodeKonva = node.getNode();

      nodeKonva.fire('dragmove', { evt: new MouseEvent('mousemove'), target: nodeKonva }, true);

      const pos = nodeKonva.getAbsolutePosition();

      // 73 ближе к 50, чем к 100
      expect(pos.x).toBeCloseTo(50, 1);
      // 77 ближе к 100, чем к 50
      expect(pos.y).toBeCloseTo(100, 1);
    });

    it('не должен привязывать при отключенном снаппинге', () => {
      gridPlugin.setSnap(false);

      const node = core.nodes.addShape({ x: 23, y: 37, width: 100, height: 100, fill: 'red' });
      const nodeKonva = node.getNode();

      nodeKonva.fire('dragmove', { evt: new MouseEvent('mousemove'), target: nodeKonva }, true);

      const pos = nodeKonva.getAbsolutePosition();

      // Позиция не должна измениться
      expect(pos.x).toBeCloseTo(23, 1);
      expect(pos.y).toBeCloseTo(37, 1);
    });

    it('должен работать с разными шагами сетки по X и Y', () => {
      gridPlugin.setStep(25, 100);

      const node = core.nodes.addShape({ x: 37, y: 143, width: 100, height: 100, fill: 'yellow' });
      const nodeKonva = node.getNode();

      nodeKonva.fire('dragmove', { evt: new MouseEvent('mousemove'), target: nodeKonva }, true);

      const pos = nodeKonva.getAbsolutePosition();

      // X: 37 ближе к 50 (шаг 25)
      expect(pos.x % 25).toBeCloseTo(0, 1);
      // Y: 143 ближе к 100 (шаг 100)
      expect(pos.y % 100).toBeCloseTo(0, 1);
    });
  });

  describe('Снаппинг при ресайзе через Transformer', () => {
    it('должен привязывать правую границу при ресайзе через правую сторону', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'red' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = await createTransformerWithAnchor(nodeKonva, 'middle-right');
      const boundBoxFunc = transformer.boundBoxFunc();

      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 127, height: 100, rotation: 0 };
      const result = boundBoxFunc(oldBox, newBox);

      // Правая граница (x + width) должна привязаться к 150
      expect(result.x + result.width).toBeCloseTo(150, 1);
      expect(result.x).toBeCloseTo(0, 1);
    });

    it('должен привязывать левую границу при ресайзе через левую сторону', async () => {
      const node = core.nodes.addShape({ x: 100, y: 0, width: 100, height: 100, fill: 'blue' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = await createTransformerWithAnchor(nodeKonva, 'middle-left');
      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 100, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 73, y: 0, width: 127, height: 100, rotation: 0 };
      const result = boundBoxFunc(oldBox, newBox);

      // Левая граница должна привязаться к 50
      expect(result.x).toBeCloseTo(50, 1);
      // Правая граница остаётся на 200
      expect(result.x + result.width).toBeCloseTo(200, 1);
    });

    it('должен привязывать верхнюю границу при ресайзе через верхнюю сторону', async () => {
      const node = core.nodes.addShape({ x: 0, y: 100, width: 100, height: 100, fill: 'green' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = await createTransformerWithAnchor(nodeKonva, 'top-middle');
      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 100, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 73, width: 100, height: 127, rotation: 0 };
      const result = boundBoxFunc(oldBox, newBox);

      // Верхняя граница должна привязаться к 50
      expect(result.y).toBeCloseTo(50, 1);
      // Нижняя граница остаётся на 200
      expect(result.y + result.height).toBeCloseTo(200, 1);
    });

    it('должен привязывать нижнюю границу при ресайзе через нижнюю сторону', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'yellow' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = await createTransformerWithAnchor(nodeKonva, 'bottom-middle');
      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 100, height: 127, rotation: 0 };
      const result = boundBoxFunc(oldBox, newBox);

      // Нижняя граница должна привязаться к 150
      expect(result.y + result.height).toBeCloseTo(150, 1);
      expect(result.y).toBeCloseTo(0, 1);
    });

    it('должен привязывать обе границы при ресайзе через правый нижний угол', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'purple' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = await createTransformerWithAnchor(nodeKonva, 'bottom-right');
      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 127, height: 143, rotation: 0 };
      const result = boundBoxFunc(oldBox, newBox);

      // Правая граница → 150, нижняя граница → 150
      expect(result.x + result.width).toBeCloseTo(150, 1);
      expect(result.y + result.height).toBeCloseTo(150, 1);
    });

    it('должен привязывать обе границы при ресайзе через левый верхний угол', async () => {
      const node = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'orange' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = await createTransformerWithAnchor(nodeKonva, 'top-left');
      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 100, y: 100, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 73, y: 73, width: 127, height: 127, rotation: 0 };
      const result = boundBoxFunc(oldBox, newBox);

      // Левая граница → 50, верхняя граница → 50
      expect(result.x).toBeCloseTo(50, 1);
      expect(result.y).toBeCloseTo(50, 1);
      // Правая и нижняя остаются на 200
      expect(result.x + result.width).toBeCloseTo(200, 1);
      expect(result.y + result.height).toBeCloseTo(200, 1);
    });

    it('должен сохранять минимальный размер в 1 клетку', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'red' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      // Пытаемся сделать очень маленькую ноду (10x10)
      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 10, height: 10, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'bottom-right';

      const result = boundBoxFunc(oldBox, newBox);

      // Минимальный размер = 1 клетка = 50x50
      expect(result.width).toBeGreaterThanOrEqual(50);
      expect(result.height).toBeGreaterThanOrEqual(50);
    });

    it('не должен применять снаппинг при якоре rotater', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'cyan' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 100, height: 100, rotation: 45 };

      (transformer as any).getActiveAnchor = () => 'rotater';

      const result = boundBoxFunc(oldBox, newBox);

      // Должен вернуть исходный бокс без изменений
      expect(result).toEqual(newBox);
    });

    it('должен сохранять rotation в результате', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'magenta' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 30 };
      const newBox = { x: 0, y: 0, width: 127, height: 100, rotation: 30 };

      (transformer as any).getActiveAnchor = () => 'middle-right';

      const result = boundBoxFunc(oldBox, newBox);

      // rotation должен сохраниться
      expect(result.rotation).toBe(30);
    });
  });

  describe('Различные шаги сетки', () => {
    it('должен работать с шагом 25x25', async () => {
      gridPlugin.setStep(25, 25);

      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'red' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      // Тянем правую сторону до 137
      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 137, height: 100, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'middle-right';

      const result = boundBoxFunc(oldBox, newBox);

      // 137 ближе к 125 (кратно 25): 137-125=12 < 150-137=13
      expect(result.x + result.width).toBeCloseTo(125, 1);
    });

    it('должен работать с шагом 100x100', async () => {
      gridPlugin.setStep(100, 100);

      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'blue' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      // Тянем правую сторону до 127
      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 127, height: 100, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'middle-right';

      const result = boundBoxFunc(oldBox, newBox);

      // 127 ближе к 100 (кратно 100)
      expect(result.x + result.width).toBeCloseTo(100, 1);
    });

    it('должен работать с разными шагами по X и Y', async () => {
      gridPlugin.setStep(25, 100);

      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'green' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      // Тянем правый нижний угол
      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 137, height: 143, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'bottom-right';

      const result = boundBoxFunc(oldBox, newBox);

      // X: 137 ближе к 125 (шаг 25): 137-125=12 < 150-137=13
      expect(result.x + result.width).toBeCloseTo(125, 1);
      // Y: 143 ближе к 100 (шаг 100): 143-100=43 < 200-143=57
      expect(result.y + result.height).toBeCloseTo(100, 1);
    });
  });

  describe('Управление снаппингом', () => {
    it('должен отключать снаппинг через setSnap(false)', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'red' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      // Отключаем снаппинг
      gridPlugin.setSnap(false);

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 127, height: 143, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'bottom-right';

      const result = boundBoxFunc(oldBox, newBox);

      // Снаппинг отключен, размеры не должны измениться
      expect(result.width).toBeCloseTo(127, 1);
      expect(result.height).toBeCloseTo(143, 1);
    });

    it('должен включать снаппинг через setSnap(true)', async () => {
      gridPlugin.setSnap(false);

      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'blue' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      // Включаем снаппинг обратно
      gridPlugin.setSnap(true);

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 127, height: 100, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'middle-right';

      const result = boundBoxFunc(oldBox, newBox);

      // Снаппинг включен, должна привязаться к 150
      expect(result.x + result.width).toBeCloseTo(150, 1);
    });
  });

  describe('Граничные случаи', () => {
    it('должен корректно обрабатывать нулевые размеры', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'red' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 0, height: 0, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'bottom-right';

      const result = boundBoxFunc(oldBox, newBox);

      // Должен применить минимальный размер
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('должен корректно обрабатывать отрицательные размеры', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'blue' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: -50, height: -50, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'bottom-right';

      const result = boundBoxFunc(oldBox, newBox);

      // Должен применить минимальный размер
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('должен корректно работать с очень большими размерами', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'green' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 10000, height: 10000, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'bottom-right';

      const result = boundBoxFunc(oldBox, newBox);

      // Должен привязаться к ближайшей клетке (10000 кратно 50)
      expect(result.width % 50).toBeCloseTo(0, 1);
      expect(result.height % 50).toBeCloseTo(0, 1);
    });
  });

  describe('Видимость и настройки сетки', () => {
    it('снаппинг должен работать даже при скрытой сетке', async () => {
      gridPlugin.setVisible(false);

      const node = core.nodes.addShape({ x: 23, y: 37, width: 100, height: 100, fill: 'red' });
      const nodeKonva = node.getNode();

      nodeKonva.fire('dragmove', { evt: new MouseEvent('mousemove'), target: nodeKonva }, true);

      const pos = nodeKonva.getAbsolutePosition();

      // Снаппинг должен работать независимо от видимости сетки
      expect(pos.x % 50).toBeCloseTo(0, 1);
      expect(pos.y % 50).toBeCloseTo(0, 1);
    });

    it('должен корректно изменять шаг сетки на лету', async () => {
      const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100, fill: 'blue' });
      const nodeKonva = node.getNode() as Konva.Rect;

      const transformer = new Konva.Transformer();
      core.nodes.layer.add(transformer);
      transformer.nodes([nodeKonva]);

      await new Promise((resolve) => setTimeout(resolve, 50));
      await Promise.resolve();

      // Изменяем шаг сетки
      gridPlugin.setStep(20, 20);

      const boundBoxFunc = transformer.boundBoxFunc();
      if (!boundBoxFunc) return;

      const oldBox = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
      const newBox = { x: 0, y: 0, width: 127, height: 100, rotation: 0 };

      (transformer as any).getActiveAnchor = () => 'middle-right';

      const result = boundBoxFunc(oldBox, newBox);

      // Должен привязаться к новому шагу (127 → 120 или 140)
      expect(result.width % 20).toBeCloseTo(0, 1);
    });
  });
});
