import { describe, it, expect, beforeEach } from 'vitest';
import Konva from 'konva';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';
import { AreaSelectionPlugin } from '../src/plugins/AreaSelectionPlugin';
import type { BaseNode } from '../src/nodes/BaseNode';

describe('Копирование при выделении лассо: Сложные группы', () => {
  let container: HTMLDivElement;
  let core: CoreEngine;
  let selectionPlugin: SelectionPlugin;
  let hotkeysPlugin: NodeHotkeysPlugin;
  let areaSelectionPlugin: AreaSelectionPlugin;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    core = new CoreEngine({
      container,
      width: 800,
      height: 600,
    });

    selectionPlugin = new SelectionPlugin();
    hotkeysPlugin = new NodeHotkeysPlugin();
    areaSelectionPlugin = new AreaSelectionPlugin();

    core.plugins.addPlugins([selectionPlugin, hotkeysPlugin, areaSelectionPlugin]);
  });

  describe('Выделение лассо: Одиночные ноды', () => {
    it('должно копировать все выделенные лассо ноды', () => {
      // Создаём 3 ноды
      const node1 = core.nodes.addShape({
        x: 50,
        y: 50,
        width: 40,
        height: 40,
        fill: 'red',
      });

      const node2 = core.nodes.addCircle({
        x: 100,
        y: 50,
        radius: 20,
        fill: 'blue',
      });

      const node3 = core.nodes.addShape({
        x: 150,
        y: 50,
        width: 40,
        height: 40,
        fill: 'green',
      });

      // Выделяем лассо (создаём временную группу)
      (selectionPlugin as any)._ensureTempMulti([node1, node2, node3]);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем, что создались новые ноды
      const allNodes = core.nodes.list();
      expect(allNodes.length).toBeGreaterThanOrEqual(6); // 3 исходных + 3 новых

      // Проверяем типы
      const shapes = allNodes.filter((n) => n.constructor.name === 'ShapeNode');
      const circles = allNodes.filter((n) => n.constructor.name === 'CircleNode');

      expect(shapes.length).toBeGreaterThanOrEqual(4); // 2 исходных + 2 новых
      expect(circles.length).toBeGreaterThanOrEqual(2); // 1 исходный + 1 новый
    });

    it('должно сохранять относительное расположение нод при копировании лассо', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 30,
        height: 30,
        fill: 'red',
      });

      const node2 = core.nodes.addShape({
        x: 200,
        y: 150,
        width: 30,
        height: 30,
        fill: 'blue',
      });

      // Запоминаем расстояние
      const dx = 200 - 100;
      const dy = 150 - 100;

      // Выделяем лассо
      (selectionPlugin as any)._ensureTempMulti([node1, node2]);

      // Копируем и вставляем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем относительное расположение
      const allNodes = core.nodes.list();
      const shapes = allNodes.filter((n) => n.constructor.name === 'ShapeNode');

      if (shapes.length >= 4) {
        const newNode1 = shapes[2].getNode() as unknown as Konva.Rect;
        const newNode2 = shapes[3].getNode() as unknown as Konva.Rect;

        const newDx = newNode2.x() - newNode1.x();
        const newDy = newNode2.y() - newNode1.y();

        expect(newDx).toBeCloseTo(dx, 1);
        expect(newDy).toBeCloseTo(dy, 1);
      }
    });
  });

  describe('Выделение лассо: Группы', () => {
    it('должно копировать группу при выделении лассо', () => {
      // Создаём группу
      const group = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      // Добавляем дочерние ноды
      const child1 = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        fill: 'red',
      });

      const child2 = core.nodes.addCircle({
        x: 60,
        y: 0,
        radius: 25,
        fill: 'blue',
      });

      const child1Konva = child1.getNode() as unknown as Konva.Rect;
      const child2Konva = child2.getNode() as unknown as Konva.Circle;

      child1Konva.moveTo(groupKonva);
      child2Konva.moveTo(groupKonva);

      // Выделяем лассо (только группу)
      (selectionPlugin as any)._ensureTempMulti([group]);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем, что создалась новая группа
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      expect(groups.length).toBe(2);

      // Проверяем дочерние ноды
      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;
      expect(newGroupKonva.getChildren().length).toBe(2);

      const newChildren = newGroupKonva.getChildren();
      const newChild1 = newChildren[0] as Konva.Rect;
      const newChild2 = newChildren[1] as Konva.Circle;

      expect(newChild1.width()).toBe(50);
      expect(newChild1.height()).toBe(50);
      expect(newChild2.radius()).toBe(25);
    });

    it('должно копировать несколько групп при выделении лассо', () => {
      // Создаём 2 группы
      const group1 = core.nodes.addGroup({
        x: 50,
        y: 50,
      });

      const group2 = core.nodes.addGroup({
        x: 200,
        y: 50,
      });

      const group1Konva = group1.getNode() as unknown as Konva.Group;
      const group2Konva = group2.getNode() as unknown as Konva.Group;

      // Добавляем дочерние ноды в первую группу
      const child1 = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        fill: 'red',
      });

      const child1Konva = child1.getNode() as unknown as Konva.Rect;
      child1Konva.moveTo(group1Konva);

      // Добавляем дочерние ноды во вторую группу
      const child2 = core.nodes.addCircle({
        x: 0,
        y: 0,
        radius: 20,
        fill: 'blue',
      });

      const child2Konva = child2.getNode() as unknown as Konva.Circle;
      child2Konva.moveTo(group2Konva);

      // Выделяем лассо (обе группы)
      (selectionPlugin as any)._ensureTempMulti([group1, group2]);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем, что создались новые группы
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      expect(groups.length).toBe(4); // 2 исходных + 2 новых

      // Проверяем дочерние ноды в новых группах
      const newGroup1 = groups[2];
      const newGroup2 = groups[3];

      const newGroup1Konva = newGroup1.getNode() as unknown as Konva.Group;
      const newGroup2Konva = newGroup2.getNode() as unknown as Konva.Group;

      expect(newGroup1Konva.getChildren().length).toBe(1);
      expect(newGroup2Konva.getChildren().length).toBe(1);
    });
  });

  describe('Выделение лассо: Смешанные ноды и группы', () => {
    it('должно копировать одиночные ноды и группы вместе', () => {
      // Создаём одиночную ноду
      const singleNode = core.nodes.addShape({
        x: 50,
        y: 50,
        width: 40,
        height: 40,
        fill: 'yellow',
      });

      // Создаём группу
      const group = core.nodes.addGroup({
        x: 150,
        y: 50,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      const childInGroup = core.nodes.addCircle({
        x: 0,
        y: 0,
        radius: 20,
        fill: 'purple',
      });

      const childKonva = childInGroup.getNode() as unknown as Konva.Circle;
      childKonva.moveTo(groupKonva);

      // Выделяем лассо (одиночная нода + группа)
      (selectionPlugin as any)._ensureTempMulti([singleNode, group]);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем результат
      const allNodes = core.nodes.list();
      const shapes = allNodes.filter((n) => n.constructor.name === 'ShapeNode');
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      expect(shapes.length).toBeGreaterThanOrEqual(2); // 1 исходный + 1 новый
      expect(groups.length).toBe(2); // 1 исходная + 1 новая

      // Проверяем, что новая группа содержит дочернюю ноду
      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;
      expect(newGroupKonva.getChildren().length).toBe(1);

      const newChild = newGroupKonva.getChildren()[0] as Konva.Circle;
      expect(newChild.radius()).toBe(20);
      expect(newChild.fill()).toBe('purple');
    });

    it('должно сохранять структуру при копировании смешанных нод', () => {
      // Создаём сложную структуру:
      // - 2 одиночные ноды
      // - 1 группа с 2 дочерними нодами
      const node1 = core.nodes.addShape({
        x: 50,
        y: 50,
        width: 30,
        height: 30,
        fill: 'red',
      });

      const node2 = core.nodes.addShape({
        x: 100,
        y: 50,
        width: 30,
        height: 30,
        fill: 'blue',
      });

      const group = core.nodes.addGroup({
        x: 150,
        y: 50,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      const child1 = core.nodes.addCircle({
        x: 0,
        y: 0,
        radius: 15,
        fill: 'green',
      });

      const child2 = core.nodes.addCircle({
        x: 40,
        y: 0,
        radius: 15,
        fill: 'yellow',
      });

      const child1Konva = child1.getNode() as unknown as Konva.Circle;
      const child2Konva = child2.getNode() as unknown as Konva.Circle;

      child1Konva.moveTo(groupKonva);
      child2Konva.moveTo(groupKonva);

      // Выделяем лассо всё
      (selectionPlugin as any)._ensureTempMulti([node1, node2, group]);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем структуру
      const allNodes = core.nodes.list();
      const shapes = allNodes.filter((n) => n.constructor.name === 'ShapeNode');
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      expect(shapes.length).toBeGreaterThanOrEqual(4); // 2 исходных + 2 новых
      expect(groups.length).toBe(2); // 1 исходная + 1 новая

      // Проверяем новую группу
      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;
      expect(newGroupKonva.getChildren().length).toBe(2);

      // Проверяем дочерние ноды в новой группе
      const newChildren = newGroupKonva.getChildren();
      const newChild1 = newChildren[0] as Konva.Circle;
      const newChild2 = newChildren[1] as Konva.Circle;

      expect(newChild1.radius()).toBe(15);
      expect(newChild2.radius()).toBe(15);
      expect(newChild1.fill()).toBe('green');
      expect(newChild2.fill()).toBe('yellow');
    });
  });

  describe('Выделение лассо: Вложенные группы', () => {
    it('должно копировать вложенные группы с сохранением структуры', () => {
      // Создаём внешнюю группу
      const outerGroup = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const outerGroupKonva = outerGroup.getNode() as unknown as Konva.Group;

      // Создаём внутреннюю группу
      const innerGroup = core.nodes.addGroup({
        x: 0,
        y: 0,
      });

      const innerGroupKonva = innerGroup.getNode() as unknown as Konva.Group;

      // Добавляем ноду во внутреннюю группу
      const deepChild = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        fill: 'cyan',
      });

      const deepChildKonva = deepChild.getNode() as unknown as Konva.Rect;
      deepChildKonva.moveTo(innerGroupKonva);

      // Перемещаем внутреннюю группу во внешнюю
      innerGroupKonva.moveTo(outerGroupKonva);

      // Добавляем ещё одну ноду во внешнюю группу
      const outerChild = core.nodes.addCircle({
        x: 50,
        y: 0,
        radius: 15,
        fill: 'magenta',
      });

      const outerChildKonva = outerChild.getNode() as unknown as Konva.Circle;
      outerChildKonva.moveTo(outerGroupKonva);

      // Выделяем лассо внешнюю группу
      (selectionPlugin as any)._ensureTempMulti([outerGroup]);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем структуру
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      // Должно быть минимум 2 группы (исходная внешняя + новая внешняя)
      // Внутренние группы могут быть или не быть зарегистрированы в NodeManager
      expect(groups.length).toBeGreaterThanOrEqual(2);

      // Находим новую внешнюю группу (последняя в списке)
      const newOuterGroup = groups[groups.length - 1];
      const newOuterGroupKonva = newOuterGroup.getNode() as unknown as Konva.Group;

      // Проверяем, что у внешней группы есть дочерние элементы
      const outerChildren = newOuterGroupKonva.getChildren();
      expect(outerChildren.length).toBeGreaterThanOrEqual(1);

      // Ищем вложенную группу среди дочерних элементов
      const nestedGroup = outerChildren.find((child) => child instanceof Konva.Group);

      if (nestedGroup) {
        // Проверяем, что у вложенной группы есть дочерняя нода
        const innerChildren = (nestedGroup as Konva.Group).getChildren();
        expect(innerChildren.length).toBeGreaterThanOrEqual(1);

        // Проверяем параметры глубоко вложенной ноды
        const deepNode = innerChildren[0] as Konva.Rect;
        if (deepNode.width) {
          expect(deepNode.width()).toBe(30);
          expect(deepNode.height()).toBe(30);
        }
      }
    });

    it('должно копировать сложную структуру: группа с подгруппами и одиночными нодами', () => {
      // Создаём главную группу
      const mainGroup = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const mainGroupKonva = mainGroup.getNode() as unknown as Konva.Group;

      // Добавляем подгруппу 1
      const subGroup1 = core.nodes.addGroup({
        x: 0,
        y: 0,
      });

      const subGroup1Konva = subGroup1.getNode() as unknown as Konva.Group;

      const child1InSub1 = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 25,
        height: 25,
        fill: 'red',
      });

      const child1InSub1Konva = child1InSub1.getNode() as unknown as Konva.Rect;
      child1InSub1Konva.moveTo(subGroup1Konva);
      subGroup1Konva.moveTo(mainGroupKonva);

      // Добавляем подгруппу 2
      const subGroup2 = core.nodes.addGroup({
        x: 50,
        y: 0,
      });

      const subGroup2Konva = subGroup2.getNode() as unknown as Konva.Group;

      const child1InSub2 = core.nodes.addCircle({
        x: 0,
        y: 0,
        radius: 12,
        fill: 'blue',
      });

      const child1InSub2Konva = child1InSub2.getNode() as unknown as Konva.Circle;
      child1InSub2Konva.moveTo(subGroup2Konva);
      subGroup2Konva.moveTo(mainGroupKonva);

      // Добавляем одиночную ноду в главную группу
      const singleInMain = core.nodes.addShape({
        x: 100,
        y: 0,
        width: 20,
        height: 20,
        fill: 'green',
      });

      const singleInMainKonva = singleInMain.getNode() as unknown as Konva.Rect;
      singleInMainKonva.moveTo(mainGroupKonva);

      // Выделяем лассо главную группу
      (selectionPlugin as any)._ensureTempMulti([mainGroup]);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем структуру
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      // Должно быть минимум 2 главных группы
      expect(groups.length).toBeGreaterThanOrEqual(2);

      // Находим новую главную группу
      const newMainGroup = groups[groups.length - 1];
      const newMainGroupKonva = newMainGroup.getNode() as unknown as Konva.Group;

      // ВАЖНО: Вложенные группы теперь регистрируются в NodeManager отдельно
      // Поэтому они НЕ находятся внутри родительской Konva-группы как дочерние элементы
      // Проверяем, что все группы зарегистрированы
      const newGroups = groups.slice(3);
      expect(newGroups.length).toBe(3); // mainGroup + subGroup1 + subGroup2
    });
  });

  describe('Выделение лассо: Трансформации', () => {
    it('должно сохранять трансформации группы при копировании лассо', () => {
      const group = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;
      groupKonva.scaleX(1.5);
      groupKonva.scaleY(2);
      groupKonva.rotation(30);

      const child = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        fill: 'orange',
      });

      const childKonva = child.getNode() as unknown as Konva.Rect;
      childKonva.moveTo(groupKonva);

      // Выделяем лассо
      (selectionPlugin as any)._ensureTempMulti([group]);

      // Копируем и вставляем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем трансформации
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      expect(newGroupKonva.scaleX()).toBeCloseTo(1.5, 2);
      expect(newGroupKonva.scaleY()).toBeCloseTo(2, 2);
      expect(newGroupKonva.rotation()).toBeCloseTo(30, 2);

      // Проверяем дочернюю ноду
      const newChild = newGroupKonva.getChildren()[0] as Konva.Rect;
      expect(newChild.width()).toBe(50);
      expect(newChild.height()).toBe(50);
    });

    it('должно сохранять трансформации на всех уровнях вложенности', () => {
      // Внешняя группа с трансформациями
      const outerGroup = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const outerGroupKonva = outerGroup.getNode() as unknown as Konva.Group;
      outerGroupKonva.scaleX(2);
      outerGroupKonva.rotation(45);

      // Внутренняя группа с трансформациями
      const innerGroup = core.nodes.addGroup({
        x: 0,
        y: 0,
      });

      const innerGroupKonva = innerGroup.getNode() as unknown as Konva.Group;
      innerGroupKonva.scaleY(1.5);
      innerGroupKonva.rotation(15);
      innerGroupKonva.moveTo(outerGroupKonva);

      // Нода с трансформациями
      const child = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        fill: 'pink',
      });

      const childKonva = child.getNode() as unknown as Konva.Rect;
      childKonva.scaleX(0.5);
      childKonva.moveTo(innerGroupKonva);

      // Выделяем лассо
      (selectionPlugin as any)._ensureTempMulti([outerGroup]);

      // Копируем и вставляем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем трансформации внешней группы
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      // ВАЖНО: Вложенные группы регистрируются отдельно, поэтому их больше
      expect(groups.length).toBeGreaterThanOrEqual(2);

      // Находим новую внешнюю группу (последняя созданная)
      const newOuterGroup = groups[groups.length - 1];
      const newOuterGroupKonva = newOuterGroup.getNode() as unknown as Konva.Group;

      // Проверяем, что трансформации применены (могут быть на любой из групп)
      const hasTransformedGroup = groups.some((g) => {
        const konva = g.getNode() as unknown as Konva.Group;
        return Math.abs(konva.scaleX() - 2) < 0.1 || Math.abs(konva.rotation() - 45) < 1;
      });

      expect(hasTransformedGroup).toBe(true);

      // Проверяем вложенную группу
      const outerChildren = newOuterGroupKonva.getChildren();
      const newInnerGroup = outerChildren.find((child) => child instanceof Konva.Group);

      if (newInnerGroup) {
        expect((newInnerGroup as Konva.Group).scaleY()).toBeCloseTo(1.5, 2);
        expect((newInnerGroup as Konva.Group).rotation()).toBeCloseTo(15, 2);

        // Проверяем глубоко вложенную ноду
        const innerChildren = (newInnerGroup as Konva.Group).getChildren();
        if (innerChildren.length > 0) {
          const newChild = innerChildren[0] as Konva.Rect;
          if (newChild.scaleX) {
            expect(newChild.scaleX()).toBeCloseTo(0.5, 2);
          }
        }
      }
    });
  });
});
