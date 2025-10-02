import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';

import { Plugin } from './Plugin';
import type { SelectionPlugin } from './SelectionPlugin';

export interface NodeHotkeysOptions {
  target?: Window | Document | HTMLElement | EventTarget;
  ignoreEditableTargets?: boolean;
}

interface ClipboardData {
  nodes: {
    type: string;
    config: Record<string, unknown>;
    position: { x: number; y: number };
    children?: ClipboardData['nodes'];
  }[];
  // Визуальный центр в мировых координатах на момент копирования (учитывает offset/rotation/scale)
  center?: { x: number; y: number };
}

export class NodeHotkeysPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<Omit<NodeHotkeysOptions, 'target'>> & { target: EventTarget };
  private _clipboard: ClipboardData | null = null;
  private _selectionPlugin?: SelectionPlugin;

  constructor(options: NodeHotkeysOptions = {}) {
    super();
    const { target = globalThis as unknown as EventTarget, ignoreEditableTargets = true } = options;

    this._options = {
      target,
      ignoreEditableTargets,
    };
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Подписываемся на keydown
    this._options.target.addEventListener('keydown', this._onKeyDown as EventListener);
  }

  protected onDetach(_core: CoreEngine): void {
    this._options.target.removeEventListener('keydown', this._onKeyDown as EventListener);
    this._core = undefined as unknown as CoreEngine;
    this._selectionPlugin = undefined as unknown as SelectionPlugin;
    this._clipboard = null;
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    if (!this._core) return;

    // Получаем SelectionPlugin лениво при первом использовании
    if (!this._selectionPlugin) {
      const plugin = this._core.plugins.get('SelectionPlugin');
      if (plugin) {
        this._selectionPlugin = plugin as SelectionPlugin;
      }
    }

    if (!this._selectionPlugin) return;

    // Игнорируем, если фокус на редактируемом элементе
    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Ctrl+C - Копировать
    if (ctrl && e.code === 'KeyC') {
      e.preventDefault();
      this._handleCopy();
      return;
    }

    // Ctrl+X - Вырезать
    if (ctrl && e.code === 'KeyX') {
      e.preventDefault();
      this._handleCut();
      return;
    }

    // Ctrl+V - Вставить
    if (ctrl && e.code === 'KeyV') {
      e.preventDefault();
      this._handlePaste();
      return;
    }

    // Delete или Backspace - Удалить
    if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      this._handleDelete();
      return;
    }

    // Ctrl+] или Ctrl+Shift+= - Повысить z-index (moveUp)
    if (ctrl && (e.code === 'BracketRight' || (shift && e.code === 'Equal'))) {
      e.preventDefault();
      this._handleMoveUp();
      return;
    }

    // Ctrl+[ или Ctrl+Shift+- - Понизить z-index (moveDown)
    if (ctrl && (e.code === 'BracketLeft' || (shift && e.code === 'Minus'))) {
      e.preventDefault();
      this._handleMoveDown();
      return;
    }
  };

  private _isEditableTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  private _handleCopy(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    const nodes = selected.map((node) => this._serializeNode(node));
    const center = this._computeSelectionWorldCenter(selected);
    this._clipboard = { nodes, center };

    // Copied successfully
    if (this._core) {
      this._core.eventBus.emit('clipboard:copy', selected);
    }
  }

  private _handleCut(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    const nodes = selected.map((node) => this._serializeNode(node));
    const center = this._computeSelectionWorldCenter(selected);
    this._clipboard = { nodes, center };

    // Удаляем ноды
    this._deleteNodes(selected);

    // Cut successfully
    if (this._core) {
      this._core.eventBus.emit('clipboard:cut', selected);
    }
  }

  private _handlePaste(): void {
    if (!this._core || !this._clipboard || this._clipboard.nodes.length === 0) return;

    // Определяем позицию вставки
    const pastePosition = this._getPastePosition();

    // Вычисляем центр скопированных нод
    const clipboardCenter = this._getClipboardCenter();

    // Вставляем ноды со смещением относительно новой позиции
    const newNodes: BaseNode[] = [];
    for (const nodeData of this._clipboard.nodes) {
      const offsetX = nodeData.position.x - clipboardCenter.x;
      const offsetY = nodeData.position.y - clipboardCenter.y;

      const newNode = this._deserializeNode(nodeData, {
        x: pastePosition.x + offsetX,
        y: pastePosition.y + offsetY,
      });

      if (newNode) {
        newNodes.push(newNode);
      }
    }

    // Pasted successfully
    if (newNodes.length > 0) {
      this._core.eventBus.emit('clipboard:paste', newNodes);
    }
    this._core.nodes.layer.batchDraw();
  }

  private _handleDelete(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    this._deleteNodes(selected);
    // Deleted successfully
  }

  private _getSelectedNodes(): BaseNode[] {
    if (!this._selectionPlugin) return [];
    // 1) Если активна временная группа (_tempMultiGroup), собрать ноды из её детей
    const tempGroup = (
      this._selectionPlugin as unknown as { _tempMultiGroup?: { getChildren?: () => unknown[] } }
    )._tempMultiGroup;
    if (tempGroup && typeof tempGroup.getChildren === 'function' && this._core) {
      const children = tempGroup.getChildren();
      const list: BaseNode[] = this._core.nodes.list();
      const set = new Set<BaseNode>();
      for (const ch of children) {
        const bn = list.find((n) => n.getNode() === ch);
        if (bn) set.add(bn);
      }
      if (set.size > 0) return Array.from(set);
    }

    // 2) Проверяем временную группу через _tempMultiSet (мультисет SelectionPlugin)
    const tempMultiSet = (this._selectionPlugin as unknown as { _tempMultiSet?: Set<BaseNode> })
      ._tempMultiSet;
    if (tempMultiSet && tempMultiSet.size > 0) {
      return Array.from(tempMultiSet);
    }

    // 3) Проверяем одиночное выделение
    const selected = (this._selectionPlugin as unknown as { _selected?: BaseNode | null })
      ._selected;
    if (selected) {
      return [selected];
    }

    return [];
  }

  private _deleteNodes(nodes: BaseNode[]): void {
    if (!this._core) return;

    // Снимаем выделение перед удалением
    if (this._selectionPlugin) {
      const plugin = this._selectionPlugin as unknown as {
        _destroyTempMulti?: () => void;
        _clearSelection?: () => void;
      };
      if (typeof plugin._destroyTempMulti === 'function') {
        plugin._destroyTempMulti();
      }
      if (typeof plugin._clearSelection === 'function') {
        plugin._clearSelection();
      }
    }

    // Удаляем ноды
    for (const node of nodes) {
      this._core.nodes.remove(node);
    }
  }

  // Сериализация ноды в буфер, позиция — в координатах мира
  private _serializeNode(node: BaseNode): ClipboardData['nodes'][0] {
    const konvaNode = node.getNode();
    const attrs = konvaNode.getAttrs();
    const nodeType = this._getNodeType(node);

    let pos = { x: 0, y: 0 };
    if (this._core) {
      const kn = konvaNode as unknown as Konva.Node;
      const abs = kn.getAbsolutePosition();
      const inv = this._core.nodes.world.getAbsoluteTransform().copy().invert();
      const wpt = inv.point(abs);
      pos = { x: wpt.x, y: wpt.y };
    }

    const serialized: ClipboardData['nodes'][0] = {
      type: nodeType,
      config: {
        ...attrs,
        id: undefined,
      },
      position: pos,
    };

    // Если это группа, сериализуем дочерние элементы
    if (nodeType === 'group') {
      const gKn = konvaNode as unknown as Konva.Group;
      const children = gKn.getChildren();
      const serializedChildren: ClipboardData['nodes'] = [];

      for (const child of children) {
        // Сериализуем каждый дочерний Konva.Node напрямую
        const childSerialized = this._serializeKonvaNode(child as unknown as Konva.Node);
        if (childSerialized) {
          serializedChildren.push(childSerialized);
        }
      }

      if (serializedChildren.length > 0) {
        serialized.children = serializedChildren;
      }
    }

    return serialized;
  }

  // Сериализация Konva.Node (не BaseNode) для дочерних элементов группы
  private _serializeKonvaNode(kn: Konva.Node): ClipboardData['nodes'][0] | null {
    if (!this._core) return null;

    const attrs = kn.getAttrs();
    const className = kn.getClassName();

    // Определяем тип по className Konva (Rect -> shape, Circle -> circle, etc.)
    let nodeType = className.toLowerCase();
    if (nodeType === 'rect') nodeType = 'shape';

    // Для дочерних элементов группы сохраняем ОТНОСИТЕЛЬНЫЕ позиции (x, y внутри группы)
    const serialized: ClipboardData['nodes'][0] = {
      type: nodeType,
      config: {
        ...attrs,
        id: undefined,
      },
      position: { x: kn.x(), y: kn.y() }, // Относительные координаты внутри группы
    };

    // Рекурсивно обрабатываем вложенные группы
    if (kn instanceof Konva.Group) {
      const children = kn.getChildren();
      const serializedChildren: ClipboardData['nodes'] = [];

      for (const child of children) {
        const childSerialized = this._serializeKonvaNode(child as unknown as Konva.Node);
        if (childSerialized) {
          serializedChildren.push(childSerialized);
        }
      }

      if (serializedChildren.length > 0) {
        serialized.children = serializedChildren;
      }
    }

    return serialized;
  }

  private _getNodeType(node: BaseNode): string {
    const className = node.constructor.name;
    // ShapeNode -> shape, TextNode -> text, etc.
    return className.replace('Node', '').toLowerCase();
  }

  private _deserializeNode(
    data: ClipboardData['nodes'][0],
    position: { x: number; y: number },
  ): BaseNode | null {
    if (!this._core) return null;

    // Удаляем zIndex из конфига, так как он будет установлен автоматически
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { zIndex, ...configWithoutZIndex } = data.config;

    const config = {
      ...configWithoutZIndex,
      x: position.x,
      y: position.y,
    };

    try {
      let newNode: BaseNode | null = null;

      switch (data.type) {
        case 'shape':
          newNode = this._core.nodes.addShape(config);
          break;
        case 'text':
          newNode = this._core.nodes.addText(config);
          break;
        case 'circle':
          newNode = this._core.nodes.addCircle(config);
          break;
        case 'ellipse':
          newNode = this._core.nodes.addEllipse(config);
          break;
        case 'arc':
          newNode = this._core.nodes.addArc(config);
          break;
        case 'star':
          newNode = this._core.nodes.addStar(config);
          break;
        case 'arrow':
          newNode = this._core.nodes.addArrow(config);
          break;
        case 'ring':
          newNode = this._core.nodes.addRing(config);
          break;
        case 'regularPolygon':
        case 'regularpolygon':
          newNode = this._core.nodes.addRegularPolygon(config);
          break;
        case 'image':
          newNode = this._core.nodes.addImage(config);
          break;
        case 'label':
          // LabelNode пока не поддерживается через NodeManager
          globalThis.console.warn('LabelNode is not supported for copy/paste yet');
          return null;
        case 'group': {
          newNode = this._core.nodes.addGroup(config);
          // Принудительно применяем все атрибуты трансформации после создания
          const groupKonvaNode = newNode.getNode() as unknown as Konva.Group;
          // Применяем масштаб, поворот и другие атрибуты
          if (data.config['scaleX'] !== undefined)
            groupKonvaNode.scaleX(data.config['scaleX'] as number);
          if (data.config['scaleY'] !== undefined)
            groupKonvaNode.scaleY(data.config['scaleY'] as number);
          if (data.config['rotation'] !== undefined)
            groupKonvaNode.rotation(data.config['rotation'] as number);
          if (data.config['skewX'] !== undefined)
            groupKonvaNode.skewX(data.config['skewX'] as number);
          if (data.config['skewY'] !== undefined)
            groupKonvaNode.skewY(data.config['skewY'] as number);
          if (data.config['offsetX'] !== undefined)
            groupKonvaNode.offsetX(data.config['offsetX'] as number);
          if (data.config['offsetY'] !== undefined)
            groupKonvaNode.offsetY(data.config['offsetY'] as number);

          // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: восстанавливаем ВСЕ дочерние элементы через NodeManager
          // Это гарантирует, что к ним можно провалиться через двойной клик
          if (data.children && data.children.length > 0) {
            for (const childData of data.children) {
              // Создаём ЛЮБУЮ дочернюю ноду (группу или обычную) через _deserializeNode
              // Это регистрирует её в NodeManager и делает доступной
              const childBaseNode = this._deserializeNode(childData, {
                x: childData.position.x,
                y: childData.position.y,
              });
              if (childBaseNode) {
                const childKonvaNode = childBaseNode.getNode();
                // Отключаем draggable для дочерних элементов
                if (typeof childKonvaNode.draggable === 'function') {
                  childKonvaNode.draggable(false);
                }
                // Перемещаем из world в родительскую группу
                childKonvaNode.moveTo(groupKonvaNode);
              }
            }
          }
          break;
        }
        default:
          globalThis.console.warn(`Unknown node type: ${data.type}`);
          return null;
      }

      // Принудительно применяем атрибуты трансформации для ВСЕХ типов нод
      const konvaNode = newNode.getNode() as unknown as Konva.Node;
      if (data.config['scaleX'] !== undefined) konvaNode.scaleX(data.config['scaleX'] as number);
      if (data.config['scaleY'] !== undefined) konvaNode.scaleY(data.config['scaleY'] as number);
      if (data.config['rotation'] !== undefined)
        konvaNode.rotation(data.config['rotation'] as number);
      if (data.config['skewX'] !== undefined) konvaNode.skewX(data.config['skewX'] as number);
      if (data.config['skewY'] !== undefined) konvaNode.skewY(data.config['skewY'] as number);
      if (data.config['offsetX'] !== undefined) konvaNode.offsetX(data.config['offsetX'] as number);
      if (data.config['offsetY'] !== undefined) konvaNode.offsetY(data.config['offsetY'] as number);

      return newNode;
    } catch (error) {
      globalThis.console.error(`Failed to deserialize node:`, error);
      return null;
    }
  }

  private _getPastePosition(): { x: number; y: number } {
    if (!this._core) return { x: 0, y: 0 };

    const stage = this._core.stage;
    const pointer = stage.getPointerPosition();

    // Проверяем, что курсор на экране и в пределах canvas
    if (pointer && this._isPointerOnScreen(pointer)) {
      const world = this._core.nodes.world;
      const worldTransform = world.getAbsoluteTransform().copy().invert();
      const worldPos = worldTransform.point(pointer);
      return { x: worldPos.x, y: worldPos.y };
    }

    // Если курсора нет или он за пределами экрана - вставляем в центр экрана
    return this._getScreenCenter();
  }

  private _isPointerOnScreen(pointer: { x: number; y: number }): boolean {
    if (!this._core) return false;
    const stage = this._core.stage;
    const width = stage.width();
    const height = stage.height();
    return pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
  }

  private _getScreenCenter(): { x: number; y: number } {
    if (!this._core) return { x: 0, y: 0 };

    const stage = this._core.stage;
    const world = this._core.nodes.world;

    const centerX = stage.width() / 2;
    const centerY = stage.height() / 2;

    const worldTransform = world.getAbsoluteTransform().copy().invert();
    const worldPos = worldTransform.point({ x: centerX, y: centerY });

    return { x: worldPos.x, y: worldPos.y };
  }

  private _getClipboardCenter(): { x: number; y: number } {
    if (!this._clipboard || this._clipboard.nodes.length === 0) {
      return { x: 0, y: 0 };
    }
    // Если сохранён точный визуальный центр — используем его
    if (this._clipboard.center) return this._clipboard.center;
    // Fallback: среднее по позициям
    let sumX = 0;
    let sumY = 0;
    for (const node of this._clipboard.nodes) {
      sumX += node.position.x;
      sumY += node.position.y;
    }
    return { x: sumX / this._clipboard.nodes.length, y: sumY / this._clipboard.nodes.length };
  }

  // Рассчитывает визуальный bbox выделенных нод и возвращает его центр в мировых координатах
  private _computeSelectionWorldCenter(nodes: BaseNode[]): { x: number; y: number } {
    if (!this._core || nodes.length === 0) return { x: 0, y: 0 };
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const n of nodes) {
      const kn = n.getNode() as unknown as Konva.Node;
      // clientRect уже учитывает все трансформации (кроме stroke по умолчанию — нам не критично)
      const r = kn.getClientRect({ skipShadow: true, skipStroke: true });
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return { x: 0, y: 0 };
    }

    // Центр bbox сейчас в координатах сцены (stage). Переводим в координаты мира (world).
    const cxStage = (minX + maxX) / 2;
    const cyStage = (minY + maxY) / 2;
    const world = this._core.nodes.world;
    const invWorld = world.getAbsoluteTransform().copy().invert();
    const ptWorld = invWorld.point({ x: cxStage, y: cyStage });
    return { x: ptWorld.x, y: ptWorld.y };
  }

  // Повысить z-index выбранной ноды (инкрементировать на 1)
  private _handleMoveUp(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    // Перемещаем каждую выбранную ноду на один уровень вперёд
    for (const node of selected) {
      const konvaNode = node.getNode() as unknown as Konva.Node;

      // Запрещаем изменение z-index для одиночной ноды внутри настоящей группы
      if (this._isNodeInsidePermanentGroup(konvaNode)) {
        continue;
      }

      const oldIndex = konvaNode.zIndex();
      konvaNode.moveUp();
      const newIndex = konvaNode.zIndex();

      // Синхронизируем z-index внутри группы (если нода в группе или это группа)
      this._syncGroupZIndex(konvaNode, newIndex);

      // Эмитим событие изменения z-index
      if (this._core && oldIndex !== newIndex) {
        this._core.eventBus.emit('node:zIndexChanged', node, oldIndex, newIndex);
      }
    }

    if (this._core) {
      // Принудительная перерисовка всего слоя
      this._core.nodes.layer.draw();

      // Также перерисовываем stage для обновления transformer
      this._core.stage.batchDraw();
    }
  }

  // Понизить z-index выбранной ноды (декрементировать на 1)
  private _handleMoveDown(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    // Перемещаем каждую выбранную ноду на один уровень назад (в обратном порядке, чтобы избежать конфликтов)
    for (let i = selected.length - 1; i >= 0; i--) {
      const node = selected[i];
      if (!node) continue;
      const konvaNode = node.getNode() as unknown as Konva.Node;

      // Запрещаем изменение z-index для одиночной ноды внутри настоящей группы
      if (this._isNodeInsidePermanentGroup(konvaNode)) {
        continue;
      }

      const oldIndex = konvaNode.zIndex();
      konvaNode.moveDown();
      const newIndex = konvaNode.zIndex();

      // Синхронизируем z-index внутри группы (если нода в группе или это группа)
      this._syncGroupZIndex(konvaNode, newIndex);

      // Эмитим событие изменения z-index
      if (this._core && oldIndex !== newIndex) {
        this._core.eventBus.emit('node:zIndexChanged', node, oldIndex, newIndex);
      }
    }

    if (this._core) {
      // Принудительная перерисовка всего слоя
      this._core.nodes.layer.draw();

      // Также перерисовываем stage для обновления transformer
      this._core.stage.batchDraw();
    }
  }

  /**
   * Проверяет, находится ли нода внутри настоящей группы (не является самой группой)
   */
  private _isNodeInsidePermanentGroup(konvaNode: Konva.Node): boolean {
    // Если это сама группа — разрешаем изменение z-index
    if (konvaNode instanceof Konva.Group) {
      return false;
    }

    const parent = konvaNode.getParent();
    if (!parent) return false;

    // Если родитель — группа (не world) — это настоящая группа
    return parent instanceof Konva.Group && parent.name() !== 'world';
  }

  /**
   * Синхронизирует z-index всех нод внутри группы:
   * - Если нода является группой — устанавливает всем дочерним нодам одинаковый z-index
   * - Если нода внутри группы — устанавливает всем соседям тот же z-index
   */
  private _syncGroupZIndex(konvaNode: Konva.Node, targetZIndex: number): void {
    const parent = konvaNode.getParent();
    if (!parent) return;

    // Если это группа — синхронизируем всех детей
    if (konvaNode instanceof Konva.Group) {
      const children = konvaNode.getChildren();
      for (const child of children) {
        child.zIndex(targetZIndex);
      }
      return;
    }

    // Если нода внутри группы — синхронизируем со всеми соседями
    if (parent instanceof Konva.Group && parent.name() !== 'world') {
      const siblings = parent.getChildren();
      for (const sibling of siblings) {
        if (sibling !== konvaNode) {
          sibling.zIndex(targetZIndex);
        }
      }
    }
  }
}
