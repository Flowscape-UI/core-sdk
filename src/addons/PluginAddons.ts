import type { CoreEngine } from '../core/CoreEngine';
import type { Plugin } from '../plugins/Plugin';

import type { PluginAddon } from './PluginAddon';

/**
 * Менеджер аддонов для конкретного плагина.
 * Позволяет добавлять/удалять аддоны удобным API:
 *   plugin.addons.add(addon)
 *   plugin.addons.add([a, b])
 *   plugin.addons.remove(addon)
 *   plugin.addons.list()
 */
export class PluginAddons<TPlugin extends Plugin = Plugin> {
  private readonly _plugin: TPlugin;
  private readonly _addons = new Set<PluginAddon<TPlugin>>();
  private _core: CoreEngine | undefined;

  constructor(plugin: TPlugin) {
    this._plugin = plugin;
  }

  /** Внутренний хелпер: вызывается из Plugin.attach */
  _attachAll(core: CoreEngine): void {
    this._core = core;
    this._addons.forEach((addon) => {
      addon.attach(this._plugin, core);
    });
  }

  /** Внутренний хелпер: вызывается из Plugin.detach */
  _detachAll(core: CoreEngine): void {
    this._addons.forEach((addon) => {
      addon.detach(this._plugin, core);
    });
    this._core = undefined;
  }

  /** Подключить один или несколько аддонов к плагину */
  public add(addons: PluginAddon<TPlugin> | PluginAddon<TPlugin>[]): TPlugin {
    const list = Array.isArray(addons) ? addons : [addons];
    for (const addon of list) {
      if (this._addons.has(addon)) continue;
      this._addons.add(addon);
      if (this._core) {
        addon.attach(this._plugin, this._core);
      }
    }
    return this._plugin;
  }

  /** Отключить один или несколько аддонов от плагина */
  public remove(addons: PluginAddon<TPlugin> | PluginAddon<TPlugin>[]): TPlugin {
    const list = Array.isArray(addons) ? addons : [addons];
    for (const addon of list) {
      if (!this._addons.has(addon)) continue;
      this._addons.delete(addon);
      if (this._core) {
        addon.detach(this._plugin, this._core);
      }
    }
    return this._plugin;
  }

  /** Все подключённые аддоны (копия массива) */
  public list(): PluginAddon<TPlugin>[] {
    return Array.from(this._addons);
  }

  /** Проверить, подключён ли конкретный аддон */
  public has(addon: PluginAddon<TPlugin>): boolean {
    return this._addons.has(addon);
  }

  /** Отключить и очистить все аддоны (используется при удалении плагина) */
  public clear(): void {
    if (this._core) {
      const core = this._core;
      this._addons.forEach((addon) => {
        addon.detach(this._plugin, core);
      });
    }
    this._addons.clear();
  }
}
