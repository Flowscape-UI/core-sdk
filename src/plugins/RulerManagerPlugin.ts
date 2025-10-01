import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

export interface RulerManagerPluginOptions {
  enabled?: boolean; // включен ли менеджер при старте
}

/**
 * RulerManagerPlugin
 * Управляет видимостью линейки и направляющих по нажатию Shift+R
 */
export class RulerManagerPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerManagerPluginOptions>;
  private _visible = true; // текущее состояние видимости

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

    // Подписываемся на события клавиатуры
    this._bindKeyboardEvents();
  }

  protected onDetach(core: CoreEngine): void {
    // Отписываемся от событий
    this._unbindKeyboardEvents();
  }

  /**
   * Привязка событий клавиатуры
   */
  private _bindKeyboardEvents(): void {
    window.addEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Отвязка событий клавиатуры
   */
  private _unbindKeyboardEvents(): void {
    window.removeEventListener('keydown', this._handleKeyDown);
  }

  /**
   * Обработчик нажатия клавиш
   */
  private _handleKeyDown = (e: KeyboardEvent): void => {
    // Проверяем Shift+R (любая раскладка, любой регистр)
    // R на английской и К на русской раскладке
    if (e.shiftKey && (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К')) {
      e.preventDefault();
      this.toggle();
    }
  };

  /**
   * Переключить видимость линейки и направляющих
   */
  public toggle(): void {
    if (this._visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Показать линейку и направляющие
   */
  public show(): void {
    if (!this._core) return;

    this._visible = true;

    // Показываем ruler-layer (RulerPlugin и RulerHighlightPlugin)
    const rulerLayer = this._core.stage.findOne('.ruler-layer');
    if (rulerLayer && !rulerLayer.isVisible()) {
      rulerLayer.show();
    }

    // Показываем guides-layer (RulerGuidesPlugin)
    const guidesLayer = this._core.stage.findOne('.guides-layer');
    if (guidesLayer && !guidesLayer.isVisible()) {
      guidesLayer.show();
    }

    this._core.stage.batchDraw();
  }

  /**
   * Скрыть линейку и направляющие
   */
  public hide(): void {
    if (!this._core) return;

    this._visible = false;

    // Скрываем ruler-layer (RulerPlugin и RulerHighlightPlugin)
    const rulerLayer = this._core.stage.findOne('.ruler-layer');
    if (rulerLayer?.isVisible()) {
      rulerLayer.hide();
    }

    // Скрываем guides-layer (RulerGuidesPlugin)
    const guidesLayer = this._core.stage.findOne('.guides-layer');
    if (guidesLayer?.isVisible()) {
      guidesLayer.hide();
    }

    this._core.stage.batchDraw();
  }

  /**
   * Проверить, видима ли линейка
   */
  public isVisible(): boolean {
    return this._visible;
  }
}
