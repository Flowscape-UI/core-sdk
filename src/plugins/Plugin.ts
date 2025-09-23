import type { CoreEngine } from '../core/CoreEngine';

export abstract class Plugin {
  protected abstract onAttach(core: CoreEngine): void;
  protected abstract onDetach(core: CoreEngine): void;

  public attach(core: CoreEngine): void {
    this.onAttach(core);
  }

  public detach(core: CoreEngine): void {
    this.onDetach(core);
  }
}
