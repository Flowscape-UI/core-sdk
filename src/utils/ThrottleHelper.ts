/**
 * ThrottleHelper - утилита для throttling (ограничения частоты вызовов)
 *
 * Используется для ограничения частоты выполнения операций до определённого количества раз в секунду.
 * Например, для ограничения обновлений UI до 60 FPS (16ms) или 30 FPS (32ms).
 *
 * @example
 * ```typescript
 * private _throttle = new ThrottleHelper(16); // 60 FPS
 *
 * onMouseMove() {
 *   if (!this._throttle.shouldExecute()) return;
 *   // Выполняем дорогую операцию
 * }
 * ```
 */
export class ThrottleHelper {
  private _lastTime = 0;
  private _throttle: number;

  /**
   * @param throttleMs - минимальный интервал между вызовами в миллисекундах
   */
  constructor(throttleMs = 16) {
    this._throttle = throttleMs;
  }

  /**
   * Проверяет, можно ли выполнить операцию
   * @returns true если прошло достаточно времени с последнего вызова
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
   * Сбрасывает таймер (следующий вызов будет выполнен немедленно)
   */
  public reset(): void {
    this._lastTime = 0;
  }

  /**
   * Изменяет интервал throttling
   */
  public setThrottle(throttleMs: number): void {
    this._throttle = throttleMs;
  }

  /**
   * Возвращает текущий интервал throttling
   */
  public getThrottle(): number {
    return this._throttle;
  }
}
