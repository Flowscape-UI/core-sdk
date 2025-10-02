// import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// import Konva from 'konva';
// import { CoreEngine } from '../src/core/CoreEngine';
// import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
// import { TextEditPlugin } from '../src/plugins/TextEditPlugin';

// /**
//  * Тесты для редактирования текста по двойному клику
//  * Покрывают:
//  * - Открытие textarea по двойному клику
//  * - Сохранение текста по Enter
//  * - Отмена по Escape
//  * - Сохранение по клику вне textarea
//  * - Автоматический перенос текста (wrap)
//  */
// describe('Редактирование текста (TextEditPlugin)', () => {
//   let container: HTMLDivElement;
//   let core: CoreEngine;
//   let selectionPlugin: SelectionPlugin;
//   let textEditPlugin: TextEditPlugin;

//   beforeEach(() => {
//     container = document.createElement('div');
//     document.body.appendChild(container);

//     core = new CoreEngine({
//       container,
//       width: 800,
//       height: 600,
//     });

//     selectionPlugin = new SelectionPlugin();
//     textEditPlugin = new TextEditPlugin();

//     core.plugins.addPlugins([selectionPlugin, textEditPlugin]);
//   });

//   afterEach(() => {
//     // Очищаем все textarea
//     const textareas = document.querySelectorAll('textarea');
//     textareas.forEach((ta) => ta.remove());

//     document.body.removeChild(container);
//   });

//   describe('Открытие редактора', () => {
//     it('должно открывать textarea по двойному клику на текстовую ноду', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Test text',
//         fontSize: 20,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Симулируем двойной клик через слой
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       // Проверяем, что текстовая нода скрыта
//       expect(konvaNode.visible()).toBe(false);

//       // Проверяем, что textarea создана
//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();
//       expect(textarea?.value).toBe('Test text');
//     });

//     it('не должно открывать textarea для не-текстовых нод', () => {
//       const shapeNode = core.nodes.addShape({
//         x: 100,
//         y: 100,
//         width: 100,
//         height: 100,
//       });

//       const konvaNode = shapeNode.getNode() as unknown as Konva.Rect;

//       // Симулируем двойной клик через слой
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       // Проверяем, что textarea не создана
//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeFalsy();
//     });

//     it('должно скрывать transformer при открытии редактора', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Test text',
//         fontSize: 20,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Выделяем ноду (создаётся transformer)
//       (selectionPlugin as any)._select(textNode);

//       const transformer = core.stage.findOne('Transformer') as Konva.Transformer;
//       expect(transformer).toBeTruthy();
//       expect(transformer.visible()).toBe(true);

//       // Открываем редактор
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       // Проверяем, что transformer скрыт
//       expect(transformer.visible()).toBe(false);
//     });
//   });

//   describe('Сохранение текста', () => {
//     it('должно сохранять текст по Enter (без Shift)', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Original text',
//         fontSize: 20,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Открываем редактор
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       // Изменяем текст
//       if (textarea) {
//         textarea.value = 'New text';

//         // Нажимаем Enter
//         const enterEvent = new KeyboardEvent('keydown', {
//           key: 'Enter',
//           shiftKey: false,
//           bubbles: true,
//         });
//         textarea.dispatchEvent(enterEvent);
//       }

//       // Проверяем, что текст сохранён
//       expect(konvaNode.text()).toBe('New text');

//       // Проверяем, что textarea удалена
//       expect(document.querySelector('textarea')).toBeFalsy();

//       // Проверяем, что нода снова видима
//       expect(konvaNode.visible()).toBe(true);
//     });

//     it('не должно сохранять текст по Enter+Shift (многострочный ввод)', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Original text',
//         fontSize: 20,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Открываем редактор
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       if (textarea) {
//         textarea.value = 'New text';

//         // Нажимаем Shift+Enter (для многострочного ввода)
//         const enterEvent = new KeyboardEvent('keydown', {
//           key: 'Enter',
//           shiftKey: true,
//           bubbles: true,
//         });
//         textarea.dispatchEvent(enterEvent);
//       }

//       // Проверяем, что текст НЕ сохранён (textarea всё ещё открыта)
//       expect(konvaNode.text()).toBe('Original text');
//       expect(document.querySelector('textarea')).toBeTruthy();
//     });

//     it('должно сохранять текст по клику вне textarea', async () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Original text',
//         fontSize: 20,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Открываем редактор
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       if (textarea) {
//         textarea.value = 'New text';

//         // Ждём, пока обработчик клика будет зарегистрирован (setTimeout в коде)
//         await new Promise((resolve) => setTimeout(resolve, 10));

//         // Кликаем вне textarea
//         const clickEvent = new MouseEvent('click', {
//           bubbles: true,
//         });
//         document.body.dispatchEvent(clickEvent);
//       }

//       // Проверяем, что текст сохранён
//       expect(konvaNode.text()).toBe('New text');

//       // Проверяем, что textarea удалена
//       expect(document.querySelector('textarea')).toBeFalsy();
//     });
//   });

//   describe('Отмена редактирования', () => {
//     it('должно отменять редактирование по Escape', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Original text',
//         fontSize: 20,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Открываем редактор
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       if (textarea) {
//         textarea.value = 'New text';

//         // Нажимаем Escape
//         const escapeEvent = new KeyboardEvent('keydown', {
//           key: 'Escape',
//           bubbles: true,
//         });
//         textarea.dispatchEvent(escapeEvent);
//       }

//       // Проверяем, что текст НЕ изменился
//       expect(konvaNode.text()).toBe('Original text');

//       // Проверяем, что textarea удалена
//       expect(document.querySelector('textarea')).toBeFalsy();

//       // Проверяем, что нода снова видима
//       expect(konvaNode.visible()).toBe(true);
//     });
//   });

//   describe('Стилизация textarea', () => {
//     it('должно применять стили текста к textarea', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Styled text',
//         fontSize: 24,
//         fontFamily: 'Arial',
//         fill: 'red',
//         align: 'center',
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Открываем редактор
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       if (textarea) {
//         expect(textarea.style.fontSize).toContain('24');
//         expect(textarea.style.fontFamily).toBe('Arial');
//         expect(textarea.style.color).toBe('red');
//         expect(textarea.style.textAlign).toBe('center');
//       }
//     });

//     it('должно применять rotation к textarea', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Rotated text',
//         fontSize: 20,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;
//       konvaNode.rotation(45);

//       // Открываем редактор
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       if (textarea) {
//         expect(textarea.style.transform).toContain('rotateZ(45deg)');
//       }
//     });
//   });

//   describe('Автоматический перенос текста', () => {
//     it('должно автоматически изменять высоту textarea при вводе', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Short',
//         fontSize: 20,
//         width: 100,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Открываем редактор
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       const textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       if (textarea) {
//         const initialHeight = textarea.style.height;

//         // Добавляем много текста
//         textarea.value =
//           'Very long text that should wrap to multiple lines and increase the height of the textarea automatically';

//         // Симулируем событие input
//         const inputEvent = new Event('input', { bubbles: true });
//         textarea.dispatchEvent(inputEvent);

//         // Проверяем, что высота изменилась
//         // (точное значение зависит от scrollHeight, просто проверяем, что оно установлено)
//         expect(textarea.style.height).toBeTruthy();
//       }
//     });
//   });

//   describe('Множественные редактирования', () => {
//     it('должно корректно обрабатывать последовательные редактирования', () => {
//       const textNode = core.nodes.addText({
//         x: 100,
//         y: 100,
//         text: 'Text 1',
//         fontSize: 20,
//       });

//       const konvaNode = textNode.getNode() as unknown as Konva.Text;

//       // Первое редактирование
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       let textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       if (textarea) {
//         textarea.value = 'Text 2';
//         const enterEvent = new KeyboardEvent('keydown', {
//           key: 'Enter',
//           shiftKey: false,
//           bubbles: true,
//         });
//         textarea.dispatchEvent(enterEvent);
//       }

//       // Проверяем, что текст сохранён и textarea удалена
//       expect(konvaNode.text()).toBe('Text 2');
//       expect(document.querySelector('textarea')).toBeFalsy();

//       // Второе редактирование
//       core.nodes.layer.fire('dblclick', {
//         target: konvaNode,
//         evt: new MouseEvent('dblclick'),
//         currentTarget: core.nodes.layer,
//       });

//       textarea = document.querySelector('textarea');
//       expect(textarea).toBeTruthy();

//       if (textarea) {
//         textarea.value = 'Text 3';
//         const enterEvent = new KeyboardEvent('keydown', {
//           key: 'Enter',
//           shiftKey: false,
//           bubbles: true,
//         });
//         textarea.dispatchEvent(enterEvent);
//       }

//       expect(konvaNode.text()).toBe('Text 3');
//       expect(document.querySelector('textarea')).toBeFalsy();
//     });
//   });
// });
