import type { CoreEngine } from '../core/CoreEngine';
import type { Plugin } from '../plugins/Plugin';

import type { PluginAddon } from './PluginAddon';

/**
 * Addon manager for a specific plugin.
 * Allows adding/removing addons with a convenient API:
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

  /** Internal helper: called from Plugin.attach */
  _attachAll(core: CoreEngine): void {
    this._core = core;
    this._addons.forEach((addon) => {
      addon.attach(this._plugin, core);
    });
  }

  /** Internal helper: called from Plugin.detach */
  _detachAll(core: CoreEngine): void {
    this._addons.forEach((addon) => {
      addon.detach(this._plugin, core);
    });
    this._core = undefined;
  }

  /** Attach one or more addons to the plugin */
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

  /** Detach one or more addons from the plugin */
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

  /** All attached addons (array copy) */
  public list(): PluginAddon<TPlugin>[] {
    return Array.from(this._addons);
  }

  /** Check if a specific addon is attached */
  public has(addon: PluginAddon<TPlugin>): boolean {
    return this._addons.has(addon);
  }

  /** Detach and clear all addons (used when removing the plugin) */
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
