import type { CoreEngine } from '../core/CoreEngine';
import type { Plugin } from '../plugins/Plugin';

/**
 * Базовый класс аддона для конкретного плагина.
 *
 * Использование:
 *   class MyPluginAddon extends PluginAddon<MyPlugin> {
 *     protected onAttach(plugin: MyPlugin, core: CoreEngine) { ... }
 *     protected onDetach(plugin: MyPlugin, core: CoreEngine) { ... }
 *   }
 */
export abstract class PluginAddon<TPlugin extends Plugin = Plugin> {
  protected abstract onAttach(plugin: TPlugin, core: CoreEngine): void;
  protected abstract onDetach(plugin: TPlugin, core: CoreEngine): void;

  /** Внутренний хелпер: вызывается менеджером аддонов плагина */
  attach(plugin: TPlugin, core: CoreEngine): void {
    this.onAttach(plugin, core);
  }

  /** Внутренний хелпер: вызывается менеджером аддонов плагина */
  detach(plugin: TPlugin, core: CoreEngine): void {
    this.onDetach(plugin, core);
  }
}
