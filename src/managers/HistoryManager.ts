/**
 * HistoryAction — description of a single action in history
 *
 * Action types:
 * - 'create' — node creation (before: null, after: SerializedNodeState)
 * - 'remove' — node removal (before: SerializedNodeState, after: null)
 * - 'transform' — transformation (before/after: TransformState)
 * - 'zIndex' — z-index change (before/after: { zIndex: number })
 * - 'group' — grouping (before: { childIds, childStates }, after: SerializedNodeState)
 * - 'ungroup' — ungrouping (before: SerializedNodeState, after: { childStates })
 * - 'batch' — composite action (children: HistoryAction[])
 */
export interface HistoryAction {
  /** Action type: 'create', 'remove', 'transform', 'zIndex', 'group', 'ungroup', 'batch' */
  type: string;
  /** ID of the node this action relates to (empty string for batch) */
  nodeId: string;
  /** State BEFORE the action (null for create, not used for batch) */
  before: unknown;
  /** State AFTER the action (null for remove, not used for batch) */
  after: unknown;
  /** Action timestamp */
  timestamp: number;
  /** Child actions for batch */
  children?: HistoryAction[];
}

/**
 * HistoryManager — action history manager for Undo/Redo
 *
 * Logic:
 * - push(action) adds an action to history
 * - If currentIndex < length-1, actions after currentIndex are removed first
 * - select(index) switches current index without removing history
 * - undo() returns current action and moves index backward
 * - redo() moves index forward and returns the action
 */
export class HistoryManager {
  private _actions: HistoryAction[] = [];
  private _currentIndex = -1;

  /**
   * Add an action to history.
   * If currentIndex < length-1, removes actions after currentIndex first.
   */
  public push(action: HistoryAction): void {
    // If we're not at the last action, remove the "future"
    if (this._currentIndex < this._actions.length - 1) {
      this.pop(this._currentIndex + 1);
    }

    this._actions.push(action);
    this._currentIndex = this._actions.length - 1;

    this._debug('push', action);
  }

  /**
   * Remove actions from fromIndex to the end of the array.
   */
  public pop(fromIndex: number): void {
    if (fromIndex < 0 || fromIndex > this._actions.length) return;

    const removed = this._actions.splice(fromIndex);
    this._currentIndex = Math.min(this._currentIndex, this._actions.length - 1);

    this._debug('pop', { fromIndex, removedCount: removed.length });
  }

  /**
   * Switch current index (for history navigation).
   * Does not remove actions from history.
   */
  public select(index: number): void {
    if (index < -1 || index >= this._actions.length) return;

    const oldIndex = this._currentIndex;
    this._currentIndex = index;

    this._debug('select', { oldIndex, newIndex: index });
  }

  /**
   * Get current index in history.
   * -1 means we are "before" the first action (empty state).
   */
  public getCurrentIndex(): number {
    return this._currentIndex;
  }

  /**
   * Number of actions in history.
   */
  public get length(): number {
    return this._actions.length;
  }

  /**
   * Get a copy of all actions array.
   */
  public getActions(): HistoryAction[] {
    return [...this._actions];
  }

  /**
   * Can undo be performed (are there actions to roll back).
   */
  public canUndo(): boolean {
    return this._currentIndex >= 0;
  }

  /**
   * Can redo be performed (are there actions to repeat).
   */
  public canRedo(): boolean {
    return this._currentIndex < this._actions.length - 1;
  }

  /**
   * Perform undo: return current action and move index backward.
   * Returns the action to roll back (apply before).
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
   * Perform redo: move index forward and return the action.
   * Returns the action to repeat (apply after).
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
   * Clear all history.
   */
  public clear(): void {
    this._actions = [];
    this._currentIndex = -1;

    this._debug('clear', 'history cleared');
  }

  /**
   * Get action by index (without changing currentIndex).
   */
  public getAction(index: number): HistoryAction | null {
    if (index < 0 || index >= this._actions.length) return null;
    return this._actions[index] ?? null;
  }

  /**
   * Debug output of history state.
   */
  private _debug(_method: string, _data: unknown): void {
    // globalThis.console.log(
    //   `[HistoryManager] ${_method}`,
    //   _data,
    //   `| index: ${String(this._currentIndex)}/${String(this._actions.length - 1)}`,
    // );
  }
}
