// import Konva from 'konva';

// import type { CoreEngine } from '../core/CoreEngine';

// import { Plugin } from './Plugin';

// /**
//  * Плагин для редактирования текста по двойному клику
//  * Реализация ТОЧНО по документации Konva:
//  * https://konvajs.org/docs/sandbox/Editable_Text.html
//  *
//  * Функционал:
//  * - Двойной клик на TextNode открывает textarea для редактирования
//  * - Enter (без Shift) сохраняет изменения
//  * - Escape отменяет редактирование
//  * - Клик вне textarea сохраняет изменения
//  * - Текст автоматически переносится при уменьшении ширины (wrap)
//  * - Поддержка трансформации (resize) с сохранением масштаба
//  * - Для текста внутри группы: первый двойной клик выделяет, второй - редактирует
//  */
// export class TextEditPlugin extends Plugin {
//   private _core?: CoreEngine;

//   protected onAttach(core: CoreEngine): void {
//     this._core = core;

//     // Включаем улучшенный рендеринг текста (из документации Konva)
//     (Konva as { _fixTextRendering?: boolean })._fixTextRendering = true;

//     // Слушаем двойной клик на слое
//     core.nodes.layer.on('dblclick.textEdit dbltap.textEdit', this._onDoubleClick);
//   }

//   protected onDetach(_core: CoreEngine): void {
//     if (!this._core) return;
//     this._core.nodes.layer.off('.textEdit');
//     this._core = undefined as unknown as CoreEngine;
//   }

//   private _onDoubleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
//     if (!this._core) return;

//     const target = e.target;

//     // Проверяем, что это TextNode
//     if (!(target instanceof Konva.Text)) return;

//     // Находим BaseNode для этого Konva.Text
//     const baseNode = this._core.nodes.list().find((n) => n.getNode() === target);
//     if (!baseNode || baseNode.constructor.name !== 'TextNode') return;

//     // Проверяем, находится ли текст внутри пользовательской группы (не world)
//     const parent = target.getParent();
//     const isInsideGroup =
//       parent && parent instanceof Konva.Group && parent !== this._core.nodes.world;

//     if (isInsideGroup) {
//       // Если текст внутри группы, проверяем, выделена ли сейчас родительская группа
//       const selectionPlugin = this._core.plugins.get('SelectionPlugin') as {
//         _selected?: { getNode: () => Konva.Node };
//       } | null;

//       const selectedNode = selectionPlugin?._selected?.getNode();

//       // Если выделена родительская группа (а не сам текст), то не открываем редактор
//       // SelectionPlugin обработает двойной клик и выделит текст
//       if (selectedNode === parent) {
//         // Первый двойной клик - позволяем SelectionPlugin выделить текст
//         return;
//       }
//     }

//     // Запускаем редактирование (код точно из документации Konva)
//     // Отменяем всплытие события, чтобы SelectionPlugin не обработал его повторно
//     e.cancelBubble = true;
//     this._startEditing(target);
//   };

//   private _startEditing(textNode: Konva.Text): void {
//     if (!this._core) return;

//     const stage = this._core.stage;
//     const layer = this._core.nodes.layer;

//     // Скрываем текстовую ноду
//     textNode.hide();

//     // Скрываем transformer
//     const tr = stage.findOne('Transformer');
//     if (tr && tr instanceof Konva.Transformer) {
//       tr.hide();
//     }

//     // Получаем позицию текста (из документации Konva)
//     const textPosition = textNode.absolutePosition();
//     const stageBox = stage.container().getBoundingClientRect();

//     const areaPosition = {
//       x: stageBox.left + textPosition.x,
//       y: stageBox.top + textPosition.y,
//     };

//     // Создаём textarea (из документации Konva)
//     const textarea = globalThis.document.createElement('textarea');
//     globalThis.document.body.appendChild(textarea);

//     // Устанавливаем значение
//     textarea.value = textNode.text();

//     // Стилизация textarea (ТОЧНО из документации)
//     textarea.style.position = 'absolute';
//     textarea.style.top = areaPosition.y + 'px';
//     textarea.style.left = areaPosition.x + 'px';
//     textarea.style.width = textNode.width() - textNode.padding() * 2 + 'px';
//     textarea.style.height = textNode.height() - textNode.padding() * 2 + 5 + 'px';
//     textarea.style.fontSize = textNode.fontSize() + 'px';
//     textarea.style.border = 'none';
//     textarea.style.padding = '0px';
//     textarea.style.margin = '0px';
//     textarea.style.overflow = 'hidden';
//     textarea.style.background = 'none';
//     textarea.style.outline = 'none';
//     textarea.style.resize = 'none';
//     textarea.style.lineHeight = textNode.lineHeight().toString();
//     textarea.style.fontFamily = textNode.fontFamily();
//     textarea.style.transformOrigin = 'left top';
//     textarea.style.textAlign = textNode.align();
//     textarea.style.color = textNode.fill().toString();

//     // Применяем rotation (из документации)
//     const rotation = textNode.rotation();
//     let transform = '';
//     if (rotation) {
//       transform += 'rotateZ(' + rotation + 'deg)';
//     }
//     transform += 'translateY(-' + 2 + 'px)';
//     textarea.style.transform = transform;

//     // Автоматическая высота (из документации)
//     textarea.style.height = 'auto';
//     textarea.style.height = textarea.scrollHeight + 3 + 'px';

//     textarea.focus();

//     // Функция удаления textarea (из документации Konva)
//     function removeTextarea() {
//       if (textarea.parentNode) {
//         textarea.parentNode.removeChild(textarea);
//       }
//       globalThis.window.removeEventListener('click', handleOutsideClick);
//       globalThis.window.removeEventListener('touchstart', handleOutsideClick);
//       textNode.show();
//       if (tr && tr instanceof Konva.Transformer) {
//         tr.show();
//         tr.forceUpdate();
//       }
//       layer.batchDraw();
//     }

//     // Функция установки ширины textarea (из документации Konva)
//     function setTextareaWidth(newWidth = 0) {
//       let width = newWidth;
//       if (!width) {
//         // Используем ширину текста по умолчанию
//         width = textNode.width();
//       }
//       textarea.style.width = width + 'px';
//     }

//     // Обработчик keydown для Enter и Escape (из документации Konva)
//     textarea.addEventListener('keydown', function (e) {
//       // Enter без Shift - сохранить
//       if (e.key === 'Enter' && !e.shiftKey) {
//         textNode.text(textarea.value);
//         removeTextarea();
//       }
//       // Escape - отменить
//       if (e.key === 'Escape') {
//         removeTextarea();
//       }
//     });

//     // Обработчик keydown для изменения размера (из документации Konva)
//     textarea.addEventListener('keydown', function () {
//       const scale = textNode.getAbsoluteScale().x;
//       setTextareaWidth(textNode.width() * scale);
//       textarea.style.height = 'auto';
//       textarea.style.height = textarea.scrollHeight + textNode.fontSize() + 'px';
//     });

//     // Обработчик клика вне textarea (из документации Konva)
//     function handleOutsideClick(e: Event) {
//       if (e.target !== textarea) {
//         textNode.text(textarea.value);
//         removeTextarea();
//       }
//     }

//     // Регистрируем обработчик с задержкой (из документации)
//     globalThis.setTimeout(() => {
//       globalThis.window.addEventListener('click', handleOutsideClick);
//       globalThis.window.addEventListener('touchstart', handleOutsideClick);
//     });
//   }
// }
