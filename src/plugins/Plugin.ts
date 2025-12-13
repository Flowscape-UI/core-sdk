import { PluginAddons } from '../addons/PluginAddons';
import type { CoreEngine } from '../core/CoreEngine';

export abstract class Plugin {
  /** Local addons attached to this plugin */
  public readonly addons: PluginAddons<this>;

  constructor() {
    this.addons = new PluginAddons<this>(this);
  }

  protected abstract onAttach(core: CoreEngine): void;
  protected abstract onDetach(core: CoreEngine): void;

  public attach(core: CoreEngine): void {
    this.onAttach(core);
    this.addons._attachAll(core);
  }

  public detach(core: CoreEngine): void {
    this.addons._detachAll(core);
    this.onDetach(core);
  }
}
