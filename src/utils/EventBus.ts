type EventCallback = (...args: unknown[]) => void;

export class EventBus {
  private _listeners: Map<string, EventCallback[]>;

  constructor() {
    this._listeners = new Map<string, EventCallback[]>();
  }

  public on(event: string, callback: EventCallback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)?.push(callback);
  }

  public off(event: string, callback: EventCallback) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      this._listeners.set(
        event,
        handlers.filter((cb) => cb !== callback),
      );
    }
  }

  public emit(event: string, ...args: unknown[]) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      handlers.forEach((cb) => {
        cb(...args);
      });
    }
  }
}
