/**
 * ThrottleHelper - utility for throttling (limiting the frequency of calls)
 *
 * Used to limit the frequency of operation execution to a certain number of times per second.
 * For example, to limit UI updates to 60 FPS (16ms) or 30 FPS (32ms).
 *
 * @example
 * ```typescript
 * private _throttle = new ThrottleHelper(16); // 60 FPS
 *
 * onMouseMove() {
 *   if (!this._throttle.shouldExecute()) return;
 *   // Execute expensive operation
 * }
 * ```
 */
export class ThrottleHelper {
  private _lastTime = 0;
  private _throttle: number;

  /**
   * @param throttleMs - minimum interval between calls in milliseconds
   */
  constructor(throttleMs = 16) {
    this._throttle = throttleMs;
  }

  /**
   * Checks if the operation can be executed
   * @returns true if enough time has passed since the last call
   */
  public shouldExecute(): boolean {
    const now = Date.now();
    if (now - this._lastTime < this._throttle) {
      return false;
    }
    this._lastTime = now;
    return true;
  }

  /**
   * Resets the timer (the next call will be executed immediately)
   */
  public reset(): void {
    this._lastTime = 0;
  }

  /**
   * Changes the throttling interval
   */
  public setThrottle(throttleMs: number): void {
    this._throttle = throttleMs;
  }

  /**
   * Returns the current throttling interval
   */
  public getThrottle(): number {
    return this._throttle;
  }
}
