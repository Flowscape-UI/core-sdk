import type { CoreEngine } from '../core/CoreEngine';
import type { Plugin } from '../plugins/Plugin';

/**
 * Base class for a plugin addon.
 *
 * Usage:
 *   class MyPluginAddon extends PluginAddon<MyPlugin> {
 *     protected onAttach(plugin: MyPlugin, core: CoreEngine) { ... }
 *     protected onDetach(plugin: MyPlugin, core: CoreEngine) { ... }
 *   }
 */
export abstract class PluginAddon<TPlugin extends Plugin = Plugin> {
  protected abstract onAttach(plugin: TPlugin, core: CoreEngine): void;
  protected abstract onDetach(plugin: TPlugin, core: CoreEngine): void;

  /** Internal helper: called by the plugin's addon manager */
  attach(plugin: TPlugin, core: CoreEngine): void {
    this.onAttach(plugin, core);
  }

  /** Internal helper: called by the plugin's addon manager */
  detach(plugin: TPlugin, core: CoreEngine): void {
    this.onDetach(plugin, core);
  }
}
