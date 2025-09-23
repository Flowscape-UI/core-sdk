import type { CoreEngine } from '../core/CoreEngine';

import type { Plugin } from './Plugin';

export class Plugins {
  private _core: CoreEngine;
  private _items: Plugin[] = [];

  constructor(core: CoreEngine, initial: Plugin[] = []) {
    this._core = core;
    if (initial.length) this.addPlugins(initial);
  }

  public addPlugins(plugins: Plugin[]): Plugin[] {
    const added: Plugin[] = [];
    for (const plugin of plugins) {
      if (this._items.includes(plugin)) continue;
      this._items.push(plugin);
      plugin.attach(this._core);
      added.push(plugin);
    }
    return added;
  }

  public removePlugins(plugins: Plugin[]): Plugin[] {
    const removed: Plugin[] = [];
    for (const plugin of plugins) {
      const idx = this._items.indexOf(plugin);
      if (idx === -1) continue;
      plugin.detach(this._core);
      this._items.splice(idx, 1);
      removed.push(plugin);
    }
    return removed;
  }

  public removeAllPlugins(): Plugin[] {
    const removed = [...this._items];
    for (const plugin of removed) plugin.detach(this._core);
    this._items = [];
    return removed;
  }

  public list(): Plugin[] {
    return [...this._items];
  }
}
