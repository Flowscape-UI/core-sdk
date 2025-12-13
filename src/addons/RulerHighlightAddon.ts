import type { CoreEngine } from '../core/CoreEngine';
import type { RulerHighlightPluginOptions } from '../plugins/RulerHighlightPlugin';
import { RulerHighlightPlugin } from '../plugins/RulerHighlightPlugin';
import type { RulerPlugin } from '../plugins/RulerPlugin';

import { PluginAddon } from './PluginAddon';

/**
 * Addon for RulerPlugin, set up by RulerHighlightPlugin.
 */
export class RulerHighlightAddon extends PluginAddon<RulerPlugin> {
  private readonly _options: RulerHighlightPluginOptions;
  private _instance: RulerHighlightPlugin | null = null;
  private _owned = false;

  constructor(options: RulerHighlightPluginOptions = {}) {
    super();
    this._options = options;
  }

  protected onAttach(_plugin: RulerPlugin, core: CoreEngine): void {
    if (this._instance) return;

    const existing = core.plugins
      .list()
      .find((p): p is RulerHighlightPlugin => p instanceof RulerHighlightPlugin);

    if (existing) {
      this._instance = existing;
      this._owned = false;
      return;
    }

    const highlight = new RulerHighlightPlugin(this._options);
    core.plugins.addPlugins([highlight]);
    this._instance = highlight;
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
