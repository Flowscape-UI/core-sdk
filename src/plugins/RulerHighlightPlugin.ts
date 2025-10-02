import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import { DebounceHelper } from '../utils/DebounceHelper';

import { Plugin } from './Plugin';

export interface RulerHighlightPluginOptions {
  highlightColor?: string; // цвет подсветки областей
  highlightOpacity?: number; // прозрачность подсветки
  rulerThicknessPx?: number; // толщина линейки (должна совпадать с RulerPlugin)
}

/**
 * RulerHighlightPlugin
 * Подсвечивает на линейках области координат, которые занимают выбранные объекты
 * Работает только если присутствуют RulerPlugin и SelectionPlugin
 */
export class RulerHighlightPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerHighlightPluginOptions>;
  private _highlightLayer: Konva.Layer | null = null;
  private _hGroup: Konva.Group | null = null; // группа горизонтальной линейки
  private _vGroup: Konva.Group | null = null; // группа вертикальной линейки
  private _hHighlights: Konva.Rect[] = []; // горизонтальные подсветки
  private _vHighlights: Konva.Rect[] = []; // вертикальные подсветки

  // Кэш для оптимизации
  private _updateDebounce = new DebounceHelper();
  private _transformersCache: Konva.Transformer[] = [];
  private _cacheInvalidated = true;

  constructor(options: RulerHighlightPluginOptions = {}) {
    super();
    const { highlightColor = '#2b83ff', highlightOpacity = 0.3, rulerThicknessPx = 30 } = options;
    this._options = {
      highlightColor,
      highlightOpacity,
      rulerThicknessPx,
    };
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Проверяем наличие ruler-layer (создаётся RulerPlugin)
    const rulerLayer = core.stage.findOne('.ruler-layer') as Konva.Layer | null;
    if (!rulerLayer) {
      globalThis.console.warn(
        'RulerHighlightPlugin: RulerPlugin not found. ' +
          'Please add RulerPlugin before RulerHighlightPlugin. ' +
          'Plugin will not work without RulerPlugin.',
      );
      return;
    }

    // Используем сам ruler-layer для подсветок
    this._highlightLayer = rulerLayer;

    // Находим группы горизонтальной и вертикальной линеек внутри ruler-layer
    // Они должны быть первыми двумя Group в layer
    const groups = rulerLayer.find('Group');
    if (groups.length >= 2) {
      this._hGroup = groups[0] as Konva.Group;
      this._vGroup = groups[1] as Konva.Group;
    } else {
      globalThis.console.warn('RulerHighlightPlugin: Could not find ruler groups');
      return;
    }

    // Подписываемся на изменения world для обновления позиций подсветок
    // Оптимизация: используем throttling для всех событий
    const world = core.nodes.world;
    world.on(
      'xChange.ruler-highlight yChange.ruler-highlight scaleXChange.ruler-highlight scaleYChange.ruler-highlight',
      () => {
        this._scheduleUpdate();
      },
    );

    // Подписываемся на изменение размера stage
    core.stage.on('resize.ruler-highlight', () => {
      this._scheduleUpdate();
    });

    // Подписываемся на изменения трансформера (selection)
    // Используем делегирование событий через stage
    core.stage.on('transform.ruler-highlight transformend.ruler-highlight', () => {
      this._scheduleUpdate();
    });

    // Подписываемся на клики для отслеживания изменения selection
    core.stage.on('click.ruler-highlight', () => {
      this._invalidateCache();
      this._scheduleUpdate();
    });

    // Подписываемся на dragmove для обновления во время перетаскивания
    core.stage.on('dragmove.ruler-highlight', () => {
      this._scheduleUpdate();
    });

    // Подписываемся на события AreaSelection для немедленного обновления при выделении области
    core.stage.on('mouseup.ruler-highlight', () => {
      this._invalidateCache();
      this._scheduleUpdate();
    });

    // Начальная отрисовка
    this._updateHighlights();
  }

  protected onDetach(core: CoreEngine): void {
    // Отписываемся от всех событий
    try {
      core.stage.off('.ruler-highlight');
      core.nodes.world.off('.ruler-highlight');
    } catch {
      // Игнорируем ошибки при отписке
    }

    // Удаляем только наши подсветки, но не сам слой (он принадлежит RulerPlugin)
    this._hHighlights.forEach((r) => {
      try {
        r.destroy();
      } catch {
        // Игнорируем ошибки
      }
    });
    this._vHighlights.forEach((r) => {
      try {
        r.destroy();
      } catch {
        // Игнорируем ошибки
      }
    });

    this._hHighlights = [];
    this._vHighlights = [];
    this._highlightLayer = null;
    this._hGroup = null;
    this._vGroup = null;
  }

  /**
   * Отложенное обновление (debouncing)
   */
  private _scheduleUpdate() {
    this._updateDebounce.schedule(() => {
      this._updateHighlights();
    });
  }

  /**
   * Инвалидировать кэш трансформеров
   */
  private _invalidateCache() {
    this._cacheInvalidated = true;
  }

  /**
   * Обновление подсветок на основе выбранных объектов
   */
  private _updateHighlights() {
    if (!this._core) return;
    if (!this._highlightLayer) return; // слой не создан - ничего не делаем

    // Оптимизация: переиспользуем существующие подсветки вместо пересоздания
    // Очищаем старые подсветки только если они есть
    for (const highlight of this._hHighlights) {
      highlight.destroy();
    }
    this._hHighlights = [];

    for (const highlight of this._vHighlights) {
      highlight.destroy();
    }
    this._vHighlights = [];

    // Получаем выбранные объекты напрямую из трансформеров (уже развернутые)
    const allNodes = this._getSelectedKonvaNodes();
    if (allNodes.length === 0) {
      this._highlightLayer.batchDraw();
      return;
    }

    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const stageW = stage.width();
    const stageH = stage.height();
    const tPx = this._options.rulerThicknessPx;

    const worldScale = world.scaleX();
    const worldX = world.x();
    const worldY = world.y();

    // Собираем области для горизонтальной и вертикальной линеек
    interface Segment {
      start: number;
      end: number;
    }
    const hSegments: Segment[] = [];
    const vSegments: Segment[] = [];

    // Для каждого объекта получаем его bounds
    for (const konvaNode of allNodes) {
      // Получаем bbox объекта относительно world node (без учета world transform)
      const rect = konvaNode.getClientRect({ relativeTo: world });

      // Преобразуем world координаты в screen координаты
      const screenX1 = worldX + rect.x * worldScale;
      const screenX2 = worldX + (rect.x + rect.width) * worldScale;
      const screenY1 = worldY + rect.y * worldScale;
      const screenY2 = worldY + (rect.y + rect.height) * worldScale;

      // Добавляем сегменты для горизонтальной линейки (по X)
      if (screenX1 < stageW && screenX2 > tPx) {
        const start = Math.max(tPx, screenX1);
        const end = Math.min(stageW, screenX2);
        if (start < end) {
          hSegments.push({ start, end });
        }
      }

      // Добавляем сегменты для вертикальной линейки (по Y)
      if (screenY1 < stageH && screenY2 > tPx) {
        const start = Math.max(tPx, screenY1);
        const end = Math.min(stageH, screenY2);
        if (start < end) {
          vSegments.push({ start, end });
        }
      }
    }

    // Объединяем перекрывающиеся/соседние сегменты для оптимизации
    const mergedHSegments = this._mergeSegments(hSegments);
    const mergedVSegments = this._mergeSegments(vSegments);

    // Создаём прямоугольники для горизонтальной линейки
    if (this._hGroup) {
      for (const seg of mergedHSegments) {
        const hRect = new Konva.Rect({
          x: seg.start,
          y: 0,
          width: seg.end - seg.start,
          height: tPx,
          fill: this._options.highlightColor,
          opacity: this._options.highlightOpacity,
          listening: false,
          name: 'ruler-highlight-h',
        });
        this._hGroup.add(hRect);
        hRect.setZIndex(1);
        this._hHighlights.push(hRect);
      }
    }

    // Создаём прямоугольники для вертикальной линейки
    if (this._vGroup) {
      for (const seg of mergedVSegments) {
        const vRect = new Konva.Rect({
          x: 0,
          y: seg.start,
          width: tPx,
          height: seg.end - seg.start,
          fill: this._options.highlightColor,
          opacity: this._options.highlightOpacity,
          listening: false,
          name: 'ruler-highlight-v',
        });
        this._vGroup.add(vRect);
        vRect.setZIndex(1);
        this._vHighlights.push(vRect);
      }
    }

    this._highlightLayer.batchDraw();
  }

  /**
   * Рекурсивно собирает все отдельные объекты (разворачивает группы)
   */
  private _collectNodes(node: Konva.Node, result: Konva.Node[]): void {
    // Пропускаем Transformer и другие служебные объекты
    const className = node.getClassName();
    const nodeName = node.name();

    // Список служебных имен, которые нужно пропускать
    const serviceNames = ['overlay-hit', 'ruler-', 'guide-', '_anchor', 'back', 'rotater'];
    const isServiceNode = serviceNames.some((name) => nodeName.includes(name));

    if (className === 'Transformer' || className === 'Layer' || isServiceNode) {
      return;
    }

    // Если это Group - рекурсивно обрабатываем детей
    if (className === 'Group') {
      const group = node as Konva.Group;
      const children = group.getChildren();

      // Если группа пустая, пропускаем её
      if (children.length === 0) {
        return;
      }

      // Разворачиваем детей группы
      for (const child of children) {
        this._collectNodes(child, result);
      }
    } else {
      // Это обычный объект (Shape, Rect, Circle и т.д.) - добавляем его
      // Только если это не дубликат
      if (!result.includes(node)) {
        result.push(node);
      }
    }
  }

  /**
   * Объединяет перекрывающиеся и соседние сегменты
   */
  private _mergeSegments(
    segments: { start: number; end: number }[],
  ): { start: number; end: number }[] {
    if (segments.length === 0) return [];

    // Сортируем сегменты по началу
    const sorted = segments.slice().sort((a, b) => a.start - b.start);

    const first = sorted[0];
    if (!first) return [];

    const merged: { start: number; end: number }[] = [];
    let current = { start: first.start, end: first.end };

    for (let i = 1; i < sorted.length; i++) {
      const seg = sorted[i];
      if (!seg) continue;

      // Если сегменты перекрываются или соседние (с учетом небольшого зазора)
      if (seg.start <= current.end + 1) {
        // Объединяем сегменты
        current.end = Math.max(current.end, seg.end);
      } else {
        // Сегменты не пересекаются - сохраняем текущий и начинаем новый
        merged.push(current);
        current = { start: seg.start, end: seg.end };
      }
    }

    // Добавляем последний сегмент
    merged.push(current);

    return merged;
  }

  /**
   * Получить список выбранных Konva узлов (с разворачиванием групп)
   * Оптимизация: кэшируем трансформеры
   */
  private _getSelectedKonvaNodes(): Konva.Node[] {
    if (!this._core) return [];

    const transformerNodes: Konva.Node[] = [];

    try {
      // Оптимизация: используем кэш трансформеров
      if (this._cacheInvalidated) {
        this._transformersCache = this._core.stage.find('Transformer');
        this._cacheInvalidated = false;
      }

      for (const tr of this._transformersCache) {
        const nodes = tr.nodes();

        for (const konvaNode of nodes) {
          if (!transformerNodes.includes(konvaNode)) {
            transformerNodes.push(konvaNode);
          }
        }
      }
    } catch {
      // Игнорируем ошибки
    }

    // Теперь разворачиваем группы чтобы получить отдельные объекты
    const allNodes: Konva.Node[] = [];
    for (const node of transformerNodes) {
      this._collectNodes(node, allNodes);
    }

    return allNodes;
  }

  /**
   * Публичный метод для принудительного обновления подсветок
   * Полезно вызывать при изменении selection извне
   */
  public update() {
    this._updateHighlights();
  }
}
