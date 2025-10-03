import { describe, it, expect, beforeEach } from 'vitest';
import Konva from 'konva';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';

describe('КРИТИЧЕСКИЙ БАГ: Нельзя провалиться в дочернюю ноду скопированной группы', () => {
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

  it('ИСХОДНАЯ ГРУППА: должно позволять провалиться к дочерней ноде через двойной клик', () => {
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

    // Проверяем, что дочерняя нода зарегистрирована
    const foundChild = core.nodes.findById(child.id);
    expect(foundChild).toBe(child);

    // Выделяем группу
    (selectionPlugin as any)._select(group);
    let selected = (selectionPlugin as any)._selected;
    expect(selected).toBe(group);

    // Симулируем двойной клик на дочерней ноде
    const stage = core.stage;
    const childPos = childKonva.getAbsolutePosition();
    stage.setPointersPositions([{ x: childPos.x + 10, y: childPos.y + 10, id: 1 }]);

    const dblClickEvent = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
    });

    const konvaEvent = {
      type: 'dblclick',
      target: childKonva,
      evt: dblClickEvent,
      currentTarget: stage,
      cancelBubble: false,
    } as any;

    stage.fire('dblclick', konvaEvent);

    // ПРОВЕРКА: должна выделиться дочерняя нода
    selected = (selectionPlugin as any)._selected;
    expect(selected).toBe(child);
    expect(selected.constructor.name).toBe('ShapeNode');
  });

  it('БАГ: СКОПИРОВАННАЯ ГРУППА - нельзя провалиться к дочерней ноде', () => {
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
      fill: 'red',
    });

    const childKonva = child.getNode() as unknown as Konva.Rect;
    childKonva.moveTo(groupKonva);

    // Копируем группу
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

    // Получаем новую группу
    const allNodes = core.nodes.list();
    const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
    expect(groups.length).toBe(2);

    const newGroup = groups[1];
    const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

    // Проверяем, что в новой группе есть дочерняя нода
    const childrenInNewGroup = newGroupKonva.getChildren();
    expect(childrenInNewGroup.length).toBe(1);

    const newChildKonva = childrenInNewGroup[0] as Konva.Rect;

    // КРИТИЧЕСКАЯ ПРОВЕРКА: дочерняя нода должна быть зарегистрирована в NodeManager
    const newChild = allNodes.find((n) => n.getNode() === newChildKonva);

    console.log('=== ОТЛАДКА ===');
    console.log('Всего нод в NodeManager:', allNodes.length);
    console.log(
      'Типы нод:',
      allNodes.map((n) => n.constructor.name),
    );
    console.log('Дочерняя Konva-нода существует:', !!newChildKonva);
    console.log('Дочерняя BaseNode найдена:', !!newChild);

    // БАГ: дочерняя нода НЕ зарегистрирована!
    expect(newChild).toBeDefined(); // ❌ Этот тест должен упасть, выявляя баг

    if (newChild) {
      // Выделяем группу
      (selectionPlugin as any)._select(newGroup);

      // Симулируем двойной клик на дочерней ноде
      const stage = core.stage;
      const childPos = newChildKonva.getAbsolutePosition();
      stage.setPointersPositions([{ x: childPos.x + 10, y: childPos.y + 10, id: 1 }]);

      const dblClickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
      });

      const konvaEvent = {
        type: 'dblclick',
        target: newChildKonva,
        evt: dblClickEvent,
        currentTarget: stage,
        cancelBubble: false,
      } as any;

      stage.fire('dblclick', konvaEvent);

      // ПРОВЕРКА: должна выделиться дочерняя нода
      const selected = (selectionPlugin as any)._selected;
      expect(selected).toBe(newChild);
      expect(selected.constructor.name).toBe('ShapeNode');
    }
  });

  it('БАГ: ВЫРЕЗАННАЯ ГРУППА - нельзя провалиться к дочерней ноде', () => {
    // Создаём группу с дочерней нодой
    const group = core.nodes.addGroup({
      x: 100,
      y: 100,
    });

    const groupKonva = group.getNode() as unknown as Konva.Group;

    const child = core.nodes.addCircle({
      x: 0,
      y: 0,
      radius: 25,
      fill: 'green',
    });

    const childKonva = child.getNode() as unknown as Konva.Circle;
    childKonva.moveTo(groupKonva);

    // Вырезаем группу
    (selectionPlugin as any)._select(group);

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

    // Проверяем дочернюю ноду
    const childrenInGroup = restoredGroupKonva.getChildren();
    expect(childrenInGroup.length).toBe(1);

    const restoredChildKonva = childrenInGroup[0] as Konva.Circle;

    // КРИТИЧЕСКАЯ ПРОВЕРКА: дочерняя нода должна быть зарегистрирована
    const restoredChild = allNodes.find((n) => n.getNode() === restoredChildKonva);

    console.log('=== ОТЛАДКА ВЫРЕЗАНИЯ ===');
    console.log('Всего нод:', allNodes.length);
    console.log('Дочерняя BaseNode найдена:', !!restoredChild);

    // БАГ: дочерняя нода НЕ зарегистрирована!
    expect(restoredChild).toBeDefined(); // ❌ Этот тест должен упасть

    if (restoredChild) {
      // Пытаемся провалиться
      (selectionPlugin as any)._select(restoredGroup);

      const stage = core.stage;
      const childPos = restoredChildKonva.getAbsolutePosition();
      stage.setPointersPositions([{ x: childPos.x + 10, y: childPos.y + 10, id: 1 }]);

      const dblClickEvent = new MouseEvent('dblclick', {
        bubbles: true,
        cancelable: true,
      });

      const konvaEvent = {
        type: 'dblclick',
        target: restoredChildKonva,
        evt: dblClickEvent,
        currentTarget: stage,
        cancelBubble: false,
      } as any;

      stage.fire('dblclick', konvaEvent);

      const selected = (selectionPlugin as any)._selected;
      expect(selected).toBe(restoredChild);
    }
  });

  it('БАГ: Дочерние ноды в скопированной группе НЕ зарегистрированы в NodeManager', () => {
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

    // Проверяем исходное состояние
    const initialNodes = core.nodes.list();
    console.log('=== ДО КОПИРОВАНИЯ ===');
    console.log('Всего нод:', initialNodes.length);
    console.log(
      'Типы:',
      initialNodes.map((n) => n.constructor.name),
    );

    const initialChild1 = initialNodes.find((n) => n.getNode() === child1Konva);
    const initialChild2 = initialNodes.find((n) => n.getNode() === child2Konva);

    expect(initialChild1).toBe(child1); // ✅ Исходные дочерние ноды зарегистрированы
    expect(initialChild2).toBe(child2); // ✅ Исходные дочерние ноды зарегистрированы

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

    // Проверяем после копирования
    const allNodes = core.nodes.list();
    console.log('=== ПОСЛЕ КОПИРОВАНИЯ ===');
    console.log('Всего нод:', allNodes.length);
    console.log(
      'Типы:',
      allNodes.map((n) => n.constructor.name),
    );

    const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
    const newGroup = groups[1];
    const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

    const newChildren = newGroupKonva.getChildren();
    expect(newChildren.length).toBe(2);

    const newChild1Konva = newChildren[0];
    const newChild2Konva = newChildren[1];

    // КРИТИЧЕСКАЯ ПРОВЕРКА: дочерние ноды в СКОПИРОВАННОЙ группе должны быть зарегистрированы
    const newChild1 = allNodes.find((n) => n.getNode() === newChild1Konva);
    const newChild2 = allNodes.find((n) => n.getNode() === newChild2Konva);

    console.log('Новая дочерняя нода 1 зарегистрирована:', !!newChild1);
    console.log('Новая дочерняя нода 2 зарегистрирована:', !!newChild2);

    // БАГ: дочерние ноды НЕ зарегистрированы!
    expect(newChild1).toBeDefined(); // ❌ Этот тест упадёт, выявляя баг
    expect(newChild2).toBeDefined(); // ❌ Этот тест упадёт, выявляя баг

    if (newChild1 && newChild2) {
      // Проверяем, что можно найти по ID
      const foundById1 = core.nodes.findById(newChild1.id);
      const foundById2 = core.nodes.findById(newChild2.id);

      expect(foundById1).toBe(newChild1);
      expect(foundById2).toBe(newChild2);
    }
  });
});
