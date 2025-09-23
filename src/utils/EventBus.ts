// Универсальный тип слушателя для набора аргументов
type Listener<TArgs extends unknown[]> = (...args: TArgs) => void;

export class EventBus<
  TEvents extends { [K in keyof TEvents]: unknown[] } = Record<string, unknown[]>,
> {
  private _listeners: Map<keyof TEvents & string, Listener<TEvents[keyof TEvents & string]>[]>;

  constructor() {
    this._listeners = new Map();
  }

  // Доступ к внутренней карте слушателей (debug/инспекция)
  public get listeners(): Map<string, Listener<TEvents[keyof TEvents & string]>[]> {
    return this._listeners as unknown as Map<string, Listener<TEvents[keyof TEvents & string]>[]>;
  }

  public on<K extends keyof TEvents & string>(event: K, callback: Listener<TEvents[K]>): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    (this._listeners.get(event) as Listener<TEvents[K]>[]).push(callback);
  }

  public off<K extends keyof TEvents & string>(event: K, callback: Listener<TEvents[K]>): void {
    const handlers = this._listeners.get(event);
    if (handlers) {
      this._listeners.set(
        event,
        handlers.filter((cb) => cb !== (callback as unknown)),
      );
    }
  }

  public once<K extends keyof TEvents & string>(event: K, callback: Listener<TEvents[K]>): void {
    const wrapper: Listener<TEvents[K]> = ((...args: TEvents[K]) => {
      this.off(event, wrapper);
      callback(...args);
    }) as Listener<TEvents[K]>;
    this.on(event, wrapper);
  }

  public emit<K extends keyof TEvents & string>(event: K, ...args: TEvents[K]): void {
    const handlers = this._listeners.get(event) as Listener<TEvents[K]>[] | undefined;
    if (handlers) {
      // Клонируем массив на случай модификаций во время обхода
      [...handlers].forEach((cb) => {
        cb(...args);
      });
    }
  }
}
