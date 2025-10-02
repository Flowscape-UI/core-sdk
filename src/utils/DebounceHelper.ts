/**
 * DebounceHelper - утилита для debouncing (отложенного выполнения)
 *
 * Используется для группировки множественных вызовов в один через requestAnimationFrame.
 * Полезно для оптимизации обновлений UI - вместо обновления на каждое событие,
 * обновляем один раз в следующем фрейме.
 *
 * @example
 * ```typescript
 * private _debounce = new DebounceHelper();
 *
 * onTransform() {
 *   this._debounce.schedule(() => {
 *     this._updateUI();
 *   });
 * }
 * ```
 */
export class DebounceHelper {
  private _scheduled = false;

  /**
   * Планирует выполнение callback в следующем фрейме
   * Если уже запланировано - игнорирует повторные вызовы
   *
   * @param callback - функция для выполнения
   */
  public schedule(callback: () => void): void {
    if (this._scheduled) return;

    this._scheduled = true;

    globalThis.requestAnimationFrame(() => {
      this._scheduled = false;
      callback();
    });
  }

  /**
   * Проверяет, запланировано ли выполнение
   */
  public isScheduled(): boolean {
    return this._scheduled;
  }

  /**
   * Отменяет запланированное выполнение
   * Примечание: не отменяет уже запущенный requestAnimationFrame,
   * но предотвратит выполнение callback
   */
  public cancel(): void {
    this._scheduled = false;
  }
}
