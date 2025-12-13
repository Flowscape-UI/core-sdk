import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import { HistoryManager, type HistoryAction } from '../managers/HistoryManager';
import type { BaseNode } from '../nodes/BaseNode';
import type { NodeHandle } from '../types/public/node-handles';

import { Plugin } from './Plugin';

export interface HistoryPluginOptions {
  /** DOM target для прослушивания клавиш (по умолчанию globalThis) */
  target?: Window | Document | HTMLElement | EventTarget;
  /** Игнорировать хоткеи, если фокус на редактируемом элементе */
  ignoreEditableTargets?: boolean;
  /** Максимальное количество действий в истории (0 = без лимита) */
  maxHistoryLength?: number;
}

/** Сериализованное состояние ноды для истории */
interface SerializedNodeState {
  /** Тип ноды: 'shape', 'text', 'circle', etc. */
  nodeType: string;
  /** ID ноды */
  nodeId: string;
  /** Все атрибуты Konva ноды */
  attrs: Record<string, unknown>;
  /** ID родительской группы (если нода в группе) */
  parentId?: string;
  /** Дети (для групп) */
  children?: SerializedNodeState[];
}

/**
 * HistoryPlugin — плагин для Undo/Redo функциональности
 *
 * Хоткеи:
 * - Ctrl+Z / Cmd+Z — Undo
 * - Ctrl+Shift+Z / Cmd+Shift+Z — Redo
 *
 * Автоматически записывает в историю:
 * - Создание нод (node:created)
 * - Удаление нод (node:removed)
 * - Трансформации (node:transformed)
 * - Изменение z-index (node:zIndexChanged)
 * - Создание групп (group:created)
 * - Разгруппировка (group:ungrouped)
 */
export class HistoryPlugin extends Plugin {
  private _core?: CoreEngine;
  private _history: HistoryManager;
  private _options: Required<Omit<HistoryPluginOptions, 'target'>> & { target: EventTarget };

  /** Флаг для предотвращения записи в историю при undo/redo */
  private _isUndoRedoInProgress = false;

  /** Кэш состояний нод ДО начала drag/transform */
  private _dragStartStateCache = new Map<string, Record<string, unknown>>();

  /** Флаг batch-режима для временной группы */
  private _isBatchMode = false;
  /** Буфер действий для batch */
  private _batchBuffer: HistoryAction[] = [];
  /** Таймер для автоматического завершения batch */
  private _batchCommitTimer: number | null = null;

  constructor(options: HistoryPluginOptions = {}) {
    super();
    this._history = new HistoryManager();

    const {
      target = globalThis as unknown as EventTarget,
      ignoreEditableTargets = true,
      maxHistoryLength = 100,
    } = options;

    this._options = {
      target,
      ignoreEditableTargets,
      maxHistoryLength,
    };
  }

  /**
   * Получить менеджер истории для внешнего доступа
   */
  public getHistoryManager(): HistoryManager {
    return this._history;
  }

  /**
   * Начать batch-режим для группировки нескольких действий
   */
  public startBatch(): void {
    if (this._batchCommitTimer !== null) {
      globalThis.clearTimeout(this._batchCommitTimer);
      this._batchCommitTimer = null;
    }
    this._isBatchMode = true;
    this._batchBuffer = [];
    this._debug('batch started');
  }

  /**
   * Завершить batch-режим (вызывается извне после эмита всех событий)
   */
  public commitBatch(): void {
    if (this._batchCommitTimer !== null) {
      globalThis.clearTimeout(this._batchCommitTimer);
      this._batchCommitTimer = null;
    }
    this._finishBatch();
  }

  /**
   * Проверить, активен ли batch-режим
   */
  public isBatchMode(): boolean {
    return this._isBatchMode;
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Подписка на клавиатурные события
    this._options.target.addEventListener('keydown', this._onKeyDown as EventListener);

    // Подписка на события нод для автоматической записи в историю
    core.eventBus.on('node:created', this._onNodeCreated);
    core.eventBus.on('node:removed', this._onNodeRemoved);
    core.eventBus.on('node:transformed', this._onNodeTransformed);
    core.eventBus.on('node:zIndexChanged', this._onZIndexChanged);
    core.eventBus.on('group:created', this._onGroupCreated);
    core.eventBus.on('group:ungrouped', this._onGroupUngrouped);

    // Подписка на Konva события для отслеживания начала drag/transform
    // Используем world для drag и layer для transform (Transformer находится на layer)
    const world = core.nodes.world;
    const layer = core.nodes.layer;
    world.on('dragstart.history', this._onDragStart);
    world.on('dragend.history', this._onDragEnd);
    // Transform события слушаем на layer, т.к. Transformer там
    layer.on('transformstart.history', this._onTransformStart);
    layer.on('transformend.history', this._onTransformEnd);

    this._debug('attached');
  }

  protected onDetach(core: CoreEngine): void {
    // Отписка от клавиатурных событий
    this._options.target.removeEventListener('keydown', this._onKeyDown as EventListener);

    // Отписка от событий нод
    core.eventBus.off('node:created', this._onNodeCreated);
    core.eventBus.off('node:removed', this._onNodeRemoved);
    core.eventBus.off('node:transformed', this._onNodeTransformed);
    core.eventBus.off('node:zIndexChanged', this._onZIndexChanged);
    core.eventBus.off('group:created', this._onGroupCreated);
    core.eventBus.off('group:ungrouped', this._onGroupUngrouped);

    // Отписка от Konva событий
    core.nodes.world.off('.history');
    core.nodes.layer.off('.history');

    this._core = undefined as unknown as CoreEngine;
    this._dragStartStateCache.clear();

    this._debug('detached');
  }

  // ==================== Keyboard Handlers ====================

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (!this._core) return;

    // Игнорировать, если фокус на редактируемом элементе
    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Ctrl+Z — Undo
    if (ctrl && !shift && e.code === 'KeyZ') {
      e.preventDefault();
      this._performUndo();
      return;
    }

    // Ctrl+Shift+Z — Redo
    if (ctrl && shift && e.code === 'KeyZ') {
      e.preventDefault();
      this._performRedo();
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

  // ==================== Drag/Transform Start/End ====================

  private _onDragStart = (e: Konva.KonvaEventObject<DragEvent>): void => {
    if (this._isUndoRedoInProgress) return;
    const target = e.target;
    this._debug('dragstart raw target', {
      targetName: target.name(),
      targetClassName: target.getClassName(),
      targetId: target.id(),
    });

    // Проверяем, является ли target временной группой (temp-multi-group)
    const targetName = target.name();
    if (typeof targetName === 'string' && targetName.includes('temp-multi-group')) {
      // Для временной группы сохраняем состояние всех детей и включаем batch-режим
      this._isBatchMode = true;
      this._batchBuffer = [];
      const group = target as unknown as Konva.Group;
      const children = group.getChildren();
      for (const child of children) {
        const baseNode = this._findBaseNodeByKonva(child as Konva.Node);
        if (baseNode) {
          const state = this._captureTransformState(baseNode);
          this._dragStartStateCache.set(baseNode.id, state);
          this._debug('dragstart (temp-multi child)', { nodeId: baseNode.id });
        }
      }
      return;
    }

    const baseNode = this._findBaseNodeByKonva(target);
    if (baseNode) {
      // Сохраняем состояние ДО начала drag
      const state = this._captureTransformState(baseNode);
      this._dragStartStateCache.set(baseNode.id, state);
      this._debug('dragstart', { nodeId: baseNode.id, state });
    } else {
      this._debug('dragstart - baseNode not found for target');
    }
  };

  private _onDragEnd = (_e: Konva.KonvaEventObject<DragEvent>): void => {
    // Для temp-multi-group batch будет завершён через debounce после node:transformed событий
    // Для обычных нод состояние будет использовано в _onNodeTransformed
  };

  /**
   * Завершить batch-режим и записать составное действие
   */
  private _finishBatch(): void {
    if (!this._isBatchMode || this._batchBuffer.length === 0) {
      this._isBatchMode = false;
      this._batchBuffer = [];
      return;
    }

    const batchAction: HistoryAction = {
      type: 'batch',
      nodeId: '',
      before: null,
      after: null,
      timestamp: Date.now(),
      children: [...this._batchBuffer],
    };

    this._debug('batch recorded', { childCount: this._batchBuffer.length });
    this._history.push(batchAction);
    this._trimHistoryIfNeeded();

    this._isBatchMode = false;
    this._batchBuffer = [];
  }

  private _onTransformStart = (e: Konva.KonvaEventObject<Event>): void => {
    if (this._isUndoRedoInProgress) return;
    const target = e.target;
    this._debug('transformstart raw target', {
      targetName: target.name(),
      targetClassName: target.getClassName(),
      targetId: target.id(),
    });

    // Проверяем, является ли target временной группой (temp-multi-group)
    const targetName = target.name();
    if (typeof targetName === 'string' && targetName.includes('temp-multi-group')) {
      // Для временной группы сохраняем состояние всех детей и включаем batch-режим
      this._isBatchMode = true;
      this._batchBuffer = [];
      const group = target as unknown as Konva.Group;
      const children = group.getChildren();
      for (const child of children) {
        const baseNode = this._findBaseNodeByKonva(child as Konva.Node);
        if (baseNode) {
          const state = this._captureTransformState(baseNode);
          this._dragStartStateCache.set(baseNode.id, state);
          this._debug('transformstart (temp-multi child)', { nodeId: baseNode.id });
        }
      }
      return;
    }

    const baseNode = this._findBaseNodeByKonva(target);
    if (baseNode) {
      // Сохраняем состояние ДО начала transform
      const state = this._captureTransformState(baseNode);
      this._dragStartStateCache.set(baseNode.id, state);
      this._debug('transformstart', { nodeId: baseNode.id, state });
    } else {
      this._debug('transformstart - baseNode not found for target');
    }
  };

  private _onTransformEnd = (_e: Konva.KonvaEventObject<Event>): void => {
    // Для temp-multi-group batch будет завершён через debounce после node:transformed событий
    // Для обычных нод состояние будет использовано в _onNodeTransformed
  };

  // ==================== Undo/Redo Logic ====================

  private _performUndo(): void {
    if (!this._core) return;

    const action = this._history.undo();
    if (!action) {
      this._debug('undo', 'nothing to undo');
      return;
    }

    this._isUndoRedoInProgress = true;

    try {
      this._applyActionState(action, 'before');
      this._debug('undo applied', action);
    } finally {
      this._isUndoRedoInProgress = false;
    }

    this._core.stage.batchDraw();
  }

  private _performRedo(): void {
    if (!this._core) return;

    const action = this._history.redo();
    if (!action) {
      this._debug('redo', 'nothing to redo');
      return;
    }

    this._isUndoRedoInProgress = true;

    try {
      this._applyActionState(action, 'after');
      this._debug('redo applied', action);
    } finally {
      this._isUndoRedoInProgress = false;
    }

    this._core.stage.batchDraw();
  }

  /**
   * Применить состояние из action (before или after)
   */
  private _applyActionState(action: HistoryAction, stateKey: 'before' | 'after'): void {
    if (!this._core) return;

    const state = stateKey === 'before' ? action.before : action.after;

    switch (action.type) {
      case 'create':
        if (stateKey === 'before') {
          // Undo create = удалить ноду
          const node = this._core.nodes.findById(action.nodeId);
          if (node) {
            this._core.nodes.remove(node);
          }
        } else {
          // Redo create = воссоздать ноду
          if (state) {
            this._recreateNode(state as SerializedNodeState);
          }
        }
        break;

      case 'remove':
        if (stateKey === 'before') {
          // Undo remove = воссоздать ноду
          if (state) {
            this._recreateNode(state as SerializedNodeState);
          }
        } else {
          // Redo remove = удалить ноду
          const node = this._core.nodes.findById(action.nodeId);
          if (node) {
            this._core.nodes.remove(node);
          }
        }
        break;

      case 'transform':
        // Применить состояние трансформации
        if (state && typeof state === 'object') {
          const node = this._core.nodes.findById(action.nodeId);
          this._debug('transform apply', {
            nodeId: action.nodeId,
            nodeFound: !!node,
            state,
          });
          if (node) {
            this._applyTransformState(node, state as Record<string, unknown>);
          }
        }
        break;

      case 'zIndex':
        // Применить z-index
        if (state && typeof state === 'object' && 'zIndex' in state) {
          const node = this._core.nodes.findById(action.nodeId);
          if (node) {
            const konvaNode = node.getKonvaNode() as unknown as Konva.Node;
            konvaNode.zIndex((state as { zIndex: number }).zIndex);
          }
        }
        break;

      case 'group':
        // Undo/Redo группировки
        this._applyGroupAction(action, stateKey);
        break;

      case 'ungroup':
        // Undo/Redo разгруппировки (обратная логика)
        this._applyUngroupAction(action, stateKey);
        break;

      case 'batch':
        // Batch-действие: применить все дочерние действия
        if (action.children) {
          // При undo применяем в обратном порядке
          const children = stateKey === 'before' ? [...action.children].reverse() : action.children;
          for (const child of children) {
            this._applyActionState(child, stateKey);
          }
        }
        break;

      default:
        this._debug('unknown action type', action.type);
    }
  }

  /**
   * Применить состояние трансформации к ноде
   */
  private _applyTransformState(node: BaseNode, state: Record<string, unknown>): void {
    const konvaNode = node.getKonvaNode() as unknown as Konva.Node;

    this._debug('applyTransformState', {
      nodeId: node.id,
      current: {
        x: konvaNode.x(),
        y: konvaNode.y(),
        rotation: konvaNode.rotation(),
        scaleX: konvaNode.scaleX(),
        scaleY: konvaNode.scaleY(),
      },
      target: state,
    });

    // Применяем локальные координаты (world-local)
    if (typeof state['x'] === 'number') konvaNode.x(state['x']);
    if (typeof state['y'] === 'number') konvaNode.y(state['y']);
    if (typeof state['width'] === 'number' && typeof konvaNode.width === 'function') {
      konvaNode.width(state['width']);
    }
    if (typeof state['height'] === 'number' && typeof konvaNode.height === 'function') {
      konvaNode.height(state['height']);
    }
    if (typeof state['rotation'] === 'number') konvaNode.rotation(state['rotation']);
    if (typeof state['scaleX'] === 'number') konvaNode.scaleX(state['scaleX']);
    if (typeof state['scaleY'] === 'number') konvaNode.scaleY(state['scaleY']);

    // Дополнительные атрибуты для Rect
    const anyNode = konvaNode as unknown as Record<string, unknown>;
    if (
      typeof state['cornerRadius'] === 'number' &&
      typeof anyNode['cornerRadius'] === 'function'
    ) {
      (anyNode['cornerRadius'] as (v: number) => void)(state['cornerRadius']);
    }

    // Обновляем кэш текущим состоянием (после применения)
    this._dragStartStateCache.set(node.id, this._captureTransformState(node));
  }

  /**
   * Применить действие группировки
   */
  private _applyGroupAction(action: HistoryAction, stateKey: 'before' | 'after'): void {
    if (!this._core) return;

    if (stateKey === 'before') {
      // Undo group = разгруппировать
      const group = this._core.nodes.findById(action.nodeId);
      if (group && action.before) {
        const beforeState = action.before as {
          childIds: string[];
          childStates: SerializedNodeState[];
        };
        // Удаляем группу и восстанавливаем детей в world
        this._core.nodes.remove(group);
        for (const childState of beforeState.childStates) {
          this._recreateNode(childState);
        }
      }
    } else {
      // Redo group = сгруппировать обратно
      if (action.after) {
        const afterState = action.after as SerializedNodeState;
        this._recreateNode(afterState);
      }
    }
  }

  /**
   * Применить действие разгруппировки
   */
  private _applyUngroupAction(action: HistoryAction, stateKey: 'before' | 'after'): void {
    if (!this._core) return;

    if (stateKey === 'before') {
      // Undo ungroup = восстановить группу
      if (action.before) {
        const beforeState = action.before as SerializedNodeState;
        this._recreateNode(beforeState);
      }
    } else {
      // Redo ungroup = разгруппировать снова
      const group = this._core.nodes.findById(action.nodeId);
      if (group && action.after) {
        const afterState = action.after as { childStates: SerializedNodeState[] };
        this._core.nodes.remove(group);
        for (const childState of afterState.childStates) {
          this._recreateNode(childState);
        }
      }
    }
  }

  /**
   * Воссоздать ноду по сериализованному состоянию
   */
  private _recreateNode(state: SerializedNodeState): BaseNode | null {
    if (!this._core) return null;

    const { nodeType, attrs } = state;

    // Убираем id и zIndex из attrs, чтобы не было конфликтов
    const { id: _id, zIndex: _zIndex, ...configWithoutId } = attrs;
    void _id;
    void _zIndex;

    try {
      let newNode: NodeHandle | null = null;

      switch (nodeType) {
        case 'shape':
          newNode = this._core.nodes.addShape(configWithoutId) as unknown as BaseNode;
          break;
        case 'text':
          newNode = this._core.nodes.addText(configWithoutId) as unknown as BaseNode;
          break;
        case 'circle':
          newNode = this._core.nodes.addCircle(configWithoutId) as unknown as BaseNode;
          break;
        case 'ellipse':
          newNode = this._core.nodes.addEllipse(configWithoutId) as unknown as BaseNode;
          break;
        case 'arc':
          newNode = this._core.nodes.addArc(configWithoutId) as unknown as BaseNode;
          break;
        case 'star':
          newNode = this._core.nodes.addStar(configWithoutId) as unknown as BaseNode;
          break;
        case 'arrow':
          newNode = this._core.nodes.addArrow(configWithoutId) as unknown as BaseNode;
          break;
        case 'ring':
          newNode = this._core.nodes.addRing(configWithoutId) as unknown as BaseNode;
          break;
        case 'regularPolygon':
        case 'regularpolygon':
          newNode = this._core.nodes.addRegularPolygon(configWithoutId) as unknown as BaseNode;
          break;
        case 'image':
          newNode = this._core.nodes.addImage(configWithoutId) as unknown as BaseNode;
          break;
        case 'group': {
          newNode = this._core.nodes.addGroup(configWithoutId) as unknown as BaseNode;
          // Восстанавливаем детей группы
          if (state.children && state.children.length > 0) {
            const groupKonva = newNode.getKonvaNode() as unknown as Konva.Group;
            for (const childState of state.children) {
              const childNode = this._recreateNode(childState);
              if (childNode) {
                const childKonva = childNode.getKonvaNode();
                childKonva.moveTo(groupKonva);
              }
            }
          }
          break;
        }
        default:
          this._debug('recreateNode', `unknown type: ${nodeType}`);
          return null;
      }

      // Если нода была в группе, перемещаем её обратно в группу
      if (state.parentId) {
        const parentNode = this._core.nodes.findById(state.parentId);
        if (parentNode) {
          const parentKonva = parentNode.getKonvaNode() as unknown as Konva.Group;
          const nodeKonva = newNode.getKonvaNode() as unknown as Konva.Node;
          nodeKonva.moveTo(parentKonva);
          this._debug('recreateNode - moved to parent', {
            nodeId: newNode.id,
            parentId: state.parentId,
          });
        }
      }

      this._debug('recreateNode', { nodeType, nodeId: newNode.id, parentId: state.parentId });
      return newNode as unknown as BaseNode;
    } catch (error) {
      this._debug('recreateNode error', error);
      return null;
    }
  }

  // ==================== Event Handlers ====================

  private _onNodeCreated = (node: BaseNode): void => {
    if (this._isUndoRedoInProgress) {
      this._debug('node:created skipped (undo/redo in progress)', node.id);
      return;
    }

    const state = this._serializeNode(node);

    const action: HistoryAction = {
      type: 'create',
      nodeId: node.id,
      before: null,
      after: state,
      timestamp: Date.now(),
    };

    this._history.push(action);

    // Сохраняем начальное состояние для будущих трансформаций
    this._dragStartStateCache.set(node.id, this._captureTransformState(node));

    this._trimHistoryIfNeeded();
  };

  private _onNodeRemoved = (node: BaseNode): void => {
    if (this._isUndoRedoInProgress) return;

    const state = this._serializeNode(node);

    const action: HistoryAction = {
      type: 'remove',
      nodeId: node.id,
      before: state,
      after: null,
      timestamp: Date.now(),
    };

    // В batch-режиме собираем действия в буфер
    if (this._isBatchMode) {
      this._batchBuffer.push(action);
    } else {
      this._history.push(action);
      this._trimHistoryIfNeeded();
    }
    this._dragStartStateCache.delete(node.id);
  };

  private _onNodeTransformed = (
    node: BaseNode,
    changes: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      scaleX?: number;
      scaleY?: number;
    },
  ): void => {
    if (this._isUndoRedoInProgress) {
      this._debug('node:transformed skipped (undo/redo in progress)', node.id);
      return;
    }

    // Получаем состояние ДО из кэша (сохранённое при dragstart/transformstart или создании)
    const beforeState = this._dragStartStateCache.get(node.id);

    // Используем координаты из changes (они уже world-local для temp-multi-group)
    // или захватываем текущее состояние для обычных нод
    const afterState = this._buildAfterState(node, changes);

    // Если нет before состояния, сохраняем текущее как before для следующего раза
    if (!beforeState) {
      this._debug('transform - no before state, saving current', node.id);
      this._dragStartStateCache.set(node.id, afterState);
      return;
    }

    // Проверяем, изменилось ли что-то
    if (this._statesEqual(beforeState, afterState)) {
      this._debug('transform skipped - no changes', node.id);
      return;
    }

    const action: HistoryAction = {
      type: 'transform',
      nodeId: node.id,
      before: beforeState,
      after: afterState,
      timestamp: Date.now(),
    };

    this._debug('transform recorded', {
      nodeId: node.id,
      before: beforeState,
      after: afterState,
      batchMode: this._isBatchMode,
    });

    // В batch-режиме собираем действия в буфер
    if (this._isBatchMode) {
      this._batchBuffer.push(action);
      // Автоматически завершаем batch через debounce
      this._scheduleBatchCommit();
    } else {
      this._history.push(action);
      this._trimHistoryIfNeeded();
    }

    // Обновляем кэш для следующего изменения
    this._dragStartStateCache.set(node.id, afterState);
  };

  /**
   * Запланировать завершение batch с debounce
   */
  private _scheduleBatchCommit(): void {
    if (this._batchCommitTimer !== null) {
      globalThis.clearTimeout(this._batchCommitTimer);
    }
    // Завершаем batch через 50ms после последнего события
    this._batchCommitTimer = globalThis.setTimeout(() => {
      this._batchCommitTimer = null;
      this._finishBatch();
    }, 50) as unknown as number;
  }

  private _onZIndexChanged = (node: BaseNode, oldIndex: number, newIndex: number): void => {
    if (this._isUndoRedoInProgress) return;

    const action: HistoryAction = {
      type: 'zIndex',
      nodeId: node.id,
      before: { zIndex: oldIndex },
      after: { zIndex: newIndex },
      timestamp: Date.now(),
    };

    this._history.push(action);
    this._trimHistoryIfNeeded();
  };

  private _onGroupCreated = (group: BaseNode, nodes: BaseNode[]): void => {
    if (this._isUndoRedoInProgress) return;

    // Сохраняем состояние детей ДО группировки
    const childStates = nodes.map((n) => this._serializeNode(n));
    const childIds = nodes.map((n) => n.id);

    const action: HistoryAction = {
      type: 'group',
      nodeId: group.id,
      before: { childIds, childStates },
      after: this._serializeNode(group),
      timestamp: Date.now(),
    };

    this._history.push(action);
    this._trimHistoryIfNeeded();
  };

  private _onGroupUngrouped = (group: BaseNode, nodes: BaseNode[]): void => {
    if (this._isUndoRedoInProgress) return;

    // Сохраняем состояние группы ДО разгруппировки
    const groupState = this._serializeNode(group);
    const childStates = nodes.map((n) => this._serializeNode(n));

    const action: HistoryAction = {
      type: 'ungroup',
      nodeId: group.id,
      before: groupState,
      after: { childStates },
      timestamp: Date.now(),
    };

    this._history.push(action);
    this._trimHistoryIfNeeded();
  };

  // ==================== Serialization ====================

  /**
   * Полная сериализация ноды для истории
   */
  private _serializeNode(node: BaseNode): SerializedNodeState {
    const konvaNode = node.getKonvaNode() as unknown as Konva.Node;
    const attrs = konvaNode.getAttrs();
    const nodeType = this._getNodeType(konvaNode);

    const state: SerializedNodeState = {
      nodeType,
      nodeId: node.id,
      attrs: { ...attrs },
    };

    // Сохраняем parentId если нода в группе
    const parent = konvaNode.getParent();
    if (parent && this._core) {
      const parentBase = this._findBaseNodeByKonva(parent);
      if (parentBase && parentBase.id !== node.id) {
        // Проверяем, что это не world (world не является BaseNode группой)
        const worldNode = this._core.nodes.world;
        if (parent !== worldNode) {
          state.parentId = parentBase.id;
        }
      }
    }

    // Для групп сериализуем детей
    if (nodeType === 'group') {
      const groupKonva = konvaNode as unknown as Konva.Group;
      const children = groupKonva.getChildren();
      state.children = [];

      for (const child of children) {
        const childBase = this._findBaseNodeByKonva(child as Konva.Node);
        if (childBase) {
          state.children.push(this._serializeNode(childBase));
        }
      }
    }

    return state;
  }

  /**
   * Захватить состояние трансформации (для drag/transform)
   * Использует абсолютные координаты для корректной работы с временными группами
   */
  private _captureTransformState(node: BaseNode): Record<string, unknown> {
    const konvaNode = node.getKonvaNode() as unknown as Konva.Node;

    // Используем абсолютную трансформацию для корректной работы с группами
    const absTransform = konvaNode.getAbsoluteTransform().decompose();

    const state: Record<string, unknown> = {
      // Абсолютные координаты (для сравнения)
      absX: absTransform.x,
      absY: absTransform.y,
      absRotation: absTransform.rotation,
      absScaleX: absTransform.scaleX,
      absScaleY: absTransform.scaleY,
      // Локальные координаты (для восстановления)
      x: konvaNode.x(),
      y: konvaNode.y(),
      rotation: konvaNode.rotation(),
      scaleX: konvaNode.scaleX(),
      scaleY: konvaNode.scaleY(),
    };

    if (typeof konvaNode.width === 'function') {
      state['width'] = konvaNode.width();
    }
    if (typeof konvaNode.height === 'function') {
      state['height'] = konvaNode.height();
    }

    // Дополнительные атрибуты для Rect
    const anyNode = konvaNode as unknown as Record<string, unknown>;
    if (typeof anyNode['cornerRadius'] === 'function') {
      state['cornerRadius'] = (anyNode['cornerRadius'] as () => number)();
    }

    return state;
  }

  /**
   * Построить after-состояние из changes события node:transformed
   * Использует координаты из changes (world-local для temp-multi-group)
   */
  private _buildAfterState(
    node: BaseNode,
    changes: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      scaleX?: number;
      scaleY?: number;
    },
  ): Record<string, unknown> {
    const konvaNode = node.getKonvaNode() as unknown as Konva.Node;

    // Используем координаты из changes если они есть, иначе берём текущие
    const x = changes.x ?? konvaNode.x();
    const y = changes.y ?? konvaNode.y();
    const rotation = changes.rotation ?? konvaNode.rotation();
    const scaleX = changes.scaleX ?? konvaNode.scaleX();
    const scaleY = changes.scaleY ?? konvaNode.scaleY();

    const state: Record<string, unknown> = {
      // Абсолютные координаты для сравнения (используем те же значения)
      absX: x,
      absY: y,
      absRotation: rotation,
      absScaleX: scaleX,
      absScaleY: scaleY,
      // Локальные координаты для восстановления
      x,
      y,
      rotation,
      scaleX,
      scaleY,
    };

    if (typeof konvaNode.width === 'function') {
      state['width'] = changes.width ?? konvaNode.width();
    }
    if (typeof konvaNode.height === 'function') {
      state['height'] = changes.height ?? konvaNode.height();
    }

    // Дополнительные атрибуты для Rect
    const anyNode = konvaNode as unknown as Record<string, unknown>;
    if (typeof anyNode['cornerRadius'] === 'function') {
      state['cornerRadius'] = (anyNode['cornerRadius'] as () => number)();
    }

    return state;
  }

  /**
   * Получить тип ноды из Konva className
   */
  private _getNodeType(konvaNode: Konva.Node): string {
    const className = konvaNode.getClassName();
    const typeMap: Record<string, string> = {
      Rect: 'shape',
      Circle: 'circle',
      Ellipse: 'ellipse',
      Text: 'text',
      Image: 'image',
      Group: 'group',
      Arc: 'arc',
      Star: 'star',
      Arrow: 'arrow',
      Ring: 'ring',
      RegularPolygon: 'regularPolygon',
    };
    return typeMap[className] ?? className.toLowerCase();
  }

  /**
   * Найти BaseNode по Konva.Node (ищет также по родителям)
   */
  private _findBaseNodeByKonva(konvaNode: Konva.Node): BaseNode | null {
    if (!this._core) return null;

    // Прямой поиск
    for (const node of this._core.nodes.list()) {
      if (node.getKonvaNode() === konvaNode) {
        return node;
      }
    }

    // Поиск по родителям (для случаев, когда target — внутренний элемент)
    let parent = konvaNode.getParent();
    while (parent) {
      for (const node of this._core.nodes.list()) {
        if (node.getKonvaNode() === parent) {
          return node;
        }
      }
      parent = parent.getParent();
    }

    return null;
  }

  /**
   * Сравнить два состояния на равенство
   * Использует абсолютные координаты для сравнения (absX, absY, absRotation, etc.)
   */
  private _statesEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    // Сравниваем абсолютные координаты с небольшим допуском (для float)
    const tolerance = 0.001;
    const absKeys = ['absX', 'absY', 'absRotation', 'absScaleX', 'absScaleY'];

    for (const key of absKeys) {
      const valA = a[key];
      const valB = b[key];
      if (typeof valA === 'number' && typeof valB === 'number') {
        if (Math.abs(valA - valB) > tolerance) return false;
      } else if (valA !== valB) {
        return false;
      }
    }

    // Также сравниваем width, height, cornerRadius
    const otherKeys = ['width', 'height', 'cornerRadius'];
    for (const key of otherKeys) {
      if (a[key] !== b[key]) return false;
    }

    return true;
  }

  /**
   * Обрезать историю если превышен лимит
   */
  private _trimHistoryIfNeeded(): void {
    if (this._options.maxHistoryLength <= 0) return;

    while (this._history.length > this._options.maxHistoryLength) {
      this._history.pop(0);
      break;
    }
  }

  // ==================== Debug ====================

  private _debug(_method: string, _data?: unknown): void {
    // globalThis.console.log(`[HistoryPlugin] ${_method}`, _data ?? '');
  }
}
