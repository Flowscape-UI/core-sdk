import Konva from 'konva';

import { BaseNode, type BaseNodeOptions } from './BaseNode';
import type { TextFontStyle, TextWrap } from '../nodes-new';

export interface TextNodeOptions extends BaseNodeOptions {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: TextFontStyle;
  fill?: string;
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  padding?: number;
  lineHeight?: number;
  wrap?: TextWrap,
  /** Включить редактирование по двойному клику (по умолчанию true) */
  editable?: boolean;
}

/** Событие изменения текста */
export interface TextChangeEvent {
  /** Предыдущий текст */
  oldText: string;
  /** Новый текст */
  newText: string;
  /** Было ли изменение отменено (Escape) */
  cancelled: boolean;
}

export class TextNode extends BaseNode<Konva.Text> {
  /** Включено ли редактирование по двойному клику */
  private _editable: boolean;
  /** Находится ли нода в режиме редактирования */
  private _isEditing = false;
  /** Текущий textarea элемент */
  private _textarea: HTMLTextAreaElement | null = null;
  /** Колбэки для событий редактирования */
  private _onTextChangeCallbacks: ((event: TextChangeEvent) => void)[] = [];
  private _onEditStartCallbacks: (() => void)[] = [];
  private _onEditEndCallbacks: (() => void)[] = [];
  /** Флаг: ожидание повторного двойного клика для входа в редактирование внутри группы */
  private _pendingGroupEditDblClick = false;
  private _groupEditClickResetAttached = false;

  constructor(options: TextNodeOptions = {}) {
    const node = new Konva.Text({
      x: options.x ?? 0,
      y: options.y ?? 0,
      ...(options.width ? { width: options.width } : {}),
      ...(options.height ? { height: options.height } : {}),
      text: options.text ?? 'Text',
      fontSize: options.fontSize ?? 16,
      fontFamily: options.fontFamily ?? 'Inter, Arial, sans-serif',
      fontStyle: options.fontStyle ?? 'normal',
      fill: options.fill ?? '#ffffff',
      align: options.align ?? 'left',
      verticalAlign: options.verticalAlign ?? 'top',
      padding: options.padding ?? 0,
      lineHeight: options.lineHeight ?? 1,
    });
    super(node, options);

    this._editable = options.editable ?? true;

    // Привязываем обработчик двойного клика
    if (this._editable) {
      this._setupEditHandler();
    }

    // При трансформации сбрасываем scale и применяем к width
    // Это предотвращает растягивание текста
    this._setupTransformHandler();
  }

  // --- Minimal public API ---

  public getText(): string {
    return this.konvaNode.text();
  }

  public setText(text: string): this {
    this.konvaNode.text(text);
    return this;
  }

  public setFontSize(size: number): this {
    this.konvaNode.fontSize(size);
    return this;
  }

  public setFontFamily(family: string): this {
    this.konvaNode.fontFamily(family);
    return this;
  }

  public setFill(color: string): this {
    this.konvaNode.fill(color);
    return this;
  }

  public setAlign(align: 'left' | 'center' | 'right'): this {
    this.konvaNode.align(align);
    return this;
  }

  public setPadding(padding: number): this {
    this.konvaNode.padding(padding);
    return this;
  }

  public setSize({ width, height }: { width: number; height: number }): this {
    this.konvaNode.size({ width, height });
    return this;
  }

  public setLineHeight(lineHeight: number): this {
    this.konvaNode.lineHeight(lineHeight);
    return this;
  }

  public setVerticalAlign(align: 'top' | 'middle' | 'bottom'): this {
    this.konvaNode.verticalAlign(align);
    return this;
  }

  public isEditable(): boolean {
    return this._editable;
  }

  public setEditable(editable: boolean): this {
    if (this._editable === editable) return this;
    this._editable = editable;
    if (editable) {
      this._setupEditHandler();
    } else {
      this.konvaNode.off('dblclick.textEdit dbltap.textEdit');
      if (this._isEditing) this.cancelEdit();
    }
    return this;
  }

  public isEditing(): boolean {
    return this._isEditing;
  }

  public startEdit(): void {
    if (this._isEditing) return;
    this._openTextarea();
  }

  public finishEdit(): void {
    if (!this._isEditing || !this._textarea) return;
    this._saveAndClose(false);
  }

  public cancelEdit(): void {
    if (!this._isEditing || !this._textarea) return;
    this._saveAndClose(true);
  }

  public onTextChange(cb: (event: TextChangeEvent) => void): this {
    this._onTextChangeCallbacks.push(cb);
    return this;
  }

  public offTextChange(cb: (event: TextChangeEvent) => void): this {
    const i = this._onTextChangeCallbacks.indexOf(cb);
    if (i !== -1) this._onTextChangeCallbacks.splice(i, 1);
    return this;
  }

  public onEditStart(cb: () => void): this {
    this._onEditStartCallbacks.push(cb);
    return this;
  }

  public offEditStart(cb: () => void): this {
    const i = this._onEditStartCallbacks.indexOf(cb);
    if (i !== -1) this._onEditStartCallbacks.splice(i, 1);
    return this;
  }

  public onEditEnd(cb: () => void): this {
    this._onEditEndCallbacks.push(cb);
    return this;
  }

  public offEditEnd(cb: () => void): this {
    const i = this._onEditEndCallbacks.indexOf(cb);
    if (i !== -1) this._onEditEndCallbacks.splice(i, 1);
    return this;
  }

  private _setupEditHandler(): void {
    this.konvaNode.on('dblclick.textEdit dbltap.textEdit', () => {
      // Для нод внутри реальной или временной группы меняем семантику двойного клика:
      // первый двойной клик подготавливает выделение (SelectionPlugin обрабатывает клики сам),
      // повторный двойной клик уже включает режим редактирования.

      const parent = this.konvaNode.getParent();
      const grand = parent ? parent.getParent() : null;
      const inGroupOrTemp = parent instanceof Konva.Group && grand instanceof Konva.Group;

      if (!inGroupOrTemp) {
        // Одиночная текстовая нода: поведение без изменений
        this._openTextarea();
        return;
      }

      if (!this._groupEditClickResetAttached) {
        const stage = this.konvaNode.getStage();
        if (stage) {
          this._groupEditClickResetAttached = true;
          stage.on(
            'mousedown.textEditGroupReset',
            (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
              const target = e.target as Konva.Node;
              if (target === this.konvaNode) return;
              this._pendingGroupEditDblClick = false;
            },
          );
        }
      }

      // Нода внутри группы (реальной или временной)
      if (this._isEditing) return;

      if (!this._pendingGroupEditDblClick) {
        // Первый двойной клик: только подготовка (нода уже будет выделена SelectionPlugin'ом
        // за счёт одиночных кликов), без входа в режим редактирования.
        this._pendingGroupEditDblClick = true;
        return;
      }

      // Повторный двойной клик по той же ноде внутри группы — открываем редактирование
      this._pendingGroupEditDblClick = false;
      this._openTextarea();
    });
  }

  /**
   * При трансформации (resize) «запекаем» scaleX/scaleY в width/height,
   * а затем сбрасываем scale обратно в 1.
   *
   * В итоге:
   * - рамка может свободно менять ширину/высоту и по диагонали;
   * - сам текст не растягивается, т.к. fontSize не меняется, а scale всегда 1.
   */
  private _setupTransformHandler(): void {
    this.konvaNode.on('transform.textResize', () => {
      const scaleX = this.konvaNode.scaleX();
      const scaleY = this.konvaNode.scaleY();

      // Применяем горизонтальный scale к ширине текстового блока
      const newWidth = Math.max(1, this.konvaNode.width() * scaleX);
      this.konvaNode.width(newWidth);

      // Применяем вертикальный scale к высоте рамки
      const currentHeight = this.konvaNode.height();
      const newHeight = Math.max(1, currentHeight * scaleY);
      this.konvaNode.height(newHeight);

      // После «запекания» scale всегда возвращаем в 1, чтобы не искажать шрифт
      this.konvaNode.scaleX(1);
      this.konvaNode.scaleY(1);

      // Во время ресайза по ширине текст может переноситься и требовать большей высоты.
      // Обновляем height сразу, чтобы transformer/рамка выделения не обрезали строки.
      this._ensureHeightFitsWrappedText();
    });

    this.konvaNode.on('transformend.textResize', () => {
      // После изменения ширины (wrap) высота текста может увеличиться —
      // увеличиваем высоту ноды, чтобы рамка выделения не обрезала текст.
      this._ensureHeightFitsWrappedText();
      this.konvaNode.getLayer()?.batchDraw();
    });
  }

  private _oldText = '';
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _clickHandler: ((e: Event) => void) | null = null;
  private _syncTextareaRafId: number | null = null;
  private _inputHandler: (() => void) | null = null;
  private _prevWrap: Konva.TextConfig['wrap'] | null = null;

  private _getWrappedLineCount(innerWidth: number): number {
    const text = this.konvaNode.text();
    if (!text) return 1;

    const wrap = this.konvaNode.wrap();
    const paragraphs = text.split('\n');

    if (wrap === 'none') {
      return Math.max(1, paragraphs.length);
    }

    const maxW = Math.max(0, innerWidth);
    let lines = 0;

    for (const paragraph of paragraphs) {
      // Пустая строка всё равно занимает одну строку
      if (paragraph.length === 0) {
        lines += 1;
        continue;
      }

      if (wrap === 'char') {
        let current = '';
        for (const ch of paragraph) {
          const next = current + ch;
          if (this.konvaNode.measureSize(next).width <= maxW || current.length === 0) {
            current = next;
            continue;
          }
          lines += 1;
          current = ch;
        }
        if (current.length > 0) lines += 1;
        continue;
      }

      // wrap === 'word'
      // Сохраняем пробелы как разделители, но в line измеряем без ведущих пробелов
      const words = paragraph.split(/\s+/g);
      let current = '';
      for (const word of words) {
        if (!word) continue;
        const candidate = current ? current + ' ' + word : word;
        if (this.konvaNode.measureSize(candidate).width <= maxW || current.length === 0) {
          current = candidate;
          continue;
        }
        lines += 1;
        current = word;
      }
      if (current.length > 0) lines += 1;
    }

    return Math.max(1, lines);
  }

  private _ensureHeightFitsWrappedText(): void {
    const padding = this.konvaNode.padding() * 2;
    const innerWidth = this.konvaNode.width() - padding;

    // При wrap:none высоту не трогаем (там переносов нет)
    if (this.konvaNode.wrap() === 'none') return;

    const lineCount = this._getWrappedLineCount(innerWidth);
    const linePx = this.konvaNode.fontSize() * this.konvaNode.lineHeight();
    const needed = Math.ceil(lineCount * linePx + padding);

    if (Number.isFinite(needed) && needed > this.konvaNode.height()) {
      this.konvaNode.height(needed);
    }
  }

  private _ensureWidthFitsText(): void {
    const padding = this.konvaNode.padding() * 2;
    const text = this.konvaNode.text();
    const lines = text.split('\n');

    let maxLineWidth = 0;
    for (const line of lines) {
      const m = this.konvaNode.measureSize(line);
      if (m.width > maxLineWidth) maxLineWidth = m.width;
    }

    // Небольшой запас на округления/кернинг, чтобы после выхода из edit-mode
    // текст не переносился из-за "минус пары пикселей".
    const EPS = 2;
    const needed = Math.ceil(maxLineWidth + padding + EPS);
    if (Number.isFinite(needed) && needed > this.konvaNode.width()) {
      this.konvaNode.width(needed);
    }
  }

  private _syncNodeSizeFromTextarea(): void {
    if (!this._isEditing || !this._textarea) return;

    const ta = this._textarea;
    const scale = this.konvaNode.getAbsoluteScale();
    const factor = scale.x || scale.y || 1;

    const padding = this.konvaNode.padding() * 2;
    const neededInnerWidth = ta.scrollWidth;
    const neededHeight = ta.scrollHeight;

    const newWidth = Math.max(1, neededInnerWidth / factor + padding);
    const newHeight = Math.max(1, neededHeight / factor + padding);

    if (Number.isFinite(newWidth) && newWidth !== this.konvaNode.width()) {
      this.konvaNode.width(newWidth);
    }
    if (Number.isFinite(newHeight) && newHeight !== this.konvaNode.height()) {
      this.konvaNode.height(newHeight);
    }
  }

  private _syncTextareaPosition(): void {
    if (!this._isEditing || !this._textarea) return;
    const stage = this.konvaNode.getStage();
    if (!stage) return;

    this._syncNodeSizeFromTextarea();

    const pos = this.konvaNode.absolutePosition();
    const box = stage.container().getBoundingClientRect();
    const sc = this.konvaNode.getAbsoluteScale();

    this._textarea.style.top = String(box.top + pos.y) + 'px';
    this._textarea.style.left = String(box.left + pos.x) + 'px';
    this._textarea.style.width =
      String((this.konvaNode.width() - this.konvaNode.padding() * 2) * sc.x) + 'px';
    this._textarea.style.fontSize = String(this.konvaNode.fontSize() * sc.x) + 'px';

    this._syncTextareaRafId = globalThis.requestAnimationFrame(() => {
      this._syncTextareaPosition();
    });
  }

  private _openTextarea(): void {
    if (this._isEditing) return;
    const stage = this.konvaNode.getStage();
    if (!stage) return;
    this._isEditing = true;
    this._oldText = this.konvaNode.text();

    this._prevWrap = this.konvaNode.wrap();
    this.konvaNode.wrap('none');

    // Не hide(): иначе getClientRect() для ноды станет нулевым и рамка выделения не обновляется.
    this.konvaNode.opacity(0);
    this.konvaNode.listening(false);
    stage.batchDraw();

    const pos = this.konvaNode.absolutePosition();
    const box = stage.container().getBoundingClientRect();
    const sc = this.konvaNode.getAbsoluteScale();

    const ta = globalThis.document.createElement('textarea');
    globalThis.document.body.appendChild(ta);
    this._textarea = ta;

    ta.value = this.konvaNode.text();
    ta.style.position = 'absolute';
    ta.style.top = String(box.top + pos.y) + 'px';
    ta.style.left = String(box.left + pos.x) + 'px';
    ta.style.width = String((this.konvaNode.width() - this.konvaNode.padding() * 2) * sc.x) + 'px';
    ta.style.fontSize = String(this.konvaNode.fontSize() * sc.x) + 'px';
    ta.style.border = 'none';
    ta.style.padding = '0';
    ta.style.margin = '0';
    ta.style.overflow = 'hidden';
    ta.wrap = 'off';
    ta.style.whiteSpace = 'pre';
    ta.style.background = 'none';
    ta.style.outline = 'none';
    ta.style.resize = 'none';
    ta.style.lineHeight = String(this.konvaNode.lineHeight());
    ta.style.fontFamily = this.konvaNode.fontFamily();
    ta.style.transformOrigin = 'left top';
    ta.style.textAlign = this.konvaNode.align();
    const fillColor = this.konvaNode.fill();
    ta.style.color = typeof fillColor === 'string' ? fillColor : '#000000';

    const fs = this.konvaNode.fontStyle();
    ta.style.fontStyle = fs.includes('italic') ? 'italic' : 'normal';
    ta.style.fontWeight = fs.includes('bold') ? 'bold' : 'normal';

    const rot = this.konvaNode.rotation();
    if (rot) ta.style.transform = 'rotateZ(' + String(rot) + 'deg)';

    ta.style.height = 'auto';
    // ta.style.height = String(ta.scrollHeight + 3) + 'px';
    ta.focus();
    ta.select();

    const updateFromTextarea = (): void => {
      if (!this._textarea) return;

      this._textarea.style.height = 'auto';
      this._textarea.style.height = String(this._textarea.scrollHeight) + 'px';

      this._syncNodeSizeFromTextarea();

      const scale = this.konvaNode.getAbsoluteScale();
      const factor = scale.x || scale.y || 1;
      this._textarea.style.width =
        String((this.konvaNode.width() - this.konvaNode.padding() * 2) * factor) + 'px';

      this.konvaNode.getLayer()?.batchDraw();
    };

    this._inputHandler = () => {
      globalThis.requestAnimationFrame(() => {
        updateFromTextarea();
      });
    };
    ta.addEventListener('input', this._inputHandler);
    updateFromTextarea();

    // Постоянно синхронизируем позицию textarea с нодой (камера, зум, перетаскивание мира)
    this._syncTextareaRafId = globalThis.requestAnimationFrame(() => {
      this._syncTextareaPosition();
    });

    for (const c of this._onEditStartCallbacks) c();

    this._keyHandler = (e: KeyboardEvent): void => {
      // Ctrl+Enter / Cmd+Enter — завершить редактирование и сохранить
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this._saveAndClose(false);
        return;
      }
      // Escape — отменить изменения
      if (e.key === 'Escape') {
        e.preventDefault();
        this._saveAndClose(true);
        return;
      }
      globalThis.requestAnimationFrame(() => {
        updateFromTextarea();
      });
    };

    this._clickHandler = (e: Event): void => {
      if (e.target !== ta) this._saveAndClose(false);
    };

    ta.addEventListener('keydown', this._keyHandler);
    globalThis.setTimeout(() => {
      if (this._clickHandler) {
        globalThis.addEventListener('click', this._clickHandler);
        globalThis.addEventListener('touchstart', this._clickHandler);
      }
    });
  }

  private _saveAndClose(cancelled: boolean): void {
    if (!this._textarea) return;

    const newText = cancelled ? this._oldText : this._textarea.value;
    this.konvaNode.text(newText);

    if (!cancelled) {
      this._syncNodeSizeFromTextarea();
    }

    // Останавливаем цикл синхронизации позиции textarea
    if (this._syncTextareaRafId !== null) {
      globalThis.cancelAnimationFrame(this._syncTextareaRafId);
      this._syncTextareaRafId = null;
    }

    if (this._keyHandler) {
      this._textarea.removeEventListener('keydown', this._keyHandler);
    }
    if (this._inputHandler) {
      this._textarea.removeEventListener('input', this._inputHandler);
    }
    if (this._clickHandler) {
      globalThis.removeEventListener('click', this._clickHandler);
      globalThis.removeEventListener('touchstart', this._clickHandler);
    }

    this._textarea.remove();
    this._textarea = null;
    this._keyHandler = null;
    this._clickHandler = null;
    this._inputHandler = null;

    if (this._prevWrap) {
      this.konvaNode.wrap(this._prevWrap);
      this._prevWrap = null;
    }

    this._ensureWidthFitsText();
    this._ensureHeightFitsWrappedText();

    this.konvaNode.opacity(1);
    this.konvaNode.listening(true);
    this.konvaNode.getStage()?.batchDraw();
    this._isEditing = false;
    // Сброс ожидания повторного двойного клика внутри группы после завершения редактирования
    this._pendingGroupEditDblClick = false;

    for (const c of this._onTextChangeCallbacks) {
      c({ oldText: this._oldText, newText, cancelled });
    }
    for (const c of this._onEditEndCallbacks) c();
  }
}
