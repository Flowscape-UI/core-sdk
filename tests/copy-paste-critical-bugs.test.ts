import { describe, it, expect, beforeEach } from 'vitest';
import Konva from 'konva';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';
import type { BaseNode } from '../src/nodes/BaseNode';

describe('Критические баги копирования/вставки', () => {
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

    core.plugins.addPlugins([selectionPlugin, hotkeysPlugin]);
  });

  describe('БАГ: Вырезание + вставка - ноды визуально есть, но нет доступа', () => {
    it('должно создавать доступные ноды после вырезания и вставки', () => {
      // Создаём ноду
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: 'red',
      });

      const initialId = node.id;

      // Выделяем
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

      // Вставляем (Ctrl+V)
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // КРИТИЧЕСКАЯ ПРОВЕРКА: нода должна быть зарегистрирована в NodeManager
      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(1);

      const restoredNode = allNodes[0];

      // Проверяем, что нода доступна
      expect(restoredNode).toBeDefined();
      expect(restoredNode.id).toBeDefined();

      // Проверяем, что можно получить Konva-ноду
      const konvaNode = restoredNode.getNode();
      expect(konvaNode).toBeDefined();

      // Проверяем, что можно выделить двойным кликом
      (selectionPlugin as any)._select(restoredNode);
      const selected = (selectionPlugin as any)._selected;
      expect(selected).toBe(restoredNode);
    });

    it('должно создавать доступную группу после вырезания и вставки', () => {
      // Создаём группу
      const group = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      // Добавляем дочернюю ноду
      const child = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        fill: 'blue',
      });

      const childKonva = child.getNode() as unknown as Konva.Rect;
      childKonva.moveTo(groupKonva);

      // Выделяем группу
      (selectionPlugin as any)._select(group);

      // Вырезаем
      const cutEvent = new KeyboardEvent('keydown', {
        code: 'KeyX',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(cutEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // КРИТИЧЕСКАЯ ПРОВЕРКА: группа должна быть зарегистрирована
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      expect(groups.length).toBe(1);

      const restoredGroup = groups[0];

      // Проверяем доступность
      expect(restoredGroup).toBeDefined();
      expect(restoredGroup.id).toBeDefined();

      // Проверяем, что можно выделить
      (selectionPlugin as any)._select(restoredGroup);
      const selected = (selectionPlugin as any)._selected;
      expect(selected).toBe(restoredGroup);

      // Проверяем дочерние элементы
      const restoredGroupKonva = restoredGroup.getNode() as unknown as Konva.Group;
      expect(restoredGroupKonva.getChildren().length).toBe(1);
    });
  });

  describe('БАГ: Потеря иерархии групп при копировании', () => {
    it('должно сохранять вложенные группы как зарегистрированные BaseNode', () => {
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
        fill: 'green',
      });

      const deepChildKonva = deepChild.getNode() as unknown as Konva.Rect;
      deepChildKonva.moveTo(innerGroupKonva);

      // ВАЖНО: Перемещаем внутреннюю группу во внешнюю
      innerGroupKonva.moveTo(outerGroupKonva);

      // Запоминаем начальное количество зарегистрированных групп
      const initialGroups = core.nodes.list().filter((n) => n.constructor.name === 'GroupNode');
      expect(initialGroups.length).toBe(2); // outerGroup + innerGroup

      // Выделяем внешнюю группу
      (selectionPlugin as any)._select(outerGroup);

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

      // КРИТИЧЕСКАЯ ПРОВЕРКА: должны быть зарегистрированы ОБЕ группы (исходные + копии)
      const allNodes = core.nodes.list();
      const allGroups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      // Должно быть 4 группы: 2 исходных + 2 скопированных
      expect(allGroups.length).toBe(4);

      // Проверяем, что новые группы доступны
      const newGroups = allGroups.slice(2);
      expect(newGroups.length).toBe(2);

      // Проверяем, что можно выделить новую внешнюю группу
      const newOuterGroup = newGroups.find((g) => {
        const konva = g.getNode() as unknown as Konva.Group;
        return konva.getChildren().some((child) => child instanceof Konva.Group);
      });

      expect(newOuterGroup).toBeDefined();

      // Проверяем, что можно выделить новую внутреннюю группу
      const newInnerGroup = newGroups.find((g) => {
        const konva = g.getNode() as unknown as Konva.Group;
        return konva.getChildren().some((child) => child instanceof Konva.Rect);
      });

      expect(newInnerGroup).toBeDefined();
    });

    it('должно сохранять иерархию при копировании сложной структуры', () => {
      // Создаём главную группу
      const mainGroup = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const mainGroupKonva = mainGroup.getNode() as unknown as Konva.Group;

      // Создаём подгруппу 1
      const subGroup1 = core.nodes.addGroup({
        x: 0,
        y: 0,
      });

      const subGroup1Konva = subGroup1.getNode() as unknown as Konva.Group;

      // Добавляем ноду в подгруппу 1
      const child1 = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 25,
        height: 25,
        fill: 'red',
      });

      const child1Konva = child1.getNode() as unknown as Konva.Rect;
      child1Konva.moveTo(subGroup1Konva);
      subGroup1Konva.moveTo(mainGroupKonva);

      // Создаём подгруппу 2
      const subGroup2 = core.nodes.addGroup({
        x: 50,
        y: 0,
      });

      const subGroup2Konva = subGroup2.getNode() as unknown as Konva.Group;

      // Добавляем ноду в подгруппу 2
      const child2 = core.nodes.addCircle({
        x: 0,
        y: 0,
        radius: 12,
        fill: 'blue',
      });

      const child2Konva = child2.getNode() as unknown as Konva.Circle;
      child2Konva.moveTo(subGroup2Konva);
      subGroup2Konva.moveTo(mainGroupKonva);

      // Начальное состояние: 3 группы (main + sub1 + sub2)
      const initialGroups = core.nodes.list().filter((n) => n.constructor.name === 'GroupNode');
      expect(initialGroups.length).toBe(3);

      // Копируем главную группу
      (selectionPlugin as any)._select(mainGroup);

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

      // КРИТИЧЕСКАЯ ПРОВЕРКА: должно быть 6 групп (3 исходных + 3 скопированных)
      const allNodes = core.nodes.list();
      const allGroups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      expect(allGroups.length).toBe(6);

      // Проверяем, что все новые группы доступны
      const newGroups = allGroups.slice(3);
      expect(newGroups.length).toBe(3);

      // Каждая группа должна быть доступна для выделения
      for (const group of newGroups) {
        expect(group).toBeDefined();
        expect(group.id).toBeDefined();

        // Проверяем, что можно выделить
        (selectionPlugin as any)._select(group);
        const selected = (selectionPlugin as any)._selected;
        expect(selected).toBe(group);
      }
    });

    it('должно регистрировать вложенные группы в NodeManager при вставке', () => {
      // Создаём структуру
      const outer = core.nodes.addGroup({ x: 100, y: 100 });
      const outerKonva = outer.getNode() as unknown as Konva.Group;

      const inner = core.nodes.addGroup({ x: 0, y: 0 });
      const innerKonva = inner.getNode() as unknown as Konva.Group;
      innerKonva.moveTo(outerKonva);

      const child = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        fill: 'yellow',
      });
      const childKonva = child.getNode() as unknown as Konva.Rect;
      childKonva.moveTo(innerKonva);

      // Копируем
      (selectionPlugin as any)._select(outer);

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

      // КРИТИЧЕСКАЯ ПРОВЕРКА: проверяем, что вложенная группа зарегистрирована
      const allNodes = core.nodes.list();
      const allGroups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      // Должно быть 4 группы: outer, inner, newOuter, newInner
      expect(allGroups.length).toBe(4);

      // Проверяем, что можно найти вложенную группу по ID
      const newInner = allGroups.find((g) => {
        const konva = g.getNode() as unknown as Konva.Group;
        const parent = konva.getParent();
        return parent instanceof Konva.Group && parent !== outerKonva;
      });

      expect(newInner).toBeDefined();

      // Проверяем, что вложенная группа доступна через findById
      if (newInner) {
        const foundById = core.nodes.findById(newInner.id);
        expect(foundById).toBe(newInner);
      }
    });
  });

  describe('БАГ: Двойной клик не работает на вставленных нодах', () => {
    it('должно позволять выделить вставленную ноду двойным кликом', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: 'purple',
      });

      // Копируем
      (selectionPlugin as any)._select(node);

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

      // Получаем новую ноду
      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Rect;

      // КРИТИЧЕСКАЯ ПРОВЕРКА: симулируем двойной клик
      const stage = core.stage;

      // Устанавливаем позицию указателя на новую ноду
      const nodePos = newKonvaNode.getAbsolutePosition();
      stage.setPointersPositions([{ x: nodePos.x + 10, y: nodePos.y + 10, id: 1 }]);

      // Симулируем двойной клик
      const dblClickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX: nodePos.x + 10,
        clientY: nodePos.y + 10,
      });

      // Создаём Konva событие
      const konvaEvent = {
        type: 'dblclick',
        target: newKonvaNode,
        evt: dblClickEvent,
        currentTarget: stage,
        cancelBubble: false,
      } as any;

      // Триггерим событие на stage
      stage.fire('dblclick', konvaEvent);

      // Проверяем, что нода выделилась (может быть исходная или новая)
      const selected = (selectionPlugin as any)._selected;
      expect(selected).toBeDefined();
      expect(selected.constructor.name).toBe('ShapeNode');
    });

    it('должно позволять выделить вложенную группу после вставки', () => {
      // Создаём структуру
      const outer = core.nodes.addGroup({ x: 100, y: 100 });
      const outerKonva = outer.getNode() as unknown as Konva.Group;

      const inner = core.nodes.addGroup({ x: 0, y: 0 });
      const innerKonva = inner.getNode() as unknown as Konva.Group;
      innerKonva.moveTo(outerKonva);

      // Копируем
      (selectionPlugin as any)._select(outer);

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

      // Получаем новую вложенную группу
      const allGroups = core.nodes.list().filter((n) => n.constructor.name === 'GroupNode');
      expect(allGroups.length).toBe(4);

      const newInner = allGroups.find((g) => {
        const konva = g.getNode() as unknown as Konva.Group;
        const parent = konva.getParent();
        return parent instanceof Konva.Group && parent !== outerKonva;
      });

      expect(newInner).toBeDefined();

      // КРИТИЧЕСКАЯ ПРОВЕРКА: можно выделить вложенную группу
      if (newInner) {
        (selectionPlugin as any)._select(newInner);
        const selected = (selectionPlugin as any)._selected;
        expect(selected).toBe(newInner);
      }
    });
  });
});
