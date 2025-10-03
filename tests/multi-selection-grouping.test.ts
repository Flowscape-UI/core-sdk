import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import Konva from 'konva';

describe('Multi-Selection and Grouping (Ctrl+Click, Ctrl+G, Ctrl+Shift+G)', () => {
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

  describe('Мультивыделение (Ctrl+Click)', () => {
    it('должно создавать временную группу при выделении нескольких нод через Ctrl+Click', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      // Симулируем Ctrl+Click на первую ноду
      simulateClick(node1Konva, { ctrlKey: true });

      // Симулируем Ctrl+Click на вторую ноду
      simulateClick(node2Konva, { ctrlKey: true });

      // Проверяем, что создана временная группа
      const tempGroup = core.stage.findOne('.temp-multi-group');
      expect(tempGroup).toBeDefined();
      expect(tempGroup).not.toBeNull();

      if (tempGroup) {
        const children = (tempGroup as any).getChildren();
        // Фильтруем служебные элементы (transformer, label, hit-rect)
        const userNodes = children.filter((child: any) => {
          const name = child.name();
          return (
            !name ||
            (!name.includes('transformer') && !name.includes('label') && !name.includes('hit'))
          );
        });
        expect(userNodes.length).toBe(2);
      }
    });

    it('должно добавлять ноды в существующую временную группу при Ctrl+Click', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });
      const node3 = core.nodes.addShape({ x: 400, y: 100, width: 100, height: 100, fill: 'green' });

      simulateClick(node1.getNode(), { ctrlKey: true });
      simulateClick(node2.getNode(), { ctrlKey: true });

      let tempGroup = core.stage.findOne('.temp-multi-group');
      let children = (tempGroup as any)?.getChildren() || [];
      let userNodes = children.filter((child: any) => {
        const name = child.name();
        return (
          !name ||
          (!name.includes('transformer') && !name.includes('label') && !name.includes('hit'))
        );
      });
      expect(userNodes.length).toBe(2);

      // Добавляем третью ноду
      simulateClick(node3.getNode(), { ctrlKey: true });

      tempGroup = core.stage.findOne('.temp-multi-group');
      children = (tempGroup as any)?.getChildren() || [];
      userNodes = children.filter((child: any) => {
        const name = child.name();
        return (
          !name ||
          (!name.includes('transformer') && !name.includes('label') && !name.includes('hit'))
        );
      });
      expect(userNodes.length).toBe(3);
    });

    // TODO: Тест на удаление ноды из временной группы - требует доработки логики в SelectionPlugin

    it('должно сохранять позиции нод при создании временной группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 150, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const originalPos1 = node1Konva.getAbsolutePosition();
      const originalPos2 = node2Konva.getAbsolutePosition();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });

      const newPos1 = node1Konva.getAbsolutePosition();
      const newPos2 = node2Konva.getAbsolutePosition();

      expect(newPos1.x).toBeCloseTo(originalPos1.x, 1);
      expect(newPos1.y).toBeCloseTo(originalPos1.y, 1);
      expect(newPos2.x).toBeCloseTo(originalPos2.x, 1);
      expect(newPos2.y).toBeCloseTo(originalPos2.y, 1);
    });

    it('должно сохранять размеры нод при создании временной группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 150, height: 120, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 300, y: 100, width: 200, height: 180, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const originalWidth1 = node1Konva.width();
      const originalHeight1 = node1Konva.height();
      const originalWidth2 = node2Konva.width();
      const originalHeight2 = node2Konva.height();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });

      expect(node1Konva.width()).toBe(originalWidth1);
      expect(node1Konva.height()).toBe(originalHeight1);
      expect(node2Konva.width()).toBe(originalWidth2);
      expect(node2Konva.height()).toBe(originalHeight2);
    });
  });

  describe('Группировка (Ctrl+G)', () => {
    it('должно создавать постоянную группу из временной группы при Ctrl+G', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      // Создаём временную группу
      simulateClick(node1.getNode(), { ctrlKey: true });
      simulateClick(node2.getNode(), { ctrlKey: true });

      const tempGroup = core.stage.findOne('.temp-multi-group');
      expect(tempGroup).not.toBeNull();

      // Симулируем Ctrl+G
      simulateKeyPress('KeyG', { ctrlKey: true });

      // Временная группа должна исчезнуть
      const tempGroupAfter = core.stage.findOne('.temp-multi-group');
      expect(tempGroupAfter).toBeUndefined();

      // Должна появиться постоянная группа
      const permanentGroups = core.nodes.list().filter((n) => n.constructor.name === 'GroupNode');
      expect(permanentGroups.length).toBeGreaterThan(0);
    });

    it('должно сохранять позиции нод при создании постоянной группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 150, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const originalPos1 = node1Konva.getAbsolutePosition();
      const originalPos2 = node2Konva.getAbsolutePosition();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const newPos1 = node1Konva.getAbsolutePosition();
      const newPos2 = node2Konva.getAbsolutePosition();

      expect(newPos1.x).toBeCloseTo(originalPos1.x, 1);
      expect(newPos1.y).toBeCloseTo(originalPos1.y, 1);
      expect(newPos2.x).toBeCloseTo(originalPos2.x, 1);
      expect(newPos2.y).toBeCloseTo(originalPos2.y, 1);
    });

    it('должно сохранять размеры нод при создании постоянной группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 150, height: 120, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 300, y: 100, width: 200, height: 180, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const originalWidth1 = node1Konva.width();
      const originalHeight1 = node1Konva.height();
      const originalWidth2 = node2Konva.width();
      const originalHeight2 = node2Konva.height();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      expect(node1Konva.width()).toBe(originalWidth1);
      expect(node1Konva.height()).toBe(originalHeight1);
      expect(node2Konva.width()).toBe(originalWidth2);
      expect(node2Konva.height()).toBe(originalHeight2);
    });

    it('должно сохранять трансформации нод при создании постоянной группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      // Применяем трансформации
      node1Konva.scaleX(1.5);
      node1Konva.scaleY(1.2);
      node1Konva.rotation(30);
      node2Konva.scaleX(2);
      node2Konva.scaleY(1.8);

      const originalScale1X = node1Konva.scaleX();
      const originalScale1Y = node1Konva.scaleY();
      const originalRotation1 = node1Konva.rotation();
      const originalScale2X = node2Konva.scaleX();
      const originalScale2Y = node2Konva.scaleY();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      expect(node1Konva.scaleX()).toBeCloseTo(originalScale1X, 5);
      expect(node1Konva.scaleY()).toBeCloseTo(originalScale1Y, 5);
      expect(node1Konva.rotation()).toBeCloseTo(originalRotation1, 5);
      expect(node2Konva.scaleX()).toBeCloseTo(originalScale2X, 5);
      expect(node2Konva.scaleY()).toBeCloseTo(originalScale2Y, 5);
    });

    it('должно делать ноды в группе недоступными для перетаскивания', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      // До группировки ноды должны быть draggable
      expect(node1Konva.draggable()).toBe(true);
      expect(node2Konva.draggable()).toBe(true);

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      // После группировки ноды НЕ должны быть draggable
      expect(node1Konva.draggable()).toBe(false);
      expect(node2Konva.draggable()).toBe(false);
    });

    it('должно сохранять связь нод в группе при перетаскивании группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      // Находим созданную группу
      const groups = core.nodes.list().filter((n) => n.constructor.name === 'GroupNode');
      expect(groups.length).toBeGreaterThan(0);

      const group = groups[groups.length - 1];
      const groupKonva = group.getNode() as any;

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

      // Обе ноды должны переместиться на одинаковое расстояние
      const delta1X = newPos1.x - originalPos1.x;
      const delta1Y = newPos1.y - originalPos1.y;
      const delta2X = newPos2.x - originalPos2.x;
      const delta2Y = newPos2.y - originalPos2.y;

      expect(delta1X).toBeCloseTo(delta2X, 1);
      expect(delta1Y).toBeCloseTo(delta2Y, 1);
    });

    it('НЕ должно создавать группу из одной ноды', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });

      simulateClick(node1.getNode(), { ctrlKey: true });

      const groupsCountBefore = core.nodes
        .list()
        .filter((n) => n.constructor.name === 'GroupNode').length;

      simulateKeyPress('KeyG', { ctrlKey: true });

      const groupsCountAfter = core.nodes
        .list()
        .filter((n) => n.constructor.name === 'GroupNode').length;

      // Количество групп не должно измениться
      expect(groupsCountAfter).toBe(groupsCountBefore);
    });
  });

  describe('Разгруппировка (Ctrl+Shift+G)', () => {
    it('должно разгруппировывать выбранную группу при Ctrl+Shift+G', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      // Создаём группу
      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const groupsCountBefore = core.nodes
        .list()
        .filter((n) => n.constructor.name === 'GroupNode').length;

      // Выбираем группу и разгруппировываем
      const group = core.nodes.list().filter((n) => n.constructor.name === 'GroupNode')[
        groupsCountBefore - 1
      ];
      simulateClick(group.getNode(), { ctrlKey: false });
      simulateKeyPress('KeyG', { ctrlKey: true, shiftKey: true });

      const groupsCountAfter = core.nodes
        .list()
        .filter((n) => n.constructor.name === 'GroupNode').length;

      // Группа должна быть удалена
      expect(groupsCountAfter).toBe(groupsCountBefore - 1);
    });

    it('должно сохранять позиции нод при разгруппировке', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 150, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const posBeforeUngroup1 = node1Konva.getAbsolutePosition();
      const posBeforeUngroup2 = node2Konva.getAbsolutePosition();

      // Разгруппировываем
      const group = core.nodes
        .list()
        .filter((n) => n.constructor.name === 'GroupNode')
        .pop();
      if (group) {
        simulateClick(group.getNode(), { ctrlKey: false });
        simulateKeyPress('KeyG', { ctrlKey: true, shiftKey: true });
      }

      const posAfterUngroup1 = node1Konva.getAbsolutePosition();
      const posAfterUngroup2 = node2Konva.getAbsolutePosition();

      expect(posAfterUngroup1.x).toBeCloseTo(posBeforeUngroup1.x, 1);
      expect(posAfterUngroup1.y).toBeCloseTo(posBeforeUngroup1.y, 1);
      expect(posAfterUngroup2.x).toBeCloseTo(posBeforeUngroup2.x, 1);
      expect(posAfterUngroup2.y).toBeCloseTo(posBeforeUngroup2.y, 1);
    });

    it('должно сохранять размеры нод при разгруппировке', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 150, height: 120, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 300, y: 100, width: 200, height: 180, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      const originalWidth1 = node1Konva.width();
      const originalHeight1 = node1Konva.height();
      const originalWidth2 = node2Konva.width();
      const originalHeight2 = node2Konva.height();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const group = core.nodes
        .list()
        .filter((n) => n.constructor.name === 'GroupNode')
        .pop();
      if (group) {
        simulateClick(group.getNode(), { ctrlKey: false });
        simulateKeyPress('KeyG', { ctrlKey: true, shiftKey: true });
      }

      expect(node1Konva.width()).toBe(originalWidth1);
      expect(node1Konva.height()).toBe(originalHeight1);
      expect(node2Konva.width()).toBe(originalWidth2);
      expect(node2Konva.height()).toBe(originalHeight2);
    });

    it('должно делать ноды снова доступными для перетаскивания после разгруппировки', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      // После группировки ноды не draggable
      expect(node1Konva.draggable()).toBe(false);
      expect(node2Konva.draggable()).toBe(false);

      const group = core.nodes
        .list()
        .filter((n) => n.constructor.name === 'GroupNode')
        .pop();
      if (group) {
        simulateClick(group.getNode(), { ctrlKey: false });
        simulateKeyPress('KeyG', { ctrlKey: true, shiftKey: true });
      }

      // После разгруппировки ноды должны стать draggable
      expect(node1Konva.draggable()).toBe(true);
      expect(node2Konva.draggable()).toBe(true);
    });

    it('должно сохранять трансформации нод при разгруппировке трансформированной группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      // Применяем трансформации к нодам
      node1Konva.scaleX(1.5);
      node1Konva.scaleY(1.2);
      node2Konva.scaleX(2);

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const group = core.nodes
        .list()
        .filter((n) => n.constructor.name === 'GroupNode')
        .pop();

      if (group) {
        const groupKonva = group.getNode() as any;
        // Трансформируем группу
        groupKonva.scaleX(2);
        groupKonva.scaleY(2);
        groupKonva.rotation(45);

        const visualSizeBefore1 = node1Konva.getClientRect();
        const visualSizeBefore2 = node2Konva.getClientRect();

        simulateClick(groupKonva, { ctrlKey: false });
        simulateKeyPress('KeyG', { ctrlKey: true, shiftKey: true });

        const visualSizeAfter1 = node1Konva.getClientRect();
        const visualSizeAfter2 = node2Konva.getClientRect();

        // Визуальные размеры должны остаться прежними
        expect(visualSizeAfter1.width).toBeCloseTo(visualSizeBefore1.width, 1);
        expect(visualSizeAfter1.height).toBeCloseTo(visualSizeBefore1.height, 1);
        expect(visualSizeAfter2.width).toBeCloseTo(visualSizeBefore2.width, 1);
        expect(visualSizeAfter2.height).toBeCloseTo(visualSizeBefore2.height, 1);
      }
    });
  });

  describe('Баги с группировкой', () => {
    it('БАГ: ноды в группе должны оставаться связанными при попытке перетаскивания отдельной ноды', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const originalParent1 = node1Konva.getParent();
      const originalParent2 = node2Konva.getParent();

      // Проверяем, что обе ноды в одной группе
      expect(originalParent1).toBe(originalParent2);
      expect(originalParent1?.getClassName()).toBe('Group');

      // Симулируем попытку перетаскивания первой ноды
      simulateDragStart(node1Konva);

      // Родитель не должен измениться
      expect(node1Konva.getParent()).toBe(originalParent1);
      expect(node2Konva.getParent()).toBe(originalParent2);

      // Обе ноды должны остаться в группе
      const group = originalParent1 as any;
      const children = group.getChildren();
      expect(children).toContain(node1Konva);
      expect(children).toContain(node2Konva);
    });

    it('БАГ: при Ctrl+Click на ноду в группе не должна обрываться связь', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const group = node1Konva.getParent();

      // Симулируем Ctrl+Click на ноду в группе
      simulateClick(node1Konva, { ctrlKey: true });

      // Нода должна остаться в группе
      expect(node1Konva.getParent()).toBe(group);
      expect(node2Konva.getParent()).toBe(group);
    });

    it('БАГ: при наведении на ноду в группе должна подсвечиваться вся группа', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const group = node1Konva.getParent();

      // Симулируем наведение на первую ноду
      simulateMouseOver(node1Konva);

      // Должен быть hover-transformer на группе, а не на отдельной ноде
      const hoverTransformer = core.nodes.layer.findOne('.hover-transformer');

      if (hoverTransformer) {
        const nodes = (hoverTransformer as any).nodes();
        // Transformer должен быть привязан к группе
        expect(nodes.length).toBe(1);
        expect(nodes[0]).toBe(group);
      }
    });
  });

  // Вспомогательные функции
  function simulateClick(target: any, options: { ctrlKey?: boolean } = {}) {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: options.ctrlKey || false,
      button: 0,
    });

    // Симулируем клик через Konva
    target.fire('click', { evt: event, target }, true);
  }

  function simulateKeyPress(code: string, options: { ctrlKey?: boolean; shiftKey?: boolean } = {}) {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code,
      ctrlKey: options.ctrlKey || false,
      shiftKey: options.shiftKey || false,
    });

    window.dispatchEvent(event);
  }

  function simulateDragStart(target: any) {
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });

    target.fire('dragstart', { evt: event, target }, true);
  }

  function simulateMouseOver(target: any) {
    const event = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
    });

    target.fire('mouseover', { evt: event, target }, true);
  }
});
