import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';

export interface MultiGroupControllerDeps {
  ensureTempMulti: (nodes: BaseNode[]) => void;
  destroyTempMulti: () => void;
  commitTempMultiToGroup: () => void;
  isActive: () => boolean;
  forceUpdate: () => void;
  onWorldChanged?: () => void;
  // true, если target принадлежит временной группе в текущем состоянии
  isInsideTempByTarget?: (target: Konva.Node) => boolean;
}

/**
 * MultiGroupController — тонкий контроллер, инкапсулирующий работу с временной мульти‑группой.
 * Фактическая логика живёт в переданных зависимостях (SelectionPlugin),
 * благодаря чему мы не дублируем код рамки/оверлеев и поведения.
 */
export class MultiGroupController {
  private core: CoreEngine;
  private deps: MultiGroupControllerDeps;

  constructor(core: CoreEngine, deps: MultiGroupControllerDeps) {
    this.core = core;
    this.deps = deps;
  }

  public ensure(nodes: BaseNode[]) {
    this.deps.ensureTempMulti(nodes);
  }

  public destroy() {
    this.deps.destroyTempMulti();
  }

  public commitToPermanentGroup() {
    this.deps.commitTempMultiToGroup();
  }

  public isActive(): boolean {
    return this.deps.isActive();
  }

  public forceUpdateOverlays() {
    this.deps.forceUpdate();
  }

  public onWorldChanged() {
    if (this.deps.onWorldChanged) this.deps.onWorldChanged();
    else this.deps.forceUpdate();
  }

  public isInsideTempByTarget(target: Konva.Node): boolean {
    if (this.deps.isInsideTempByTarget) return this.deps.isInsideTempByTarget(target);
    return false;
  }
}
