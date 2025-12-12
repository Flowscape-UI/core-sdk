import type { CoreEngine } from '../core/CoreEngine';
import type { RulerGuidesPluginOptions } from '../plugins/RulerGuidesPlugin';
import { RulerGuidesPlugin } from '../plugins/RulerGuidesPlugin';
import type { RulerPlugin } from '../plugins/RulerPlugin';

import { PluginAddon } from './PluginAddon';

/**
 * Аддон для RulerPlugin, который подключает RulerGuidesPlugin.
 */
export class RulerGuidesAddon extends PluginAddon<RulerPlugin> {
  private readonly _options: RulerGuidesPluginOptions;
  private _instance: RulerGuidesPlugin | null = null;
  private _owned = false;

  constructor(options: RulerGuidesPluginOptions = {}) {
    super();
    this._options = options;
  }

  protected onAttach(_plugin: RulerPlugin, core: CoreEngine): void {
    if (this._instance) return;

    // Попробуем переиспользовать уже существующий плагин, если он есть
    const existing = core.plugins
      .list()
      .find((p): p is RulerGuidesPlugin => p instanceof RulerGuidesPlugin);

    if (existing) {
      this._instance = existing;
      this._owned = false;
      return;
    }

    const guides = new RulerGuidesPlugin(this._options);
    core.plugins.addPlugins([guides]);
    this._instance = guides;
    this._owned = true;
  }

  protected onDetach(_plugin: RulerPlugin, core: CoreEngine): void {
    if (!this._instance) return;

    if (this._owned) {
      core.plugins.removePlugins([this._instance]);
    }

    this._instance = null;
    this._owned = false;
  }
}
