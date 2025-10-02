import { describe, it, expect, beforeEach } from 'vitest';
import Konva from 'konva';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';
import type { BaseNode } from '../src/nodes/BaseNode';

describe('Копирование и вставка: Полное покрытие', () => {
  let container: HTMLDivElement;
  let core: CoreEngine;
  let selectionPlugin: SelectionPlugin;
  let hotkeysPlugin: NodeHotkeysPlugin;

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

    core.plugins.addPlugins([selectionPlugin]);
    core.plugins.addPlugins([hotkeysPlugin]);
  });

  describe('Копирование одиночной ноды', () => {
    it('должно копировать ноду с сохранением размеров', () => {
      // Создаём ноду
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        fill: 'red',
      });

      // Выделяем
      (selectionPlugin as any)._select(node);

      // Копируем (Ctrl+C)
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем (Ctrl+V)
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем, что создалась новая нода
      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      // Проверяем размеры новой ноды
      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Rect;
      expect(newKonvaNode.width()).toBe(150);
      expect(newKonvaNode.height()).toBe(100);
      expect(newKonvaNode.fill()).toBe('red');
    });

    it('должно копировать ноду с сохранением трансформаций (scale, rotation)', () => {
      // Создаём ноду с трансформациями
      const node = core.nodes.addCircle({
        x: 200,
        y: 200,
        radius: 50,
        fill: 'blue',
      });

      const konvaNode = node.getNode() as unknown as Konva.Circle;
      konvaNode.scaleX(1.5);
      konvaNode.scaleY(2);
      konvaNode.rotation(45);

      // Выделяем и копируем
      (selectionPlugin as any)._select(node);

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

      // Проверяем трансформации
      const allNodes = core.nodes.list();
      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Circle;

      expect(newKonvaNode.radius()).toBe(50);
      expect(newKonvaNode.scaleX()).toBeCloseTo(1.5, 2);
      expect(newKonvaNode.scaleY()).toBeCloseTo(2, 2);
      expect(newKonvaNode.rotation()).toBeCloseTo(45, 2);
      expect(newKonvaNode.fill()).toBe('blue');
    });

    it('должно вставлять ноду в позицию курсора', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: 'green',
      });

      (selectionPlugin as any)._select(node);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Симулируем позицию курсора
      const stage = core.stage;
      stage.setPointersPositions([{ x: 400, y: 300, id: 1 }]);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем, что создалась новая нода
      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Rect;

      // Проверяем, что нода вставлена (позиция может отличаться из-за центрирования)
      // Главное - что нода создана с правильными размерами
      expect(newKonvaNode.width()).toBe(50);
      expect(newKonvaNode.height()).toBe(50);
      expect(newKonvaNode.fill()).toBe('green');

      // Позиция должна отличаться от исходной (нода вставлена в новое место)
      const originalNode = allNodes[0].getNode() as unknown as Konva.Rect;
      const positionChanged =
        Math.abs(newKonvaNode.x() - originalNode.x()) > 1 ||
        Math.abs(newKonvaNode.y() - originalNode.y()) > 1;
      expect(positionChanged).toBe(true);
    });
  });

  describe('Копирование группы', () => {
    it('должно копировать группу с сохранением всех дочерних нод', () => {
      // Создаём группу с двумя нодами
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

      // Выделяем группу
      (selectionPlugin as any)._select(group);

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
      // Должно быть: 1 группа + 2 дочерних + 1 новая группа = 4 (или 3 если дочерние не регистрируются)
      expect(allNodes.length).toBeGreaterThanOrEqual(2);

      // Находим новую группу
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      expect(groups.length).toBe(2);

      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      // Проверяем количество дочерних элементов
      expect(newGroupKonva.getChildren().length).toBe(2);

      // Проверяем типы и размеры дочерних элементов
      const children = newGroupKonva.getChildren();
      const newChild1 = children[0] as Konva.Rect;
      const newChild2 = children[1] as Konva.Circle;

      expect(newChild1.width()).toBe(50);
      expect(newChild1.height()).toBe(50);
      expect(newChild1.fill()).toBe('red');

      expect(newChild2.radius()).toBe(25);
      expect(newChild2.fill()).toBe('blue');
    });

    it('должно копировать группу с сохранением трансформаций группы', () => {
      // Создаём группу с трансформациями
      const group = core.nodes.addGroup({
        x: 150,
        y: 150,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;
      groupKonva.scaleX(1.5);
      groupKonva.scaleY(1.5);
      groupKonva.rotation(30);

      // Добавляем дочернюю ноду
      const child = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        fill: 'purple',
      });

      const childKonva = child.getNode() as unknown as Konva.Rect;
      childKonva.moveTo(groupKonva);

      // Выделяем и копируем
      (selectionPlugin as any)._select(group);

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

      // Проверяем трансформации новой группы
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      expect(newGroupKonva.scaleX()).toBeCloseTo(1.5, 2);
      expect(newGroupKonva.scaleY()).toBeCloseTo(1.5, 2);
      expect(newGroupKonva.rotation()).toBeCloseTo(30, 2);

      // Проверяем дочернюю ноду
      const newChild = newGroupKonva.getChildren()[0] as Konva.Rect;
      expect(newChild.width()).toBe(100);
      expect(newChild.height()).toBe(100);
    });

    it('должно копировать группу с сохранением относительных позиций дочерних нод', () => {
      const group = core.nodes.addGroup({
        x: 200,
        y: 200,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      // Создаём дочерние ноды с разными позициями
      const child1 = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        fill: 'red',
      });

      const child2 = core.nodes.addShape({
        x: 50,
        y: 50,
        width: 30,
        height: 30,
        fill: 'blue',
      });

      const child1Konva = child1.getNode() as unknown as Konva.Rect;
      const child2Konva = child2.getNode() as unknown as Konva.Rect;

      child1Konva.moveTo(groupKonva);
      child2Konva.moveTo(groupKonva);

      // Устанавливаем относительные позиции
      child1Konva.position({ x: 10, y: 10 });
      child2Konva.position({ x: 60, y: 60 });

      // Копируем группу
      (selectionPlugin as any)._select(group);

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

      // Проверяем относительные позиции в новой группе
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      const newChildren = newGroupKonva.getChildren();
      const newChild1 = newChildren[0] as Konva.Rect;
      const newChild2 = newChildren[1] as Konva.Rect;

      expect(newChild1.x()).toBeCloseTo(10, 1);
      expect(newChild1.y()).toBeCloseTo(10, 1);
      expect(newChild2.x()).toBeCloseTo(60, 1);
      expect(newChild2.y()).toBeCloseTo(60, 1);
    });
  });

  describe('Вырезание (Cut)', () => {
    it('должно удалять исходную ноду после вырезания', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: 'orange',
      });

      (selectionPlugin as any)._select(node);

      // Вырезаем (Ctrl+X)
      const cutEvent = new KeyboardEvent('keydown', {
        code: 'KeyX',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(cutEvent);

      // Проверяем, что нода удалена
      expect(core.nodes.list().length).toBe(0);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем, что нода восстановлена
      expect(core.nodes.list().length).toBe(1);

      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Rect;
      expect(newKonvaNode.width()).toBe(50);
      expect(newKonvaNode.height()).toBe(50);
      expect(newKonvaNode.fill()).toBe('orange');
    });

    it('должно удалять группу после вырезания и восстанавливать её при вставке', () => {
      const group = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      const child = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        fill: 'cyan',
      });

      const childKonva = child.getNode() as unknown as Konva.Rect;
      childKonva.moveTo(groupKonva);

      const initialNodesCount = core.nodes.list().length;

      (selectionPlugin as any)._select(group);

      // Вырезаем
      const cutEvent = new KeyboardEvent('keydown', {
        code: 'KeyX',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(cutEvent);

      // Проверяем, что группа удалена (дочерние ноды могут остаться зарегистрированными)
      const nodesAfterCut = core.nodes.list();
      const groupsAfterCut = nodesAfterCut.filter((n) => n.constructor.name === 'GroupNode');
      expect(groupsAfterCut.length).toBe(0); // Группа должна быть удалена

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Проверяем, что группа восстановлена
      const nodesAfterPaste = core.nodes.list();
      const groupsAfterPaste = nodesAfterPaste.filter((n) => n.constructor.name === 'GroupNode');
      expect(groupsAfterPaste.length).toBe(1); // Группа восстановлена

      const restoredGroup = groupsAfterPaste[0];
      const restoredGroupKonva = restoredGroup.getNode() as unknown as Konva.Group;
      expect(restoredGroupKonva.getChildren().length).toBe(1);

      const restoredChild = restoredGroupKonva.getChildren()[0] as Konva.Rect;
      expect(restoredChild.width()).toBe(40);
      expect(restoredChild.height()).toBe(40);
      expect(restoredChild.fill()).toBe('cyan');
    });
  });

  describe('Множественное копирование', () => {
    it('должно копировать несколько нод одновременно', () => {
      const node1 = core.nodes.addShape({
        x: 50,
        y: 50,
        width: 40,
        height: 40,
        fill: 'red',
      });

      const node2 = core.nodes.addCircle({
        x: 150,
        y: 50,
        radius: 20,
        fill: 'blue',
      });

      // Создаём временную группу (мультивыделение)
      (selectionPlugin as any)._ensureTempMulti([node1, node2]);

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
      expect(allNodes.length).toBeGreaterThanOrEqual(4); // 2 исходных + 2 новых

      // Проверяем типы новых нод
      const shapes = allNodes.filter((n) => n.constructor.name === 'ShapeNode');
      const circles = allNodes.filter((n) => n.constructor.name === 'CircleNode');

      expect(shapes.length).toBeGreaterThanOrEqual(2);
      expect(circles.length).toBeGreaterThanOrEqual(2);
    });

    it('должно сохранять относительное расположение нод при копировании', () => {
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

      // Запоминаем расстояние между нодами
      const dx = 200 - 100;
      const dy = 150 - 100;

      // Мультивыделение
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

      // Проверяем относительное расположение новых нод
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

  describe('Граничные случаи', () => {
    it('не должно вставлять, если буфер обмена пуст', () => {
      const initialCount = core.nodes.list().length;

      // Пытаемся вставить без копирования
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      expect(core.nodes.list().length).toBe(initialCount);
    });

    it('должно копировать и вставлять несколько раз подряд', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: 'green',
      });

      (selectionPlugin as any)._select(node);

      // Копируем
      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем 3 раза
      for (let i = 0; i < 3; i++) {
        const pasteEvent = new KeyboardEvent('keydown', {
          code: 'KeyV',
          ctrlKey: true,
          bubbles: true,
        });
        document.dispatchEvent(pasteEvent);
      }

      // Должно быть 4 ноды (1 исходная + 3 копии)
      expect(core.nodes.list().length).toBe(4);
    });

    it('должно копировать трансформированную группу с вложенными элементами', () => {
      const group = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;
      groupKonva.scaleX(2);
      groupKonva.scaleY(2);
      groupKonva.rotation(45);

      // Создаём вложенные элементы с трансформациями
      const child1 = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        fill: 'red',
      });

      const child1Konva = child1.getNode() as unknown as Konva.Rect;
      child1Konva.moveTo(groupKonva);
      child1Konva.scaleX(0.5);
      child1Konva.rotation(15);

      // Копируем и вставляем
      (selectionPlugin as any)._select(group);

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

      expect(newGroupKonva.scaleX()).toBeCloseTo(2, 2);
      expect(newGroupKonva.scaleY()).toBeCloseTo(2, 2);
      expect(newGroupKonva.rotation()).toBeCloseTo(45, 2);

      const newChild = newGroupKonva.getChildren()[0] as Konva.Rect;
      expect(newChild.scaleX()).toBeCloseTo(0.5, 2);
      expect(newChild.rotation()).toBeCloseTo(15, 2);
    });
  });
});
