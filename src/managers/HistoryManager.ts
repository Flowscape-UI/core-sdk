/**
 * HistoryAction — описание одного действия в истории
 *
 * Типы действий:
 * - 'create' — создание ноды (before: null, after: SerializedNodeState)
 * - 'remove' — удаление ноды (before: SerializedNodeState, after: null)
 * - 'transform' — трансформация (before/after: TransformState)
 * - 'zIndex' — изменение z-index (before/after: { zIndex: number })
 * - 'group' — группировка (before: { childIds, childStates }, after: SerializedNodeState)
 * - 'ungroup' — разгруппировка (before: SerializedNodeState, after: { childStates })
 * - 'batch' — составное действие (children: HistoryAction[])
 */
export interface HistoryAction {
  /** Тип действия: 'create', 'remove', 'transform', 'zIndex', 'group', 'ungroup', 'batch' */
  type: string;
  /** ID ноды, к которой относится действие (для batch — пустая строка) */
  nodeId: string;
  /** Состояние ДО действия (null для create, для batch — не используется) */
  before: unknown;
  /** Состояние ПОСЛЕ действия (null для remove, для batch — не используется) */
  after: unknown;
  /** Временная метка действия */
  timestamp: number;
  /** Дочерние действия для batch */
  children?: HistoryAction[];
}

/**
 * HistoryManager — менеджер истории действий для Undo/Redo
 *
 * Логика работы:
 * - push(action) добавляет действие в историю
 * - Если currentIndex < length-1, сначала удаляются действия после currentIndex
 * - select(index) переключает текущий индекс без удаления истории
 * - undo() возвращает текущее действие и сдвигает индекс назад
 * - redo() сдвигает индекс вперёд и возвращает действие
 */
export class HistoryManager {
  private _actions: HistoryAction[] = [];
  private _currentIndex = -1;

  /**
   * Добавить действие в историю.
   * Если currentIndex < length-1, сначала удаляет действия после currentIndex.
   */
  public push(action: HistoryAction): void {
    // Если мы не на последнем действии, удаляем "будущее"
    if (this._currentIndex < this._actions.length - 1) {
      this.pop(this._currentIndex + 1);
    }

    this._actions.push(action);
    this._currentIndex = this._actions.length - 1;

    this._debug('push', action);
  }

  /**
   * Удалить действия от fromIndex до конца массива.
   */
  public pop(fromIndex: number): void {
    if (fromIndex < 0 || fromIndex > this._actions.length) return;

    const removed = this._actions.splice(fromIndex);
    this._currentIndex = Math.min(this._currentIndex, this._actions.length - 1);

    this._debug('pop', { fromIndex, removedCount: removed.length });
  }

  /**
   * Переключить текущий индекс (для навигации по истории).
   * Не удаляет действия из истории.
   */
  public select(index: number): void {
    if (index < -1 || index >= this._actions.length) return;

    const oldIndex = this._currentIndex;
    this._currentIndex = index;

    this._debug('select', { oldIndex, newIndex: index });
  }

  /**
   * Получить текущий индекс в истории.
   * -1 означает, что мы "до" первого действия (пустое состояние).
   */
  public getCurrentIndex(): number {
    return this._currentIndex;
  }

  /**
   * Количество действий в истории.
   */
  public get length(): number {
    return this._actions.length;
  }

  /**
   * Получить копию массива всех действий.
   */
  public getActions(): HistoryAction[] {
    return [...this._actions];
  }

  /**
   * Можно ли выполнить undo (есть ли действия для отката).
   */
  public canUndo(): boolean {
    return this._currentIndex >= 0;
  }

  /**
   * Можно ли выполнить redo (есть ли действия для повтора).
   */
  public canRedo(): boolean {
    return this._currentIndex < this._actions.length - 1;
  }

  /**
   * Выполнить undo: вернуть текущее действие и сдвинуть индекс назад.
   * Возвращает действие, которое нужно откатить (применить before).
   */
  public undo(): HistoryAction | null {
    if (!this.canUndo()) {
      this._debug('undo', 'cannot undo - at beginning');
      return null;
    }

    const action = this._actions[this._currentIndex];
    this._currentIndex--;

    this._debug('undo', { action, newIndex: this._currentIndex });

    return action ?? null;
  }

  /**
   * Выполнить redo: сдвинуть индекс вперёд и вернуть действие.
   * Возвращает действие, которое нужно повторить (применить after).
   */
  public redo(): HistoryAction | null {
    if (!this.canRedo()) {
      this._debug('redo', 'cannot redo - at end');
      return null;
    }

    this._currentIndex++;
    const action = this._actions[this._currentIndex];

    this._debug('redo', { action, newIndex: this._currentIndex });

    return action ?? null;
  }

  /**
   * Очистить всю историю.
   */
  public clear(): void {
    this._actions = [];
    this._currentIndex = -1;

    this._debug('clear', 'history cleared');
  }

  /**
   * Получить действие по индексу (без изменения currentIndex).
   */
  public getAction(index: number): HistoryAction | null {
    if (index < 0 || index >= this._actions.length) return null;
    return this._actions[index] ?? null;
  }

  /**
   * Отладочный вывод состояния истории.
   */
  private _debug(method: string, data: unknown): void {
    globalThis.console.log(
      `[HistoryManager] ${method}`,
      data,
      `| index: ${String(this._currentIndex)}/${String(this._actions.length - 1)}`,
    );
  }
}
