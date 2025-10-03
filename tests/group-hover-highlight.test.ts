import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import Konva from 'konva';

describe('Группировка: подсветка и двойной клик', () => {
  let core: CoreEngine;
  let selectionPlugin: SelectionPlugin;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    core = new CoreEngine({ container, width: 800, height: 600 });
    selectionPlugin = new SelectionPlugin();
    core.plugins.addPlugins([selectionPlugin]);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // Вспомогательные функции
  function simulateMouseMove(target: Konva.Node, options: { ctrlKey?: boolean } = {}) {
    const event = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      ctrlKey: options.ctrlKey || false,
    });

    core.stage.fire('mousemove', { evt: event, target }, true);
  }

  function simulateClick(target: Konva.Node, options: { ctrlKey?: boolean } = {}) {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: options.ctrlKey || false,
      button: 0,
    });

    target.fire('click', { evt: event, target }, true);
  }

  function simulateDoubleClick(target: Konva.Node) {
    const event = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      button: 0,
    });

    target.fire('dblclick', { evt: event, target }, true);
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

  function getHoverTransformer(): Konva.Transformer | null {
    return core.nodes.layer.findOne('.hover-transformer') as Konva.Transformer | null;
  }

  function getHoverTarget(): Konva.Node | null {
    const hoverTr = getHoverTransformer();
    if (!hoverTr) return null;
    const nodes = hoverTr.nodes();
    return nodes.length > 0 ? nodes[0] : null;
  }

  function getSelectedTransformer(): Konva.Transformer | null {
    return core.nodes.layer.findOne('Transformer') as Konva.Transformer | null;
  }

  function getSelectedTarget(): Konva.Node | null {
    const tr = getSelectedTransformer();
    if (!tr) return null;
    const nodes = tr.nodes();
    return nodes.length > 0 ? nodes[0] : null;
  }

  describe('Подсветка при наведении (hover)', () => {
    it('должна подсвечивать всю группу при наведении на ноду внутри группы', () => {
      // Создаём две ноды
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      // Создаём группу через Ctrl+Click и Ctrl+G
      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const group = node1Konva.getParent();
      expect(group).toBeInstanceOf(Konva.Group);

      // Снимаем выделение, чтобы протестировать hover
      simulateClick(core.stage);

      // Наводим на первую ноду
      simulateMouseMove(node1Konva);

      const hoverTarget = getHoverTarget();

      // Должна подсвечиваться вся группа, а не отдельная нода
      expect(hoverTarget).toBe(group);
      expect(hoverTarget).not.toBe(node1Konva);
    });

    it('должна подсвечивать группу при наведении на любую ноду внутри группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const group = node1Konva.getParent();

      // Снимаем выделение
      simulateClick(core.stage);

      // Наводим на вторую ноду
      simulateMouseMove(node2Konva);

      const hoverTarget = getHoverTarget();

      // Должна подсвечиваться группа
      expect(hoverTarget).toBe(group);
    });

    it('при зажатом Ctrl должна подсвечиваться конкретная нода, а не группа', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const group = node1Konva.getParent();

      // Наводим с зажатым Ctrl
      simulateMouseMove(node1Konva, { ctrlKey: true });

      const hoverTarget = getHoverTarget();

      // С Ctrl должна подсвечиваться нода, а не группа
      expect(hoverTarget).toBe(node1Konva);
      expect(hoverTarget).not.toBe(group);
    });
  });

  describe('Вложенные группы', () => {
    it('должна подсвечивать внешнюю группу при наведении на ноду внутри вложенной группы', () => {
      // Создаём первую пару нод и группируем
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 50, height: 50, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 160, y: 100, width: 50, height: 50, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const innerGroup = node1Konva.getParent();

      // Создаём третью ноду
      const node3 = core.nodes.addShape({ x: 250, y: 100, width: 50, height: 50, fill: 'green' });
      const node3Konva = node3.getNode() as Konva.Rect;

      // Группируем внутреннюю группу с третьей нодой
      simulateClick(innerGroup as Konva.Group, { ctrlKey: true });
      simulateClick(node3Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const outerGroup = (innerGroup as Konva.Group).getParent();

      // Снимаем выделение
      simulateClick(core.stage);

      // Наводим на ноду внутри вложенной группы
      simulateMouseMove(node1Konva);

      const hoverTarget = getHoverTarget();

      // Должна подсвечиваться внешняя группа
      expect(hoverTarget).toBe(outerGroup);
      expect(hoverTarget).not.toBe(innerGroup);
      expect(hoverTarget).not.toBe(node1Konva);
    });

    it('при зажатом Ctrl должна подсвечиваться конкретная нода внутри вложенной группы', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 50, height: 50, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 160, y: 100, width: 50, height: 50, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const innerGroup = node1Konva.getParent();

      const node3 = core.nodes.addShape({ x: 250, y: 100, width: 50, height: 50, fill: 'green' });
      const node3Konva = node3.getNode() as Konva.Rect;

      simulateClick(innerGroup as Konva.Group, { ctrlKey: true });
      simulateClick(node3Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      // Наводим с Ctrl на ноду внутри вложенной группы
      simulateMouseMove(node1Konva, { ctrlKey: true });

      const hoverTarget = getHoverTarget();

      // Должна подсвечиваться сама нода
      expect(hoverTarget).toBe(node1Konva);
    });
  });

  describe('Клик и двойной клик для выделения', () => {
    it('одиночный клик на ноду внутри вложенной группы должен выделить общую группу', () => {
      // Создаём внутреннюю группу 1
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 50, height: 50, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 160, y: 100, width: 50, height: 50, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const innerGroup1 = node1Konva.getParent();

      // Создаём внутреннюю группу 2
      const node3 = core.nodes.addShape({ x: 250, y: 100, width: 50, height: 50, fill: 'green' });
      const node4 = core.nodes.addShape({ x: 310, y: 100, width: 50, height: 50, fill: 'yellow' });

      const node3Konva = node3.getNode() as Konva.Rect;
      const node4Konva = node4.getNode() as Konva.Rect;

      simulateClick(node3Konva, { ctrlKey: true });
      simulateClick(node4Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const innerGroup2 = node3Konva.getParent();

      // Создаём общую группу
      simulateClick(innerGroup1 as Konva.Group, { ctrlKey: true });
      simulateClick(innerGroup2 as Konva.Group, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const outerGroup = (innerGroup1 as Konva.Group).getParent();

      // Одиночный клик на ноду A (node1)
      simulateClick(node1Konva);

      const selectedTarget = getSelectedTarget();

      // Должна быть выделена общая группа
      expect(selectedTarget).toBe(outerGroup);
      expect(selectedTarget).not.toBe(innerGroup1);
      expect(selectedTarget).not.toBe(node1Konva);
    });

    it('первый двойной клик на ноду должен выделить группу, в которой находится нода', () => {
      // Создаём структуру: Общая группа -> Группа 1 -> Нода A, Нода B
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 50, height: 50, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 160, y: 100, width: 50, height: 50, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const innerGroup = node1Konva.getParent();

      const node3 = core.nodes.addShape({ x: 250, y: 100, width: 50, height: 50, fill: 'green' });
      const node3Konva = node3.getNode() as Konva.Rect;

      simulateClick(innerGroup as Konva.Group, { ctrlKey: true });
      simulateClick(node3Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const outerGroup = (innerGroup as Konva.Group).getParent();

      // Одиночный клик выделяет общую группу
      simulateClick(node1Konva);
      expect(getSelectedTarget()).toBe(outerGroup);

      // Первый двойной клик на ноду A
      simulateDoubleClick(node1Konva);

      const selectedTarget = getSelectedTarget();

      // Должна быть выделена внутренняя группа (Группа 1)
      expect(selectedTarget).toBe(innerGroup);
      expect(selectedTarget).not.toBe(outerGroup);
      expect(selectedTarget).not.toBe(node1Konva);
    });

    it('второй двойной клик на ноду должен выделить саму ноду', () => {
      // Создаём структуру
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 50, height: 50, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 160, y: 100, width: 50, height: 50, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const innerGroup = node1Konva.getParent();

      const node3 = core.nodes.addShape({ x: 250, y: 100, width: 50, height: 50, fill: 'green' });
      const node3Konva = node3.getNode() as Konva.Rect;

      simulateClick(innerGroup as Konva.Group, { ctrlKey: true });
      simulateClick(node3Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const outerGroup = (innerGroup as Konva.Group).getParent();

      // Одиночный клик выделяет общую группу
      simulateClick(node1Konva);
      expect(getSelectedTarget()).toBe(outerGroup);

      // Первый двойной клик выделяет внутреннюю группу
      simulateDoubleClick(node1Konva);
      expect(getSelectedTarget()).toBe(innerGroup);

      // Второй двойной клик на ту же ноду
      simulateDoubleClick(node1Konva);

      const selectedTarget = getSelectedTarget();

      // Должна быть выделена сама нода
      expect(selectedTarget).toBe(node1Konva);
      expect(selectedTarget).not.toBe(innerGroup);
      expect(selectedTarget).not.toBe(outerGroup);
    });

    it('двойной клик на ноду в простой группе (без вложенности) должен выделить ноду', () => {
      const node1 = core.nodes.addShape({ x: 100, y: 100, width: 100, height: 100, fill: 'red' });
      const node2 = core.nodes.addShape({ x: 250, y: 100, width: 100, height: 100, fill: 'blue' });

      const node1Konva = node1.getNode() as Konva.Rect;
      const node2Konva = node2.getNode() as Konva.Rect;

      simulateClick(node1Konva, { ctrlKey: true });
      simulateClick(node2Konva, { ctrlKey: true });
      simulateKeyPress('KeyG', { ctrlKey: true });

      const group = node1Konva.getParent();

      // Одиночный клик выделяет группу
      simulateClick(node1Konva);
      expect(getSelectedTarget()).toBe(group);

      // Двойной клик на ноду
      simulateDoubleClick(node1Konva);

      const selectedTarget = getSelectedTarget();

      // Должна быть выделена сама нода (так как нет вложенных групп)
      expect(selectedTarget).toBe(node1Konva);
      expect(selectedTarget).not.toBe(group);
    });
  });
});
