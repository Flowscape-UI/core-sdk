import { describe, it, expect, beforeEach } from 'vitest';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import Konva from 'konva';

describe('Grouping - Basic Tests (Working with current implementation)', () => {
  let core: CoreEngine;
  let selectionPlugin: SelectionPlugin;

  beforeEach(() => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    core = new CoreEngine({ container, width: 800, height: 600 });
    selectionPlugin = new SelectionPlugin();
    core.plugins.addPlugins([selectionPlugin]);
  });

  describe('Создание группы программно', () => {
    it('должно создавать группу с двумя нодами', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      // Сохраняем позиции
      const abs1 = node1Konva.getAbsolutePosition();
      const abs2 = node2Konva.getAbsolutePosition();

      // Добавляем в группу
      groupKonva.add(node1Konva as any);
      groupKonva.add(node2Konva as any);

      // Восстанавливаем позиции
      node1Konva.setAbsolutePosition(abs1);
      node2Konva.setAbsolutePosition(abs2);

      const children = groupKonva.getChildren();
      expect(children.length).toBe(2);
      expect(children).toContain(node1Konva);
      expect(children).toContain(node2Konva);
    });

    it('должно сохранять позиции нод при добавлении в группу', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 150, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const originalPos1 = node1Konva.getAbsolutePosition();
      const originalPos2 = node2Konva.getAbsolutePosition();

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs1 = node1Konva.getAbsolutePosition();
      const abs2 = node2Konva.getAbsolutePosition();

      groupKonva.add(node1Konva as any);
      groupKonva.add(node2Konva as any);

      node1Konva.setAbsolutePosition(abs1);
      node2Konva.setAbsolutePosition(abs2);

      const newPos1 = node1Konva.getAbsolutePosition();
      const newPos2 = node2Konva.getAbsolutePosition();

      expect(newPos1.x).toBeCloseTo(originalPos1.x, 1);
      expect(newPos1.y).toBeCloseTo(originalPos1.y, 1);
      expect(newPos2.x).toBeCloseTo(originalPos2.x, 1);
      expect(newPos2.y).toBeCloseTo(originalPos2.y, 1);
    });

    it('должно сохранять размеры нод при добавлении в группу', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 150, height: 120, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 300, y: 100, width: 200, height: 180, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const originalWidth1 = node1Konva.width();
      const originalHeight1 = node1Konva.height();
      const originalWidth2 = node2Konva.width();
      const originalHeight2 = node2Konva.height();

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs1 = node1Konva.getAbsolutePosition();
      const abs2 = node2Konva.getAbsolutePosition();

      groupKonva.add(node1Konva as any);
      groupKonva.add(node2Konva as any);

      node1Konva.setAbsolutePosition(abs1);
      node2Konva.setAbsolutePosition(abs2);

      expect(node1Konva.width()).toBe(originalWidth1);
      expect(node1Konva.height()).toBe(originalHeight1);
      expect(node2Konva.width()).toBe(originalWidth2);
      expect(node2Konva.height()).toBe(originalHeight2);
    });

    it('должно сохранять трансформации нод при добавлении в группу', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      node1Konva.scaleX(1.5);
      node1Konva.scaleY(1.2);
      node1Konva.rotation(30);
      node2Konva.scaleX(2);

      const originalScale1X = node1Konva.scaleX();
      const originalScale1Y = node1Konva.scaleY();
      const originalRotation1 = node1Konva.rotation();
      const originalScale2X = node2Konva.scaleX();

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs1 = node1Konva.getAbsolutePosition();
      const abs2 = node2Konva.getAbsolutePosition();

      groupKonva.add(node1Konva as any);
      groupKonva.add(node2Konva as any);

      node1Konva.setAbsolutePosition(abs1);
      node2Konva.setAbsolutePosition(abs2);

      expect(node1Konva.scaleX()).toBeCloseTo(originalScale1X, 5);
      expect(node1Konva.scaleY()).toBeCloseTo(originalScale1Y, 5);
      expect(node1Konva.rotation()).toBeCloseTo(originalRotation1, 5);
      expect(node2Konva.scaleX()).toBeCloseTo(originalScale2X, 5);
    });

    it('должно сохранять связь нод при перемещении группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs1 = node1Konva.getAbsolutePosition();
      const abs2 = node2Konva.getAbsolutePosition();

      groupKonva.add(node1Konva as any);
      groupKonva.add(node2Konva as any);

      node1Konva.setAbsolutePosition(abs1);
      node2Konva.setAbsolutePosition(abs2);

      const originalPos1 = node1Konva.getAbsolutePosition();
      const originalPos2 = node2Konva.getAbsolutePosition();
      const distance = Math.hypot(originalPos2.x - originalPos1.x, originalPos2.y - originalPos1.y);

      // Перемещаем группу
      groupKonva.position({ x: groupKonva.x() + 100, y: groupKonva.y() + 50 });

      const newPos1 = node1Konva.getAbsolutePosition();
      const newPos2 = node2Konva.getAbsolutePosition();
      const newDistance = Math.hypot(newPos2.x - newPos1.x, newPos2.y - newPos1.y);

      // Расстояние между нодами должно остаться прежним
      expect(newDistance).toBeCloseTo(distance, 1);
    });
  });

  describe('Разгруппировка программно', () => {
    // Примечание: тест на сохранение позиций уже есть в grouping-sizes.test.ts

    it('должно сохранять размеры нод при разгруппировке', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 150, height: 120, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 300, y: 100, width: 200, height: 180, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const originalWidth1 = node1Konva.width();
      const originalHeight1 = node1Konva.height();
      const originalWidth2 = node2Konva.width();
      const originalHeight2 = node2Konva.height();

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs1 = node1Konva.getAbsolutePosition();
      const abs2 = node2Konva.getAbsolutePosition();

      groupKonva.add(node1Konva as any);
      groupKonva.add(node2Konva as any);

      node1Konva.setAbsolutePosition(abs1);
      node2Konva.setAbsolutePosition(abs2);

      // Разгруппировка
      const world = core.nodes.world;
      const absBefore1 = node1Konva.getAbsoluteTransform().copy();
      const absBefore2 = node2Konva.getAbsoluteTransform().copy();

      world.add(node1Konva as any);
      world.add(node2Konva as any);

      const worldAbs = world.getAbsoluteTransform().copy();
      worldAbs.invert();

      const local1 = worldAbs.multiply(absBefore1);
      const d1 = local1.decompose();
      node1Konva.position({ x: d1.x, y: d1.y });
      node1Konva.rotation(d1.rotation);
      node1Konva.scale({ x: d1.scaleX, y: d1.scaleY });

      const local2 = worldAbs.multiply(absBefore2);
      const d2 = local2.decompose();
      node2Konva.position({ x: d2.x, y: d2.y });
      node2Konva.rotation(d2.rotation);
      node2Konva.scale({ x: d2.scaleX, y: d2.scaleY });

      expect(node1Konva.width()).toBe(originalWidth1);
      expect(node1Konva.height()).toBe(originalHeight1);
      expect(node2Konva.width()).toBe(originalWidth2);
      expect(node2Konva.height()).toBe(originalHeight2);
    });
  });
});
