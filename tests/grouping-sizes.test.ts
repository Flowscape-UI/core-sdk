import { describe, it, expect, beforeEach } from 'vitest';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import Konva from 'konva';

describe('Grouping/Ungrouping - Size Preservation', () => {
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

  describe('Создание группы', () => {
    it('должна сохранять размеры нод при добавлении в группу', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const node1Konva = node1.getNode();
      const originalWidth = node1Konva.width();
      const originalHeight = node1Konva.height();

      // Создаём группу и добавляем ноду
      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs);

      // Размеры ноды не должны измениться
      expect(node1Konva.width()).toBe(originalWidth);
      expect(node1Konva.height()).toBe(originalHeight);
    });

    it('должна сохранять трансформации нод при добавлении в группу', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const node1Konva = node1.getNode();
      node1Konva.scaleX(2);
      node1Konva.scaleY(1.5);
      node1Konva.rotation(45);

      const originalScaleX = node1Konva.scaleX();
      const originalScaleY = node1Konva.scaleY();
      const originalRotation = node1Konva.rotation();

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs);

      // Трансформации ноды не должны измениться
      expect(node1Konva.scaleX()).toBeCloseTo(originalScaleX, 5);
      expect(node1Konva.scaleY()).toBeCloseTo(originalScaleY, 5);
      expect(node1Konva.rotation()).toBeCloseTo(originalRotation, 5);
    });

    it('должна сохранять визуальный размер ноды при добавлении в группу', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const node1Konva = node1.getNode();
      node1Konva.scaleX(2);
      node1Konva.scaleY(3);

      const originalClientRect = node1Konva.getClientRect();
      const originalVisualWidth = originalClientRect.width;
      const originalVisualHeight = originalClientRect.height;

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs);

      const newClientRect = node1Konva.getClientRect();
      const newVisualWidth = newClientRect.width;
      const newVisualHeight = newClientRect.height;

      expect(newVisualWidth).toBeCloseTo(originalVisualWidth, 1);
      expect(newVisualHeight).toBeCloseTo(originalVisualHeight, 1);
    });
  });

  describe('Трансформация группы', () => {
    it('должна изменять визуальный размер нод при трансформации группы', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const node1Konva = node1.getNode();
      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs);

      const originalClientRect = node1Konva.getClientRect();
      const originalVisualWidth = originalClientRect.width;
      const originalVisualHeight = originalClientRect.height;

      // Трансформируем группу (растягиваем в 2 раза)
      groupKonva.scaleX(2);
      groupKonva.scaleY(2);

      const newClientRect = node1Konva.getClientRect();
      const newVisualWidth = newClientRect.width;
      const newVisualHeight = newClientRect.height;

      // Визуальный размер должен увеличиться в 2 раза
      expect(newVisualWidth).toBeCloseTo(originalVisualWidth * 2, 1);
      expect(newVisualHeight).toBeCloseTo(originalVisualHeight * 2, 1);
    });

    it('должна сохранять соотношение размеров при неравномерной трансформации группы', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const node1Konva = node1.getNode();
      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs);

      const originalClientRect = node1Konva.getClientRect();
      const originalVisualWidth = originalClientRect.width;
      const originalVisualHeight = originalClientRect.height;

      // Трансформируем группу неравномерно
      groupKonva.scaleX(3);
      groupKonva.scaleY(1.5);

      const newClientRect = node1Konva.getClientRect();
      const newVisualWidth = newClientRect.width;
      const newVisualHeight = newClientRect.height;

      expect(newVisualWidth).toBeCloseTo(originalVisualWidth * 3, 1);
      expect(newVisualHeight).toBeCloseTo(originalVisualHeight * 1.5, 1);
    });
  });

  describe('Разгруппировка', () => {
    it('должна сохранять визуальный размер нод при разгруппировке', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const node1Konva = node1.getNode();
      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs);

      // Трансформируем группу
      groupKonva.scaleX(2);
      groupKonva.scaleY(2);

      const beforeUngroupClientRect = node1Konva.getClientRect();
      const beforeUngroupVisualWidth = beforeUngroupClientRect.width;
      const beforeUngroupVisualHeight = beforeUngroupClientRect.height;

      // Разгруппировка: переносим ноду обратно в world
      const world = core.nodes.world;
      const absBefore = node1Konva.getAbsoluteTransform().copy();
      world.add(node1Konva as any);

      // Рассчитываем локальный трансформ
      const worldAbs = world.getAbsoluteTransform().copy();
      worldAbs.invert();
      const local = worldAbs.multiply(absBefore);
      const d = local.decompose();

      node1Konva.position({ x: d.x, y: d.y });
      node1Konva.rotation(d.rotation);
      node1Konva.scale({ x: d.scaleX, y: d.scaleY });

      const afterUngroupClientRect = node1Konva.getClientRect();
      const afterUngroupVisualWidth = afterUngroupClientRect.width;
      const afterUngroupVisualHeight = afterUngroupClientRect.height;

      // Визуальный размер должен остаться таким же
      expect(afterUngroupVisualWidth).toBeCloseTo(beforeUngroupVisualWidth, 1);
      expect(afterUngroupVisualHeight).toBeCloseTo(beforeUngroupVisualHeight, 1);
    });

    it('должна сохранять трансформации нод при разгруппировке трансформированной группы', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const node1Konva = node1.getNode();
      // Применяем трансформации к ноде
      node1Konva.scaleX(1.5);
      node1Konva.scaleY(1.2);
      node1Konva.rotation(30);

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const abs = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs);

      // Трансформируем группу
      groupKonva.scaleX(2);
      groupKonva.scaleY(2);
      groupKonva.rotation(45);

      // Вычисляем ожидаемые финальные трансформации (композиция трансформаций)
      const expectedFinalScaleX = 1.5 * 2; // scaleX ноды * scaleX группы
      const expectedFinalScaleY = 1.2 * 2; // scaleY ноды * scaleY группы
      const expectedFinalRotation = 30 + 45; // rotation ноды + rotation группы

      // Разгруппировка
      const world = core.nodes.world;
      const absBefore = node1Konva.getAbsoluteTransform().copy();
      world.add(node1Konva as any);

      const worldAbs = world.getAbsoluteTransform().copy();
      worldAbs.invert();
      const local = worldAbs.multiply(absBefore);
      const d = local.decompose();

      node1Konva.position({ x: d.x, y: d.y });
      node1Konva.rotation(d.rotation);
      node1Konva.scale({ x: d.scaleX, y: d.scaleY });

      // Проверяем финальные трансформации
      expect(node1Konva.scaleX()).toBeCloseTo(expectedFinalScaleX, 2);
      expect(node1Konva.scaleY()).toBeCloseTo(expectedFinalScaleY, 2);
      expect(node1Konva.rotation()).toBeCloseTo(expectedFinalRotation, 2);
    });
  });

  describe('Временная группа (Temp Multi Group)', () => {
    it('должна сохранять размеры при коммите временной группы в постоянную', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });
      const node2 = core.nodes.addShape({
        x: 250,
        y: 100,
        width: 150,
        height: 120,
        fill: 'blue',
      });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      // Создаём временную группу
      const tempGroup = new Konva.Group({ name: 'temp-multi-group' });
      const world = core.nodes.world;
      world.add(tempGroup);

      const abs1 = node1Konva.getAbsolutePosition();
      const abs2 = node2Konva.getAbsolutePosition();
      tempGroup.add(node1Konva as any);
      tempGroup.add(node2Konva as any);
      node1Konva.setAbsolutePosition(abs1);
      node2Konva.setAbsolutePosition(abs2);

      // Трансформируем временную группу
      tempGroup.scaleX(2);
      tempGroup.scaleY(2);

      const beforeCommitClientRect1 = node1Konva.getClientRect();
      const beforeCommitVisualWidth1 = beforeCommitClientRect1.width;
      const beforeCommitVisualHeight1 = beforeCommitClientRect1.height;

      // Коммитим в постоянную группу
      const pos = tempGroup.getAbsolutePosition();
      const permanentGroup = core.nodes.addGroup({ x: pos.x, y: pos.y, draggable: true });
      const permanentGroupKonva = permanentGroup.getNode();

      const children = [...tempGroup.getChildren()];
      for (const kn of children) {
        const absBefore = kn.getAbsoluteTransform().copy();
        permanentGroupKonva.add(kn as any);

        const groupAbs = permanentGroupKonva.getAbsoluteTransform().copy();
        groupAbs.invert();
        const local = groupAbs.multiply(absBefore);
        const d = local.decompose();

        kn.position({ x: d.x, y: d.y });
        kn.rotation(d.rotation);
        kn.scale({ x: d.scaleX, y: d.scaleY });
      }

      tempGroup.destroy();

      const afterCommitClientRect1 = node1Konva.getClientRect();
      const afterCommitVisualWidth1 = afterCommitClientRect1.width;
      const afterCommitVisualHeight1 = afterCommitClientRect1.height;

      // Визуальный размер должен остаться таким же
      expect(afterCommitVisualWidth1).toBeCloseTo(beforeCommitVisualWidth1, 1);
      expect(afterCommitVisualHeight1).toBeCloseTo(beforeCommitVisualHeight1, 1);
    });
  });

  describe('Сложные сценарии', () => {
    it('должна сохранять размеры при: группировка → трансформация → разгруппировка → копирование', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const node1Konva = node1.getNode();
      const originalClientRect = node1Konva.getClientRect();
      const originalVisualWidth = originalClientRect.width;
      const originalVisualHeight = originalClientRect.height;

      // 1. Группировка
      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();
      const abs = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs);

      // 2. Трансформация группы (растягиваем в 2 раза)
      groupKonva.scaleX(2);
      groupKonva.scaleY(2);

      const afterGroupTransformClientRect = node1Konva.getClientRect();
      const afterGroupTransformVisualWidth = afterGroupTransformClientRect.width;
      const afterGroupTransformVisualHeight = afterGroupTransformClientRect.height;

      // Визуальный размер должен увеличиться в 2 раза
      expect(afterGroupTransformVisualWidth).toBeCloseTo(originalVisualWidth * 2, 1);
      expect(afterGroupTransformVisualHeight).toBeCloseTo(originalVisualHeight * 2, 1);

      // 3. Разгруппировка
      const world = core.nodes.world;
      const absBefore = node1Konva.getAbsoluteTransform().copy();
      world.add(node1Konva as any);

      const worldAbs = world.getAbsoluteTransform().copy();
      worldAbs.invert();
      const local = worldAbs.multiply(absBefore);
      const d = local.decompose();

      node1Konva.position({ x: d.x, y: d.y });
      node1Konva.rotation(d.rotation);
      node1Konva.scale({ x: d.scaleX, y: d.scaleY });

      const afterUngroupClientRect = node1Konva.getClientRect();
      const afterUngroupVisualWidth = afterUngroupClientRect.width;
      const afterUngroupVisualHeight = afterUngroupClientRect.height;

      // Визуальный размер должен остаться увеличенным в 2 раза
      expect(afterUngroupVisualWidth).toBeCloseTo(originalVisualWidth * 2, 1);
      expect(afterUngroupVisualHeight).toBeCloseTo(originalVisualHeight * 2, 1);
    });
  });
});
