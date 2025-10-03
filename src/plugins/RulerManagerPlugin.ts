import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface RulerManagerPluginOptions {
  enabled?: boolean; // is manager enabled on start
}

/**
 * RulerManagerPlugin
 * Manages visibility of ruler and guides on Shift+R
 */
export class RulerManagerPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerManagerPluginOptions>;
  private _visible = true; // current visibility state

  constructor(options: RulerManagerPluginOptions = {}) {
    super();
    const { enabled = true } = options;
    this._options = {
      enabled,
    };
  }

  protected onAttach(core: CoreEngine): void {
    if (!this._options.enabled) return;

    this._core = core;

    // Subscribe to keyboard events
    this._bindKeyboardEvents();
  }

  protected onDetach(_core: CoreEngine): void {
    // Unsubscribe from keyboard events
    this._unbindKeyboardEvents();
  }

  /**
   * Bind keyboard events
   */
  private _bindKeyboardEvents(): void {
    globalThis.addEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Unbind keyboard events
   */
  private _unbindKeyboardEvents(): void {
    globalThis.removeEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Keyboard event handler
   */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    // Check Shift+R (any layout, any case)
    // R on English and К on Russian layout
    if (e.shiftKey && (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К')) {
      e.preventDefault();
      this.toggle();
      return;
    }

    // Check Delete or Backspace for removing active guide
    // Use e.code for layout independence
    if (e.code === 'Delete' || e.code === 'Backspace') {
      const deleted = this.deleteActiveGuide();
      if (deleted) {
        e.preventDefault();
      }
    }
  };

  /**
   * Toggle visibility of ruler and guides
   */
  public toggle(): void {
    if (this._visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show ruler and guides
   */
  public show(): void {
    if (!this._core) return;

    this._visible = true;

    // Show ruler-layer (RulerPlugin and RulerHighlightPlugin)
    const rulerLayer = this._core.stage.findOne('.ruler-layer');
    if (rulerLayer && !rulerLayer.isVisible()) {
      rulerLayer.show();
    }

    // Show guides-layer (RulerGuidesPlugin)
    const guidesLayer = this._core.stage.findOne('.guides-layer');
    if (guidesLayer && !guidesLayer.isVisible()) {
      guidesLayer.show();
    }

    this._core.stage.batchDraw();
  }

  /**
   * Hide ruler and guides
   */
  public hide(): void {
    if (!this._core) return;

    this._visible = false;

    // Hide ruler-layer (RulerPlugin and RulerHighlightPlugin)
    const rulerLayer = this._core.stage.findOne('.ruler-layer');
    if (rulerLayer?.isVisible()) {
      rulerLayer.hide();
    }

    // Hide guides-layer (RulerGuidesPlugin)
    const guidesLayer = this._core.stage.findOne('.guides-layer');
    if (guidesLayer?.isVisible()) {
      guidesLayer.hide();
    }

    this._core.stage.batchDraw();
  }

  /**
   * Check if ruler is visible
   */
  public isVisible(): boolean {
    return this._visible;
  }

  /**
   * Remove active guide line
   * @returns true if guide was removed, false if no active guide
   */
  public deleteActiveGuide(): boolean {
    if (!this._core) return false;

    // Find RulerGuidesPlugin using get method
    const guidesPlugin = this._core.plugins.get('RulerGuidesPlugin');
    if (!guidesPlugin) return false;

    // Check for method existence using duck typing
    if ('getActiveGuide' in guidesPlugin && 'removeActiveGuide' in guidesPlugin) {
      // Check if there is an active guide
      const getActiveGuide = guidesPlugin.getActiveGuide as () => unknown;
      const activeGuide = getActiveGuide.call(guidesPlugin);

      if (!activeGuide) return false;

      // Remove active guide
      const removeActiveGuide = guidesPlugin.removeActiveGuide as () => void;
      removeActiveGuide.call(guidesPlugin);

      return true;
    }

    return false;
  }
}
