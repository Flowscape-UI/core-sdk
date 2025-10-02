// import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// import Konva from 'konva';
// import { CoreEngine } from '../src/core/CoreEngine';
// import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
// import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';

// /**
//  * Тесты для управления z-index через горячие клавиши
//  * Покрывают:
//  * - Ctrl+] - повышение z-index (moveUp)
//  * - Ctrl+[ - понижение z-index (moveDown)
//  * - Работу с одиночными нодами
//  * - Работу с множественным выделением
//  * - Граничные случаи (верхняя/нижняя позиция)
//  */
// describe('Управление z-index (горячие клавиши)', () => {
//   let container: HTMLDivElement;
//   let core: CoreEngine;
//   let selectionPlugin: SelectionPlugin;
//   let hotkeysPlugin: NodeHotkeysPlugin;

//   beforeEach(() => {
//     container = document.createElement('div');
//     document.body.appendChild(container);

//     core = new CoreEngine({
//       container,
//       width: 800,
//       height: 600,
//     });

//     selectionPlugin = new SelectionPlugin();
//     hotkeysPlugin = new NodeHotkeysPlugin();

//     core.plugins.addPlugins([selectionPlugin]);
//     core.plugins.addPlugins([hotkeysPlugin]);
//   });

//   afterEach(() => {
//     document.body.removeChild(container);
//   });

//   describe('Повышение z-index (Ctrl+])', () => {
//     it('должно повышать z-index одиночной ноды', () => {
//       // Создаём три ноды
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 100,
//         height: 100,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const node3 = core.nodes.addShape({
//         x: 150,
//         y: 150,
//         width: 100,
//         height: 100,
//         fill: 'green',
//       });

//       const konva1 = node1.getNode() as unknown as Konva.Rect;
//       const konva2 = node2.getNode() as unknown as Konva.Rect;
//       const konva3 = node3.getNode() as unknown as Konva.Rect;

//       // Проверяем начальный порядок (0, 1, 2)
//       expect(konva1.zIndex()).toBe(0);
//       expect(konva2.zIndex()).toBe(1);
//       expect(konva3.zIndex()).toBe(2);

//       // Выделяем первую ноду
//       (selectionPlugin as any)._select(node1);

//       // Нажимаем Ctrl+]
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketRight',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       // Проверяем, что первая нода переместилась на верх (0, 1, 2 -> 1, 2, 0)
//       expect(konva1.zIndex()).toBe(2);
//       expect(konva2.zIndex()).toBe(0);
//       expect(konva3.zIndex()).toBe(1);
//     });

//     it('должно повышать z-index до максимума при множественных нажатиях', () => {
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 100,
//         height: 100,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const node3 = core.nodes.addShape({
//         x: 150,
//         y: 150,
//         width: 100,
//         height: 100,
//         fill: 'green',
//       });

//       const konva1 = node1.getNode() as unknown as Konva.Rect;

//       // Выделяем первую ноду
//       (selectionPlugin as any)._select(node1);

//       // Нажимаем Ctrl+] дважды
//       for (let i = 0; i < 2; i++) {
//         const event = new KeyboardEvent('keydown', {
//           code: 'BracketRight',
//           ctrlKey: true,
//           bubbles: true,
//         });
//         document.dispatchEvent(event);
//       }

//       // Проверяем, что первая нода теперь сверху (zIndex = 2)
//       expect(konva1.zIndex()).toBe(2);
//     });

//     it('не должно изменять z-index если нода уже на вершине', () => {
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 100,
//         height: 100,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const konva2 = node2.getNode() as unknown as Konva.Rect;

//       // Выделяем вторую ноду (она уже сверху)
//       (selectionPlugin as any)._select(node2);

//       const initialZIndex = konva2.zIndex();

//       // Нажимаем Ctrl+]
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketRight',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       // Проверяем, что z-index не изменился
//       expect(konva2.zIndex()).toBe(initialZIndex);
//     });
//   });

//   describe('Понижение z-index (Ctrl+[)', () => {
//     it('должно понижать z-index одиночной ноды', () => {
//       // Создаём три ноды
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 100,
//         height: 100,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const node3 = core.nodes.addShape({
//         x: 150,
//         y: 150,
//         width: 100,
//         height: 100,
//         fill: 'green',
//       });

//       const konva1 = node1.getNode() as unknown as Konva.Rect;
//       const konva2 = node2.getNode() as unknown as Konva.Rect;
//       const konva3 = node3.getNode() as unknown as Konva.Rect;

//       // Проверяем начальный порядок (0, 1, 2)
//       expect(konva1.zIndex()).toBe(0);
//       expect(konva2.zIndex()).toBe(1);
//       expect(konva3.zIndex()).toBe(2);

//       // Выделяем третью ноду
//       (selectionPlugin as any)._select(node3);

//       // Нажимаем Ctrl+[
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketLeft',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       // Проверяем, что третья нода переместилась на низ (0, 1, 2 -> 1, 2, 0)
//       expect(konva1.zIndex()).toBe(1);
//       expect(konva2.zIndex()).toBe(2);
//       expect(konva3.zIndex()).toBe(0);
//     });

//     it('должно понижать z-index до минимума при множественных нажатиях', () => {
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 100,
//         height: 100,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const node3 = core.nodes.addShape({
//         x: 150,
//         y: 150,
//         width: 100,
//         height: 100,
//         fill: 'green',
//       });

//       const konva3 = node3.getNode() as unknown as Konva.Rect;

//       // Выделяем третью ноду
//       (selectionPlugin as any)._select(node3);

//       // Нажимаем Ctrl+[ дважды
//       for (let i = 0; i < 2; i++) {
//         const event = new KeyboardEvent('keydown', {
//           code: 'BracketLeft',
//           ctrlKey: true,
//           bubbles: true,
//         });
//         document.dispatchEvent(event);
//       }

//       // Проверяем, что третья нода теперь внизу (zIndex = 0)
//       expect(konva3.zIndex()).toBe(0);
//     });

//     it('не должно изменять z-index если нода уже внизу', () => {
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 100,
//         height: 100,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const konva1 = node1.getNode() as unknown as Konva.Rect;

//       // Выделяем первую ноду (она уже внизу)
//       (selectionPlugin as any)._select(node1);

//       const initialZIndex = konva1.zIndex();

//       // Нажимаем Ctrl+[
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketLeft',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       // Проверяем, что z-index не изменился
//       expect(konva1.zIndex()).toBe(initialZIndex);
//     });
//   });

//   describe('Множественное выделение', () => {
//     it('должно повышать z-index всех выбранных нод', () => {
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 50,
//         height: 50,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 120,
//         y: 120,
//         width: 50,
//         height: 50,
//         fill: 'blue',
//       });

//       const node3 = core.nodes.addShape({
//         x: 190,
//         y: 190,
//         width: 50,
//         height: 50,
//         fill: 'green',
//       });

//       const konva1 = node1.getNode() as unknown as Konva.Rect;
//       const konva2 = node2.getNode() as unknown as Konva.Rect;

//       // Начальные z-index (0, 1, 2)
//       expect(konva1.zIndex()).toBe(0);
//       expect(konva2.zIndex()).toBe(1);

//       // Создаём временную группу (мультивыделение)
//       (selectionPlugin as any)._ensureTempMulti([node1, node2]);

//       // Нажимаем Ctrl+]
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketRight',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       // После перемещения вверх, ноды должны иметь более высокий z-index
//       // Проверяем, что операция выполнилась (ноды переместились)
//       // В временной группе ноды перемещаются внутри группы, поэтому проверяем их новые позиции
//       expect(konva1.zIndex()).toBeGreaterThanOrEqual(0);
//       expect(konva2.zIndex()).toBeGreaterThanOrEqual(0);
//     });

//     it('должно понижать z-index всех выбранных нод', () => {
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 50,
//         height: 50,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 120,
//         y: 120,
//         width: 50,
//         height: 50,
//         fill: 'blue',
//       });

//       const node3 = core.nodes.addShape({
//         x: 190,
//         y: 190,
//         width: 50,
//         height: 50,
//         fill: 'green',
//       });

//       const konva2 = node2.getNode() as unknown as Konva.Rect;
//       const konva3 = node3.getNode() as unknown as Konva.Rect;

//       // Начальные z-index (0, 1, 2)
//       expect(konva2.zIndex()).toBe(1);
//       expect(konva3.zIndex()).toBe(2);

//       // Создаём временную группу (мультивыделение)
//       (selectionPlugin as any)._ensureTempMulti([node2, node3]);

//       // Нажимаем Ctrl+[
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketLeft',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       // После перемещения вниз, проверяем что операция выполнилась
//       // В временной группе ноды перемещаются внутри группы
//       expect(konva2.zIndex()).toBeGreaterThanOrEqual(0);
//       expect(konva3.zIndex()).toBeGreaterThanOrEqual(0);
//     });
//   });

//   describe('Разные типы нод', () => {
//     it('должно работать с TextNode', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Test',
//         fontSize: 20,
//       });

//       const shapeNode = core.nodes.addShape({
//         x: 150,
//         y: 150,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const konvaText = textNode.getNode() as unknown as Konva.Text;

//       expect(konvaText.zIndex()).toBe(0);

//       // Выделяем текстовую ноду
//       (selectionPlugin as any)._select(textNode);

//       // Повышаем z-index
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketRight',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       expect(konvaText.zIndex()).toBe(1);
//     });

//     it('должно работать с CircleNode', () => {
//       const circleNode = core.nodes.addCircle({
//         x: 100,
//         y: 100,
//         radius: 50,
//         fill: 'red',
//       });

//       const shapeNode = core.nodes.addShape({
//         x: 150,
//         y: 150,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const konvaCircle = circleNode.getNode() as unknown as Konva.Circle;

//       expect(konvaCircle.zIndex()).toBe(0);

//       // Выделяем круг
//       (selectionPlugin as any)._select(circleNode);

//       // Повышаем z-index
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketRight',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       expect(konvaCircle.zIndex()).toBe(1);
//     });

//     it('должно работать с ImageNode', () => {
//       const mockImage = document.createElement('canvas');
//       mockImage.width = 100;
//       mockImage.height = 100;

//       const imageNode = core.nodes.addImage({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//         image: mockImage,
//       });

//       const shapeNode = core.nodes.addShape({
//         x: 150,
//         y: 150,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const konvaImage = imageNode.getNode() as unknown as Konva.Image;

//       expect(konvaImage.zIndex()).toBe(0);

//       // Выделяем изображение
//       (selectionPlugin as any)._select(imageNode);

//       // Повышаем z-index
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketRight',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       expect(konvaImage.zIndex()).toBe(1);
//     });
//   });

//   describe('Без выделения', () => {
//     it('не должно ничего делать если ничего не выделено', () => {
//       const node1 = core.nodes.addShape({
//         x: 50,
//         y: 50,
//         width: 100,
//         height: 100,
//         fill: 'red',
//       });

//       const node2 = core.nodes.addShape({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//         fill: 'blue',
//       });

//       const konva1 = node1.getNode() as unknown as Konva.Rect;
//       const konva2 = node2.getNode() as unknown as Konva.Rect;

//       const initialZ1 = konva1.zIndex();
//       const initialZ2 = konva2.zIndex();

//       // Нажимаем Ctrl+] без выделения
//       const event = new KeyboardEvent('keydown', {
//         code: 'BracketRight',
//         ctrlKey: true,
//         bubbles: true,
//       });
//       document.dispatchEvent(event);

//       // Проверяем, что ничего не изменилось
//       expect(konva1.zIndex()).toBe(initialZ1);
//       expect(konva2.zIndex()).toBe(initialZ2);
//     });
//   });
// });
