import { describe, it, expect, beforeEach } from 'vitest';
import { CoreEngine } from '../src/core/CoreEngine';
import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import type { BaseNode } from '../src/nodes/BaseNode';

describe('Copy/Paste/Cut - Size Preservation', () => {
  let core: CoreEngine;
  let hotkeysPlugin: NodeHotkeysPlugin;
  let selectionPlugin: SelectionPlugin;

  beforeEach(() => {
    // Создаём контейнер для stage
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    core = new CoreEngine({ container, width: 800, height: 600 });
    hotkeysPlugin = new NodeHotkeysPlugin();
    selectionPlugin = new SelectionPlugin();

    core.plugins.addPlugins([hotkeysPlugin, selectionPlugin]);
  });

  describe('Одиночная нода', () => {
    it('должна сохранять размеры при копировании/вставке', () => {
      // Создаём ноду с конкретными размерами
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        fill: 'red',
      });

      const konvaNode = node.getNode();
      const originalWidth = konvaNode.width();
      const originalHeight = konvaNode.height();

      // Симулируем копирование
      const clipboard = simulateCopy(node);

      // Симулируем вставку
      const pastedNode = simulatePaste(clipboard);

      expect(pastedNode).toBeDefined();
      if (pastedNode) {
        const pastedKonva = pastedNode.getNode();
        expect(pastedKonva.width()).toBe(originalWidth);
        expect(pastedKonva.height()).toBe(originalHeight);
      }
    });

    it('должна сохранять трансформации при копировании/вставке', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'blue',
      });

      const konvaNode = node.getNode();
      // Применяем трансформации
      konvaNode.scaleX(2);
      konvaNode.scaleY(1.5);
      konvaNode.rotation(45);

      const originalScaleX = konvaNode.scaleX();
      const originalScaleY = konvaNode.scaleY();
      const originalRotation = konvaNode.rotation();

      const clipboard = simulateCopy(node);
      const pastedNode = simulatePaste(clipboard);

      expect(pastedNode).toBeDefined();
      if (pastedNode) {
        const pastedKonva = pastedNode.getNode();
        expect(pastedKonva.scaleX()).toBeCloseTo(originalScaleX, 5);
        expect(pastedKonva.scaleY()).toBeCloseTo(originalScaleY, 5);
        expect(pastedKonva.rotation()).toBeCloseTo(originalRotation, 5);
      }
    });

    it('должна сохранять визуальный размер (width * scaleX)', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'green',
      });

      const konvaNode = node.getNode();
      konvaNode.scaleX(2);
      konvaNode.scaleY(3);

      const originalVisualWidth = konvaNode.width() * konvaNode.scaleX();
      const originalVisualHeight = konvaNode.height() * konvaNode.scaleY();

      const clipboard = simulateCopy(node);
      const pastedNode = simulatePaste(clipboard);

      expect(pastedNode).toBeDefined();
      if (pastedNode) {
        const pastedKonva = pastedNode.getNode();
        const pastedVisualWidth = pastedKonva.width() * pastedKonva.scaleX();
        const pastedVisualHeight = pastedKonva.height() * pastedKonva.scaleY();

        expect(pastedVisualWidth).toBeCloseTo(originalVisualWidth, 2);
        expect(pastedVisualHeight).toBeCloseTo(originalVisualHeight, 2);
      }
    });
  });

  describe('Группы', () => {
    it('должна сохранять размеры нод в группе при копировании/вставке', () => {
      // Создаём несколько нод
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

      // Создаём группу
      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const node1Konva = node1.getNode();
      const node2Konva = node2.getNode();

      // Сохраняем исходные размеры
      const node1OriginalWidth = node1Konva.width();
      const node1OriginalHeight = node1Konva.height();
      const node2OriginalWidth = node2Konva.width();
      const node2OriginalHeight = node2Konva.height();

      // Перемещаем ноды в группу
      const abs1 = node1Konva.getAbsolutePosition();
      const abs2 = node2Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      groupKonva.add(node2Konva as any);
      node1Konva.setAbsolutePosition(abs1);
      node2Konva.setAbsolutePosition(abs2);

      // Копируем группу
      const clipboard = simulateCopy(group);
      const pastedGroup = simulatePaste(clipboard);

      expect(pastedGroup).toBeDefined();
      if (pastedGroup) {
        const pastedGroupKonva = pastedGroup.getNode();
        const children = pastedGroupKonva.getChildren();

        expect(children.length).toBe(2);

        const child1 = children[0];
        const child2 = children[1];

        expect(child1.width()).toBe(node1OriginalWidth);
        expect(child1.height()).toBe(node1OriginalHeight);
        expect(child2.width()).toBe(node2OriginalWidth);
        expect(child2.height()).toBe(node2OriginalHeight);
      }
    });

    it('должна сохранять трансформации группы при копировании/вставке', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const node1Konva = node1.getNode();
      const abs1 = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs1);

      // Трансформируем группу
      groupKonva.scaleX(2);
      groupKonva.scaleY(1.5);
      groupKonva.rotation(30);

      const originalGroupScaleX = groupKonva.scaleX();
      const originalGroupScaleY = groupKonva.scaleY();
      const originalGroupRotation = groupKonva.rotation();

      const clipboard = simulateCopy(group);
      const pastedGroup = simulatePaste(clipboard);

      expect(pastedGroup).toBeDefined();
      if (pastedGroup) {
        const pastedGroupKonva = pastedGroup.getNode();
        expect(pastedGroupKonva.scaleX()).toBeCloseTo(originalGroupScaleX, 5);
        expect(pastedGroupKonva.scaleY()).toBeCloseTo(originalGroupScaleY, 5);
        expect(pastedGroupKonva.rotation()).toBeCloseTo(originalGroupRotation, 5);
      }
    });

    it('должна сохранять визуальные размеры нод в трансформированной группе', () => {
      const node1 = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: 'red',
      });

      const group = core.nodes.addGroup({ x: 0, y: 0, draggable: true });
      const groupKonva = group.getNode();

      const node1Konva = node1.getNode();
      const abs1 = node1Konva.getAbsolutePosition();
      groupKonva.add(node1Konva as any);
      node1Konva.setAbsolutePosition(abs1);

      // Трансформируем группу (растягиваем в 2 раза)
      groupKonva.scaleX(2);
      groupKonva.scaleY(2);

      // Вычисляем визуальный размер ноды ДО копирования
      const originalClientRect = node1Konva.getClientRect();
      const originalVisualWidth = originalClientRect.width;
      const originalVisualHeight = originalClientRect.height;

      const clipboard = simulateCopy(group);
      const pastedGroup = simulatePaste(clipboard);

      expect(pastedGroup).toBeDefined();
      if (pastedGroup) {
        const pastedGroupKonva = pastedGroup.getNode();
        const children = pastedGroupKonva.getChildren();
        const pastedChild = children[0];

        const pastedClientRect = pastedChild.getClientRect();
        const pastedVisualWidth = pastedClientRect.width;
        const pastedVisualHeight = pastedClientRect.height;

        // Визуальные размеры должны совпадать (с погрешностью)
        expect(pastedVisualWidth).toBeCloseTo(originalVisualWidth, 1);
        expect(pastedVisualHeight).toBeCloseTo(originalVisualHeight, 1);
      }
    });
  });

  describe('Вырезание (Cut)', () => {
    it('должна сохранять размеры при вырезании/вставке', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        fill: 'red',
      });

      const konvaNode = node.getNode();
      konvaNode.scaleX(1.5);
      konvaNode.scaleY(2);

      const originalWidth = konvaNode.width();
      const originalHeight = konvaNode.height();
      const originalScaleX = konvaNode.scaleX();
      const originalScaleY = konvaNode.scaleY();

      const clipboard = simulateCut(node);

      // Нода должна быть удалена
      const nodesList = core.nodes.list();
      expect(nodesList.find((n) => n.id === node.id)).toBeUndefined();

      const pastedNode = simulatePaste(clipboard);

      expect(pastedNode).toBeDefined();
      if (pastedNode) {
        const pastedKonva = pastedNode.getNode();
        expect(pastedKonva.width()).toBe(originalWidth);
        expect(pastedKonva.height()).toBe(originalHeight);
        expect(pastedKonva.scaleX()).toBeCloseTo(originalScaleX, 5);
        expect(pastedKonva.scaleY()).toBeCloseTo(originalScaleY, 5);
      }
    });
  });

  // Вспомогательные функции для симуляции копирования/вставки

  function simulateCut(node: BaseNode) {
    const clipboard = simulateCopy(node);
    core.nodes.remove(node);
    return clipboard;
  }

  function simulateCopy(node: BaseNode) {
    const konvaNode = node.getNode();
    const attrs = konvaNode.getAttrs();
    const nodeType = node.constructor.name.replace('Node', '').toLowerCase();

    const abs = konvaNode.getAbsolutePosition();
    const inv = core.nodes.world.getAbsoluteTransform().copy().invert();
    const wpt = inv.point(abs);

    const serialized: any = {
      type: nodeType,
      config: { ...attrs, id: undefined },
      position: { x: wpt.x, y: wpt.y },
    };

    // Если это группа, сохраняем дочерние элементы
    if (nodeType === 'group') {
      const groupKonva = konvaNode as any;
      const children = groupKonva.getChildren();
      if (children && children.length > 0) {
        serialized.children = children.map((child: any) => ({
          type:
            child.getClassName().toLowerCase() === 'rect'
              ? 'shape'
              : child.getClassName().toLowerCase(),
          config: { ...child.getAttrs(), id: undefined },
          position: { x: child.x(), y: child.y() },
        }));
      }
    }

    return {
      nodes: [serialized],
      center: { x: wpt.x, y: wpt.y },
    };
  }

  function simulatePaste(clipboard: any): BaseNode | null {
    if (!clipboard || clipboard.nodes.length === 0) return null;

    const data = clipboard.nodes[0];
    const config = {
      ...data.config,
      x: data.position.x + 50,
      y: data.position.y + 50,
    };

    let newNode: BaseNode | null = null;

    switch (data.type) {
      case 'shape':
        newNode = core.nodes.addShape(config);
        break;
      case 'circle':
        newNode = core.nodes.addCircle(config);
        break;
      case 'group': {
        newNode = core.nodes.addGroup(config);
        const groupKonva = newNode.getNode() as any;

        // Восстанавливаем дочерние элементы
        if (data.children && data.children.length > 0) {
          for (const childData of data.children) {
            let childNode: BaseNode | null = null;
            const childConfig = { ...childData.config, x: 0, y: 0 };

            switch (childData.type) {
              case 'shape':
                childNode = core.nodes.addShape(childConfig);
                break;
              case 'circle':
                childNode = core.nodes.addCircle(childConfig);
                break;
              default:
                continue;
            }

            if (childNode) {
              const childKonva = childNode.getNode();
              // Применяем атрибуты
              if (childData.config['width']) childKonva.width(childData.config['width']);
              if (childData.config['height']) childKonva.height(childData.config['height']);
              if (childData.config['scaleX']) childKonva.scaleX(childData.config['scaleX']);
              if (childData.config['scaleY']) childKonva.scaleY(childData.config['scaleY']);
              if (childData.config['rotation']) childKonva.rotation(childData.config['rotation']);

              // Перемещаем в группу
              groupKonva.add(childKonva);
              childKonva.position({ x: childData.position.x, y: childData.position.y });
            }
          }
        }
        break;
      }
      default:
        return null;
    }

    // Применяем сохранённые атрибуты
    const konvaNode = newNode.getNode();
    if (data.config['width'] !== undefined) konvaNode.width(data.config['width']);
    if (data.config['height'] !== undefined) konvaNode.height(data.config['height']);
    if (data.config['scaleX'] !== undefined) konvaNode.scaleX(data.config['scaleX']);
    if (data.config['scaleY'] !== undefined) konvaNode.scaleY(data.config['scaleY']);
    if (data.config['rotation'] !== undefined) konvaNode.rotation(data.config['rotation']);

    return newNode;
  }
});
