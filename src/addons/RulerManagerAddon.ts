import type { CoreEngine } from '../core/CoreEngine';
import type { RulerManagerPluginOptions } from '../plugins/RulerManagerPlugin';
import { RulerManagerPlugin } from '../plugins/RulerManagerPlugin';
import type { RulerPlugin } from '../plugins/RulerPlugin';

import { PluginAddon } from './PluginAddon';

/**
 * Аддон для RulerPlugin, который подключает RulerManagerPlugin.
 */
export class RulerManagerAddon extends PluginAddon<RulerPlugin> {
  private readonly _options: RulerManagerPluginOptions;
  private _instance?: RulerManagerPlugin;
  private _owned = false;

  constructor(options: RulerManagerPluginOptions = {}) {
    super();
    this._options = options;
  }

  protected onAttach(_plugin: RulerPlugin, core: CoreEngine): void {
    if (this._instance) return;

    const existing = core.plugins
      .list()
      .find((p): p is RulerManagerPlugin => p instanceof RulerManagerPlugin);

    if (existing) {
      this._instance = existing;
      this._owned = false;
      return;
    }

    const manager = new RulerManagerPlugin(this._options);
    core.plugins.addPlugins([manager]);
    this._instance = manager;
    this._owned = true;
  }

  protected onDetach(_plugin: RulerPlugin, core: CoreEngine): void {
    if (!this._instance) return;

    if (this._owned) {
      core.plugins.removePlugins([this._instance]);
    }

    this._instance = undefined;
    this._owned = false;
  }
}
