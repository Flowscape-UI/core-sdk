/**
 * DebounceHelper - utility for debouncing (delayed execution)
 *
 * Used to group multiple calls into one through requestAnimationFrame.
 * Useful for optimizing UI updates - instead of updating on every event,
 * we update once in the next frame.
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
   * Schedules execution of callback in the next frame
   * If already scheduled - ignores repeated calls
   *
   * @param callback - function to execute
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
   * Checks if execution is scheduled
   */
  public isScheduled(): boolean {
    return this._scheduled;
  }

  /**
   * Cancels scheduled execution
   * Note: does not cancel already scheduled requestAnimationFrame,
   * but prevents callback execution
   */
  public cancel(): void {
    this._scheduled = false;
  }
}
