import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';

/**
 * Комплексный тест для копирования, вставки и вырезки всех типов нод
 * Покрывает все типы нод, доступные в проекте:
 * - ShapeNode (прямоугольник)
 * - TextNode
 * - ImageNode
 * - CircleNode
 * - EllipseNode
 * - ArcNode
 * - StarNode
 * - ArrowNode
 * - RingNode
 * - RegularPolygonNode
 * - GroupNode
 */
describe('Копирование/Вставка/Вырезка: Все типы нод', () => {
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

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ==================== КОПИРОВАНИЕ ====================

  describe('Копирование одиночных нод', () => {
    it('должно копировать и вставлять ShapeNode (прямоугольник)', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        fill: 'red',
        cornerRadius: 10,
      });

      (selectionPlugin as any)._select(node);

      // Копируем (Ctrl+C)
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );

      // Вставляем (Ctrl+V)
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Rect;
      expect(newKonvaNode.width()).toBe(150);
      expect(newKonvaNode.height()).toBe(100);
      expect(newKonvaNode.fill()).toBe('red');
      expect(newKonvaNode.cornerRadius()).toBe(10);
    });

    it('должно копировать и вставлять TextNode', () => {
      const node = core.nodes.addText({
        x: 200,
        y: 200,
        text: 'Тестовый текст',
        fontSize: 24,
        fontFamily: 'Arial',
        fill: 'blue',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Text;
      expect(newKonvaNode.text()).toBe('Тестовый текст');
      expect(newKonvaNode.fontSize()).toBe(24);
      expect(newKonvaNode.fontFamily()).toBe('Arial');
      expect(newKonvaNode.fill()).toBe('blue');
    });

    it('должно копировать и вставлять ImageNode', () => {
      // Создаём mock HTMLImageElement
      const mockImage = document.createElement('canvas');
      mockImage.width = 100;
      mockImage.height = 100;

      const node = core.nodes.addImage({
        x: 150,
        y: 150,
        width: 200,
        height: 150,
        image: mockImage,
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Image;
      expect(newKonvaNode.width()).toBe(200);
      expect(newKonvaNode.height()).toBe(150);
      // Проверяем, что изображение скопировано
      expect(newKonvaNode.image()).toBeTruthy();
    });

    it('должно копировать и вставлять CircleNode', () => {
      const node = core.nodes.addCircle({
        x: 300,
        y: 300,
        radius: 50,
        fill: 'green',
        stroke: 'black',
        strokeWidth: 2,
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Circle;
      expect(newKonvaNode.radius()).toBe(50);
      expect(newKonvaNode.fill()).toBe('green');
      expect(newKonvaNode.stroke()).toBe('black');
      expect(newKonvaNode.strokeWidth()).toBe(2);
    });

    it('должно копировать и вставлять EllipseNode', () => {
      const node = core.nodes.addEllipse({
        x: 250,
        y: 250,
        radiusX: 60,
        radiusY: 40,
        fill: 'purple',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Ellipse;
      expect(newKonvaNode.radiusX()).toBe(60);
      expect(newKonvaNode.radiusY()).toBe(40);
      expect(newKonvaNode.fill()).toBe('purple');
    });

    it('должно копировать и вставлять ArcNode', () => {
      const node = core.nodes.addArc({
        x: 180,
        y: 180,
        innerRadius: 30,
        outerRadius: 60,
        angle: 90,
        fill: 'orange',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Arc;
      expect(newKonvaNode.innerRadius()).toBe(30);
      expect(newKonvaNode.outerRadius()).toBe(60);
      expect(newKonvaNode.angle()).toBe(90);
      expect(newKonvaNode.fill()).toBe('orange');
    });

    it('должно копировать и вставлять StarNode', () => {
      const node = core.nodes.addStar({
        x: 220,
        y: 220,
        numPoints: 5,
        innerRadius: 20,
        outerRadius: 40,
        fill: 'yellow',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Star;
      expect(newKonvaNode.numPoints()).toBe(5);
      expect(newKonvaNode.innerRadius()).toBe(20);
      expect(newKonvaNode.outerRadius()).toBe(40);
      expect(newKonvaNode.fill()).toBe('yellow');
    });

    it('должно копировать и вставлять ArrowNode', () => {
      const node = core.nodes.addArrow({
        x: 100,
        y: 100,
        points: [0, 0, 100, 50],
        pointerLength: 10,
        pointerWidth: 10,
        fill: 'black',
        stroke: 'black',
        strokeWidth: 2,
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Arrow;
      expect(newKonvaNode.points()).toEqual([0, 0, 100, 50]);
      expect(newKonvaNode.pointerLength()).toBe(10);
      expect(newKonvaNode.pointerWidth()).toBe(10);
      expect(newKonvaNode.stroke()).toBe('black');
    });

    it('должно копировать и вставлять RingNode', () => {
      const node = core.nodes.addRing({
        x: 280,
        y: 280,
        innerRadius: 25,
        outerRadius: 50,
        fill: 'cyan',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Ring;
      expect(newKonvaNode.innerRadius()).toBe(25);
      expect(newKonvaNode.outerRadius()).toBe(50);
      expect(newKonvaNode.fill()).toBe('cyan');
    });

    it('должно копировать и вставлять RegularPolygonNode', () => {
      const node = core.nodes.addRegularPolygon({
        x: 320,
        y: 320,
        sides: 6,
        radius: 45,
        fill: 'magenta',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.RegularPolygon;
      expect(newKonvaNode.sides()).toBe(6);
      expect(newKonvaNode.radius()).toBe(45);
      expect(newKonvaNode.fill()).toBe('magenta');
    });

    it('должно копировать и вставлять GroupNode с дочерними элементами', () => {
      const group = core.nodes.addGroup({
        x: 150,
        y: 150,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      // Добавляем дочерние элементы
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

      (selectionPlugin as any)._select(group);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      expect(groups.length).toBe(2);

      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;
      expect(newGroupKonva.getChildren().length).toBe(2);

      const newChild1 = newGroupKonva.getChildren()[0] as Konva.Rect;
      const newChild2 = newGroupKonva.getChildren()[1] as Konva.Circle;

      expect(newChild1.width()).toBe(50);
      expect(newChild1.height()).toBe(50);
      expect(newChild1.fill()).toBe('red');

      expect(newChild2.radius()).toBe(25);
      expect(newChild2.fill()).toBe('blue');
    });
  });

  // ==================== КОПИРОВАНИЕ С ТРАНСФОРМАЦИЯМИ ====================

  describe('Копирование нод с трансформациями', () => {
    it('должно копировать ShapeNode с scale и rotation', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 100,
        height: 80,
        fill: 'teal',
      });

      const konvaNode = node.getNode() as unknown as Konva.Rect;
      konvaNode.scaleX(1.5);
      konvaNode.scaleY(2);
      konvaNode.rotation(45);

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Rect;

      expect(newKonvaNode.scaleX()).toBeCloseTo(1.5, 2);
      expect(newKonvaNode.scaleY()).toBeCloseTo(2, 2);
      expect(newKonvaNode.rotation()).toBeCloseTo(45, 2);
    });

    it('должно копировать CircleNode с трансформациями', () => {
      const node = core.nodes.addCircle({
        x: 200,
        y: 200,
        radius: 40,
        fill: 'lime',
      });

      const konvaNode = node.getNode() as unknown as Konva.Circle;
      konvaNode.scaleX(2);
      konvaNode.scaleY(1.5);
      konvaNode.rotation(90);
      konvaNode.offsetX(10);
      konvaNode.offsetY(10);

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Circle;

      expect(newKonvaNode.scaleX()).toBeCloseTo(2, 2);
      expect(newKonvaNode.scaleY()).toBeCloseTo(1.5, 2);
      expect(newKonvaNode.rotation()).toBeCloseTo(90, 2);
      expect(newKonvaNode.offsetX()).toBeCloseTo(10, 2);
      expect(newKonvaNode.offsetY()).toBeCloseTo(10, 2);
    });

    it('должно копировать ImageNode с трансформациями', () => {
      const mockImage = document.createElement('canvas');
      mockImage.width = 150;
      mockImage.height = 150;

      const node = core.nodes.addImage({
        x: 180,
        y: 180,
        width: 120,
        height: 120,
        image: mockImage,
      });

      const konvaNode = node.getNode() as unknown as Konva.Image;
      konvaNode.scaleX(0.8);
      konvaNode.scaleY(1.2);
      konvaNode.rotation(30);

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Image;

      expect(newKonvaNode.scaleX()).toBeCloseTo(0.8, 2);
      expect(newKonvaNode.scaleY()).toBeCloseTo(1.2, 2);
      expect(newKonvaNode.rotation()).toBeCloseTo(30, 2);
    });
  });

  // ==================== ВЫРЕЗАНИЕ ====================

  describe('Вырезание (Cut) всех типов нод', () => {
    it('должно вырезать и вставлять ShapeNode', () => {
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 80,
        height: 60,
        fill: 'brown',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Rect;
      expect(newKonvaNode.width()).toBe(80);
      expect(newKonvaNode.height()).toBe(60);
      expect(newKonvaNode.fill()).toBe('brown');
    });

    it('должно вырезать и вставлять TextNode', () => {
      const node = core.nodes.addText({
        x: 150,
        y: 150,
        text: 'Cut test',
        fontSize: 20,
        fill: 'navy',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Text;
      expect(newKonvaNode.text()).toBe('Cut test');
      expect(newKonvaNode.fontSize()).toBe(20);
      expect(newKonvaNode.fill()).toBe('navy');
    });

    it('должно вырезать и вставлять ImageNode', () => {
      const mockImage = document.createElement('canvas');
      mockImage.width = 80;
      mockImage.height = 80;

      const node = core.nodes.addImage({
        x: 120,
        y: 120,
        width: 100,
        height: 100,
        image: mockImage,
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Image;
      expect(newKonvaNode.width()).toBe(100);
      expect(newKonvaNode.height()).toBe(100);
    });

    it('должно вырезать и вставлять CircleNode', () => {
      const node = core.nodes.addCircle({
        x: 200,
        y: 200,
        radius: 35,
        fill: 'pink',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Circle;
      expect(newKonvaNode.radius()).toBe(35);
      expect(newKonvaNode.fill()).toBe('pink');
    });

    it('должно вырезать и вставлять EllipseNode', () => {
      const node = core.nodes.addEllipse({
        x: 230,
        y: 230,
        radiusX: 50,
        radiusY: 30,
        fill: 'gold',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Ellipse;
      expect(newKonvaNode.radiusX()).toBe(50);
      expect(newKonvaNode.radiusY()).toBe(30);
      expect(newKonvaNode.fill()).toBe('gold');
    });

    it('должно вырезать и вставлять ArcNode', () => {
      const node = core.nodes.addArc({
        x: 160,
        y: 160,
        innerRadius: 20,
        outerRadius: 50,
        angle: 120,
        fill: 'silver',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Arc;
      expect(newKonvaNode.innerRadius()).toBe(20);
      expect(newKonvaNode.outerRadius()).toBe(50);
      expect(newKonvaNode.angle()).toBe(120);
      expect(newKonvaNode.fill()).toBe('silver');
    });

    it('должно вырезать и вставлять StarNode', () => {
      const node = core.nodes.addStar({
        x: 190,
        y: 190,
        numPoints: 7,
        innerRadius: 15,
        outerRadius: 35,
        fill: 'coral',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Star;
      expect(newKonvaNode.numPoints()).toBe(7);
      expect(newKonvaNode.innerRadius()).toBe(15);
      expect(newKonvaNode.outerRadius()).toBe(35);
      expect(newKonvaNode.fill()).toBe('coral');
    });

    it('должно вырезать и вставлять ArrowNode', () => {
      const node = core.nodes.addArrow({
        x: 110,
        y: 110,
        points: [0, 0, 80, 40],
        pointerLength: 12,
        pointerWidth: 12,
        fill: 'darkgreen',
        stroke: 'darkgreen',
        strokeWidth: 3,
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Arrow;
      expect(newKonvaNode.points()).toEqual([0, 0, 80, 40]);
      expect(newKonvaNode.pointerLength()).toBe(12);
      expect(newKonvaNode.pointerWidth()).toBe(12);
      expect(newKonvaNode.stroke()).toBe('darkgreen');
    });

    it('должно вырезать и вставлять RingNode', () => {
      const node = core.nodes.addRing({
        x: 260,
        y: 260,
        innerRadius: 20,
        outerRadius: 45,
        fill: 'violet',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Ring;
      expect(newKonvaNode.innerRadius()).toBe(20);
      expect(newKonvaNode.outerRadius()).toBe(45);
      expect(newKonvaNode.fill()).toBe('violet');
    });

    it('должно вырезать и вставлять RegularPolygonNode', () => {
      const node = core.nodes.addRegularPolygon({
        x: 290,
        y: 290,
        sides: 8,
        radius: 40,
        fill: 'indigo',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      expect(core.nodes.list().length).toBe(1);
      const newNode = core.nodes.list()[0];
      const newKonvaNode = newNode.getNode() as unknown as Konva.RegularPolygon;
      expect(newKonvaNode.sides()).toBe(8);
      expect(newKonvaNode.radius()).toBe(40);
      expect(newKonvaNode.fill()).toBe('indigo');
    });

    it('должно вырезать и вставлять GroupNode с дочерними элементами', () => {
      const group = core.nodes.addGroup({
        x: 130,
        y: 130,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      const child = core.nodes.addShape({
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        fill: 'maroon',
      });

      const childKonva = child.getNode() as unknown as Konva.Rect;
      childKonva.moveTo(groupKonva);

      (selectionPlugin as any)._select(group);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyX', ctrlKey: true, bubbles: true }),
      );

      const nodesAfterCut = core.nodes.list();
      const groupsAfterCut = nodesAfterCut.filter((n) => n.constructor.name === 'GroupNode');
      expect(groupsAfterCut.length).toBe(0);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const nodesAfterPaste = core.nodes.list();
      const groupsAfterPaste = nodesAfterPaste.filter((n) => n.constructor.name === 'GroupNode');
      expect(groupsAfterPaste.length).toBe(1);

      const restoredGroup = groupsAfterPaste[0];
      const restoredGroupKonva = restoredGroup.getNode() as unknown as Konva.Group;
      expect(restoredGroupKonva.getChildren().length).toBe(1);

      const restoredChild = restoredGroupKonva.getChildren()[0] as Konva.Rect;
      expect(restoredChild.width()).toBe(40);
      expect(restoredChild.height()).toBe(40);
      expect(restoredChild.fill()).toBe('maroon');
    });
  });

  // ==================== МНОЖЕСТВЕННОЕ КОПИРОВАНИЕ ====================

  describe('Множественное копирование разных типов нод', () => {
    it('должно копировать несколько нод разных типов одновременно', () => {
      const shape = core.nodes.addShape({
        x: 50,
        y: 50,
        width: 40,
        height: 40,
        fill: 'red',
      });

      const circle = core.nodes.addCircle({
        x: 120,
        y: 50,
        radius: 20,
        fill: 'blue',
      });

      const text = core.nodes.addText({
        x: 200,
        y: 50,
        text: 'Multi',
        fontSize: 16,
        fill: 'green',
      });

      const star = core.nodes.addStar({
        x: 280,
        y: 50,
        numPoints: 5,
        innerRadius: 10,
        outerRadius: 20,
        fill: 'yellow',
      });

      // Мультивыделение
      (selectionPlugin as any)._ensureTempMulti([shape, circle, text, star]);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBeGreaterThanOrEqual(8); // 4 исходных + 4 новых

      const shapes = allNodes.filter((n) => n.constructor.name === 'ShapeNode');
      const circles = allNodes.filter((n) => n.constructor.name === 'CircleNode');
      const texts = allNodes.filter((n) => n.constructor.name === 'TextNode');
      const stars = allNodes.filter((n) => n.constructor.name === 'StarNode');

      expect(shapes.length).toBeGreaterThanOrEqual(2);
      expect(circles.length).toBeGreaterThanOrEqual(2);
      expect(texts.length).toBeGreaterThanOrEqual(2);
      expect(stars.length).toBeGreaterThanOrEqual(2);
    });

    it('должно сохранять относительное расположение при копировании разных типов нод', () => {
      const ellipse = core.nodes.addEllipse({
        x: 100,
        y: 100,
        radiusX: 30,
        radiusY: 20,
        fill: 'purple',
      });

      const ring = core.nodes.addRing({
        x: 200,
        y: 150,
        innerRadius: 15,
        outerRadius: 30,
        fill: 'cyan',
      });

      const dx = 200 - 100;
      const dy = 150 - 100;

      (selectionPlugin as any)._ensureTempMulti([ellipse, ring]);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      const ellipses = allNodes.filter((n) => n.constructor.name === 'EllipseNode');
      const rings = allNodes.filter((n) => n.constructor.name === 'RingNode');

      if (ellipses.length >= 2 && rings.length >= 2) {
        const newEllipse = ellipses[1].getNode() as unknown as Konva.Ellipse;
        const newRing = rings[1].getNode() as unknown as Konva.Ring;

        const newDx = newRing.x() - newEllipse.x();
        const newDy = newRing.y() - newEllipse.y();

        expect(newDx).toBeCloseTo(dx, 1);
        expect(newDy).toBeCloseTo(dy, 1);
      }
    });
  });

  // ==================== ГРАНИЧНЫЕ СЛУЧАИ ====================

  describe('Граничные случаи', () => {
    it('должно корректно копировать ImageNode без изображения', () => {
      const node = core.nodes.addImage({
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Image;
      expect(newKonvaNode.width()).toBe(100);
      expect(newKonvaNode.height()).toBe(100);
    });

    it('должно копировать TextNode с пустым текстом', () => {
      const node = core.nodes.addText({
        x: 150,
        y: 150,
        text: '',
        fontSize: 18,
        fill: 'black',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Text;
      expect(newKonvaNode.text()).toBe('');
      expect(newKonvaNode.fontSize()).toBe(18);
    });

    it('должно копировать ArrowNode с минимальными параметрами', () => {
      const node = core.nodes.addArrow({
        x: 100,
        y: 100,
        points: [0, 0, 50, 50],
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
      );

      const allNodes = core.nodes.list();
      expect(allNodes.length).toBe(2);

      const newNode = allNodes[1];
      const newKonvaNode = newNode.getNode() as unknown as Konva.Arrow;
      expect(newKonvaNode.points()).toEqual([0, 0, 50, 50]);
    });

    it('должно копировать и вставлять ноду несколько раз подряд', () => {
      const node = core.nodes.addRegularPolygon({
        x: 200,
        y: 200,
        sides: 5,
        radius: 30,
        fill: 'orange',
      });

      (selectionPlugin as any)._select(node);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true, bubbles: true }),
      );

      // Вставляем 5 раз
      for (let i = 0; i < 5; i++) {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'KeyV', ctrlKey: true, bubbles: true }),
        );
      }

      // Должно быть 6 нод (1 исходная + 5 копий)
      expect(core.nodes.list().length).toBe(6);
    });
  });
});
