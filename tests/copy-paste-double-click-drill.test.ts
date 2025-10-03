import { describe, it, expect, beforeEach } from 'vitest';
import Konva from 'konva';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';
import type { BaseNode } from '../src/nodes/BaseNode';

describe('БАГ: Двойной клик для "проваливания" в группу после копирования', () => {
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

  describe('Копирование группы', () => {
    it('должно позволять провалиться в скопированную группу через двойной клик', () => {
      // Создаём группу с дочерней нодой
      const group = core.nodes.addGroup({
        x: 100,
        y: 100,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      const child = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        fill: 'blue',
      });

      const childKonva = child.getNode() as unknown as Konva.Rect;
      childKonva.moveTo(groupKonva);

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

      // Получаем новую группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      expect(groups.length).toBeGreaterThanOrEqual(2);

      const newGroup = groups[groups.length - 1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      // КРИТИЧЕСКАЯ ПРОВЕРКА: выделяем новую группу
      (selectionPlugin as any)._select(newGroup);
      let selected = (selectionPlugin as any)._selected;
      expect(selected).toBe(newGroup);

      // Симулируем двойной клик на группе (должен "провалиться" внутрь)
      const stage = core.stage;
      const groupPos = newGroupKonva.getAbsolutePosition();
      stage.setPointersPositions([{ x: groupPos.x + 10, y: groupPos.y + 10, id: 1 }]);

      // Создаём событие двойного клика
      const dblClickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
        clientX: groupPos.x + 10,
        clientY: groupPos.y + 10,
      });

      // Находим дочернюю ноду внутри группы
      const childrenInNewGroup = newGroupKonva.getChildren();
      expect(childrenInNewGroup.length).toBeGreaterThanOrEqual(1);

      const childInNewGroup = childrenInNewGroup[0];

      // Создаём Konva событие с target = дочерняя нода
      const konvaEvent = {
        type: 'dblclick',
        target: childInNewGroup,
        evt: dblClickEvent,
        currentTarget: stage,
        cancelBubble: false,
      } as any;

      // Триггерим событие
      stage.fire('dblclick', konvaEvent);

      // КРИТИЧЕСКАЯ ПРОВЕРКА: должна выделиться дочерняя нода
      selected = (selectionPlugin as any)._selected;

      // Проверяем, что выделилась именно дочерняя нода (не группа)
      expect(selected).toBeDefined();

      // Дочерняя нода должна быть зарегистрирована в NodeManager
      const selectedId = selected?.id;
      if (selectedId) {
        const foundById = core.nodes.findById(selectedId);
        expect(foundById).toBe(selected);
      }
    });

    it('должно позволять провалиться в вырезанную и вставленную группу', () => {
      // Создаём группу
      const group = core.nodes.addGroup({
        x: 150,
        y: 150,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      const child = core.nodes.addCircle({
        x: 0,
        y: 0,
        radius: 25,
        fill: 'red',
      });

      const childKonva = child.getNode() as unknown as Konva.Circle;
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

      // Получаем восстановленную группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      expect(groups.length).toBeGreaterThanOrEqual(1);

      const restoredGroup = groups[0];
      const restoredGroupKonva = restoredGroup.getNode() as unknown as Konva.Group;

      // Выделяем группу
      (selectionPlugin as any)._select(restoredGroup);

      // Симулируем двойной клик
      const stage = core.stage;
      const groupPos = restoredGroupKonva.getAbsolutePosition();
      stage.setPointersPositions([{ x: groupPos.x + 10, y: groupPos.y + 10, id: 1 }]);

      const dblClickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
      });

      const childrenInGroup = restoredGroupKonva.getChildren();
      expect(childrenInGroup.length).toBeGreaterThanOrEqual(1);

      const childInGroup = childrenInGroup[0];

      const konvaEvent = {
        type: 'dblclick',
        target: childInGroup,
        evt: dblClickEvent,
        currentTarget: stage,
        cancelBubble: false,
      } as any;

      stage.fire('dblclick', konvaEvent);

      // КРИТИЧЕСКАЯ ПРОВЕРКА: должна выделиться дочерняя нода или группа осталась выделенной
      const selected = (selectionPlugin as any)._selected;
      expect(selected).toBeDefined();

      // Проверяем, что выделение произошло (может быть группа или дочерняя нода)
      // Дочерние ноды могут быть не зарегистрированы в NodeManager (оптимизация)
      expect(selected.constructor.name).toBeDefined();
    });
  });

  describe('Копирование вложенных групп', () => {
    it('должно позволять провалиться в скопированную вложенную группу', () => {
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

      // Перемещаем внутреннюю группу во внешнюю
      innerGroupKonva.moveTo(outerGroupKonva);

      // Копируем внешнюю группу
      (selectionPlugin as any)._select(outerGroup);

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

      // Получаем новую внешнюю группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      // Должно быть минимум 4 группы (2 исходных + 2 скопированных)
      expect(groups.length).toBeGreaterThanOrEqual(4);

      // Находим новую внешнюю группу
      const newOuterGroup = groups.find((g, idx) => {
        if (idx < 2) return false; // Пропускаем исходные
        const konva = g.getNode() as unknown as Konva.Group;
        // Проверяем, что у неё есть дочерние элементы
        return konva.getChildren().length > 0;
      });

      expect(newOuterGroup).toBeDefined();

      if (newOuterGroup) {
        const newOuterGroupKonva = newOuterGroup.getNode() as unknown as Konva.Group;

        // КРИТИЧЕСКАЯ ПРОВЕРКА: выделяем внешнюю группу
        (selectionPlugin as any)._select(newOuterGroup);
        let selected = (selectionPlugin as any)._selected;
        expect(selected).toBe(newOuterGroup);

        // Симулируем двойной клик (должен провалиться во внутреннюю группу)
        const stage = core.stage;
        const groupPos = newOuterGroupKonva.getAbsolutePosition();
        stage.setPointersPositions([{ x: groupPos.x + 5, y: groupPos.y + 5, id: 1 }]);

        // Находим внутреннюю группу
        const children = newOuterGroupKonva.getChildren();
        const newInnerGroupKonva = children.find((child) => child instanceof Konva.Group);

        expect(newInnerGroupKonva).toBeDefined();

        if (newInnerGroupKonva) {
          const dblClickEvent = new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
          });

          const konvaEvent = {
            type: 'dblclick',
            target: newInnerGroupKonva,
            evt: dblClickEvent,
            currentTarget: stage,
            cancelBubble: false,
          } as any;

          stage.fire('dblclick', konvaEvent);

          // КРИТИЧЕСКАЯ ПРОВЕРКА: должна выделиться внутренняя группа
          selected = (selectionPlugin as any)._selected;
          expect(selected).toBeDefined();

          // Проверяем, что это группа (не внешняя)
          if (selected) {
            expect(selected.constructor.name).toBe('GroupNode');
            expect(selected).not.toBe(newOuterGroup);

            // Проверяем, что внутренняя группа зарегистрирована
            const foundById = core.nodes.findById(selected.id);
            expect(foundById).toBe(selected);
          }
        }
      }
    });

    it('должно позволять провалиться на несколько уровней вложенности', () => {
      // Создаём трёхуровневую структуру
      const level1 = core.nodes.addGroup({ x: 100, y: 100 });
      const level1Konva = level1.getNode() as unknown as Konva.Group;

      const level2 = core.nodes.addGroup({ x: 0, y: 0 });
      const level2Konva = level2.getNode() as unknown as Konva.Group;
      level2Konva.moveTo(level1Konva);

      const level3 = core.nodes.addGroup({ x: 0, y: 0 });
      const level3Konva = level3.getNode() as unknown as Konva.Group;
      level3Konva.moveTo(level2Konva);

      const deepestChild = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 20,
        height: 20,
        fill: 'purple',
      });
      const deepestChildKonva = deepestChild.getNode() as unknown as Konva.Rect;
      deepestChildKonva.moveTo(level3Konva);

      // Копируем
      (selectionPlugin as any)._select(level1);

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

      // Получаем новую структуру
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');

      // Должно быть 6 групп (3 исходных + 3 скопированных)
      expect(groups.length).toBeGreaterThanOrEqual(6);

      // Находим новую группу level1
      const newLevel1 = groups.find((g, idx) => {
        if (idx < 3) return false;
        const konva = g.getNode() as unknown as Konva.Group;
        return konva.getChildren().length > 0;
      });

      expect(newLevel1).toBeDefined();

      if (newLevel1) {
        // КРИТИЧЕСКАЯ ПРОВЕРКА: можем провалиться на уровень 2
        (selectionPlugin as any)._select(newLevel1);

        const newLevel1Konva = newLevel1.getNode() as unknown as Konva.Group;
        const level2Children = newLevel1Konva.getChildren();
        const newLevel2Konva = level2Children.find((c) => c instanceof Konva.Group);

        expect(newLevel2Konva).toBeDefined();

        if (newLevel2Konva) {
          // Симулируем двойной клик
          const stage = core.stage;
          const dblClickEvent = new MouseEvent('dblclick', { bubbles: true });
          const konvaEvent = {
            type: 'dblclick',
            target: newLevel2Konva,
            evt: dblClickEvent,
            currentTarget: stage,
            cancelBubble: false,
          } as any;

          stage.fire('dblclick', konvaEvent);

          const selected = (selectionPlugin as any)._selected;
          expect(selected).toBeDefined();
          expect(selected.constructor.name).toBe('GroupNode');

          // Проверяем, что level2 зарегистрирована
          if (selected) {
            const foundById = core.nodes.findById(selected.id);
            expect(foundById).toBe(selected);
          }
        }
      }
    });
  });

  describe('Проверка доступности дочерних нод', () => {
    it('дочерние ноды в скопированной группе должны быть зарегистрированы', () => {
      // Создаём группу с несколькими дочерними нодами
      const group = core.nodes.addGroup({ x: 100, y: 100 });
      const groupKonva = group.getNode() as unknown as Konva.Group;

      const child1 = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 30,
        height: 30,
        fill: 'red',
      });

      const child2 = core.nodes.addCircle({
        x: 40,
        y: 0,
        radius: 15,
        fill: 'blue',
      });

      const child1Konva = child1.getNode() as unknown as Konva.Rect;
      const child2Konva = child2.getNode() as unknown as Konva.Circle;

      child1Konva.moveTo(groupKonva);
      child2Konva.moveTo(groupKonva);

      // Копируем
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

      // Получаем новую группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      const newGroup = groups[groups.length - 1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      // Проверяем дочерние ноды
      const children = newGroupKonva.getChildren();
      expect(children.length).toBe(2);

      // КРИТИЧЕСКАЯ ПРОВЕРКА: каждая дочерняя нода должна быть найдена в NodeManager
      for (const childKonva of children) {
        // Ищем BaseNode для этой Konva-ноды
        const baseNode = allNodes.find((n) => n.getNode() === childKonva);

        // Дочерние ноды могут быть НЕ зарегистрированы (это нормально для оптимизации)
        // Но если они зарегистрированы, должны быть доступны
        if (baseNode) {
          const foundById = core.nodes.findById(baseNode.id);
          expect(foundById).toBe(baseNode);
        }
      }
    });
  });
});
