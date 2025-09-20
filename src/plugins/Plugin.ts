import type { Scene } from '../Scene';
import type { Camera } from '../Camera';

export abstract class Plugin {
  public abstract onAttach(scene: Scene | Camera): void;
  public abstract onDetach(scene: Scene | Camera): void;
}
