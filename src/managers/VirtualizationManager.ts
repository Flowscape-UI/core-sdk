import Konva from 'konva';

import type { BaseNode } from '../nodes/BaseNode';
import { ThrottleHelper } from '../utils/ThrottleHelper';

import type { NodeManager } from './NodeManager';
import { LODManager, type LODOptions } from './LODManager';

export interface VirtualizationStats {
  total: number;
  visible: number;
  hidden: number;
  cullingRate: number; // процент скрытых нод
}

export interface VirtualizationOptions {
  enabled?: boolean;
  bufferZone?: number; // пикселей за пределами viewport для плавности
  throttleMs?: number; // задержка между обновлениями (мс)
  lod?: LODOptions; // настройки Level of Detail
}

/**
 * VirtualizationManager - управляет видимостью нод для оптимизации производительности
 *
 * Основная идея: отрисовывать только те ноды, которые находятся в viewport (видимой области).
 * Это даёт огромный прирост производительности при большом количестве нод.
 *
 * Оптимизации:
 * 1. visible: false - нода не отрисовывается
 * 2. listening: false - нода не обрабатывает события
 * 3. Буферная зона - рендерим немного больше viewport для плавности
 * 4. Throttling - ограничиваем частоту обновлений
 */
export class VirtualizationManager {
  private _enabled: boolean;
  private _bufferZone: number;
  private _throttle: ThrottleHelper;

  private _viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
  } = { x: 0, y: 0, width: 0, height: 0 };

  private _visibleNodes = new Set<string>();
  private _hiddenNodes = new Set<string>();

  private _updateScheduled = false;

  // Кэш bounding boxes для оптимизации
  private _bboxCache = new Map<
    string,
    { x: number; y: number; width: number; height: number; timestamp: number }
  >();
  private _bboxCacheTTL = 100; // мс

  // LOD Manager для дополнительной оптимизации
  private _lod: LODManager | null = null;

  constructor(
    private _stage: Konva.Stage,
    private _world: Konva.Group,
    private _nodeManager: NodeManager,
    options: VirtualizationOptions = {},
  ) {
    this._enabled = options.enabled ?? true;
    this._bufferZone = options.bufferZone ?? 200;
    this._throttle = new ThrottleHelper(options.throttleMs ?? 16); // ~60 FPS

    // Инициализируем LOD если включён
    if (options.lod) {
      this._lod = new LODManager(options.lod);
    }

    this._updateViewport();
    this._setupListeners();

    // Первоначальное обновление
    if (this._enabled) {
      this.updateVisibility();
    }
  }

  /**
   * Обновляет viewport на основе текущей позиции и масштаба world
   */
  private _updateViewport(): void {
    const scale = this._world.scaleX();
    const position = this._world.position();

    // Вычисляем viewport в мировых координатах
    // Учитываем, что world может быть трансформирован (позиция + масштаб)
    this._viewport = {
      x: -position.x / scale - this._bufferZone,
      y: -position.y / scale - this._bufferZone,
      width: this._stage.width() / scale + this._bufferZone * 2,
      height: this._stage.height() / scale + this._bufferZone * 2,
    };
  }

  /**
   * Получает bounding box ноды с кэшированием
   * ВАЖНО: Возвращает bbox в мировых координатах (относительно world)
   */
  private _getNodeBBox(node: BaseNode): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const cached = this._bboxCache.get(node.id);
    const now = Date.now();

    // Используем кэш, если он свежий
    if (cached && now - cached.timestamp < this._bboxCacheTTL) {
      return cached;
    }

    // Вычисляем новый bbox
    const konvaNode = node.getNode();

    // ИСПРАВЛЕНИЕ: Используем getClientRect с relativeTo для получения
    // координат относительно world (а не абсолютных координат stage)
    const clientRect = konvaNode.getClientRect({ relativeTo: this._world });

    const bbox = {
      x: clientRect.x,
      y: clientRect.y,
      width: clientRect.width,
      height: clientRect.height,
      timestamp: now,
    };

    this._bboxCache.set(node.id, bbox);
    return bbox;
  }

  /**
   * Проверяет, находится ли нода в viewport
   */
  private _isNodeVisible(node: BaseNode): boolean {
    const box = this._getNodeBBox(node);

    // Проверка пересечения с viewport
    return !(
      box.x + box.width < this._viewport.x ||
      box.x > this._viewport.x + this._viewport.width ||
      box.y + box.height < this._viewport.y ||
      box.y > this._viewport.y + this._viewport.height
    );
  }

  /**
   * Обновляет видимость всех нод
   */
  public updateVisibility(): void {
    if (!this._enabled) return;

    // Throttling - не обновляем слишком часто
    if (!this._throttle.shouldExecute()) {
      return;
    }

    const nodes = this._nodeManager.list();
    const newVisibleNodes = new Set<string>();
    let changesCount = 0;

    for (const node of nodes) {
      const isVisible = this._isNodeVisible(node);
      const konvaNode = node.getNode();

      if (isVisible) {
        newVisibleNodes.add(node.id);

        // Показываем ноду, если она была скрыта
        if (this._hiddenNodes.has(node.id)) {
          konvaNode.visible(true);
          konvaNode.listening(true);
          this._hiddenNodes.delete(node.id);
          changesCount++;
        }
      } else {
        // Скрываем ноду, если она была видима
        if (!this._hiddenNodes.has(node.id)) {
          konvaNode.visible(false);
          konvaNode.listening(false);
          this._hiddenNodes.add(node.id);
          changesCount++;
        }
      }
    }

    this._visibleNodes = newVisibleNodes;

    // ОПТ ИМИЗАЦИЯ: Применяем LOD только к ИЗМЕНИВШИМСЯ нодам
    if (this._lod?.enabled && changesCount > 0) {
      const scale = this._world.scaleX();

      // Применяем LOD только к ново видимым нодам
      for (const node of nodes) {
        if (newVisibleNodes.has(node.id)) {
          this._lod.applyLOD(node, scale);
        }
      }
    }

    // Перерисовываем только если были изменения
    if (changesCount > 0) {
      this._nodeManager.layer.batchDraw();
    }
  }

  /**
   * Настраивает слушатели событий
   */
  private _setupListeners(): void {
    this._world.on('xChange yChange scaleXChange scaleYChange', () => {
      // ОПТИМИЗАЦИЯ: НЕ очищаем кэш при панорамировании/зуме!
      // BBox в мировых координатах не меняется при трансформации world
      // Кэш остаётся валидным!
      this._scheduleUpdate();
    });

    // Обновляем при ресайзе stage
    // В Konva нет стандартного события resize, поэтому используем window.resize
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.addEventListener('resize', () => {
        this._updateViewport();
        this._scheduleUpdate();
      });
    }
    this._nodeManager.eventBus.on('node:removed', (node: BaseNode) => {
      this._visibleNodes.delete(node.id);
      this._hiddenNodes.delete(node.id);
      this._bboxCache.delete(node.id);
    });
  }

  /**
   * Планирует обновление на следующий фрейм
   */
  private _scheduleUpdate(): void {
    if (this._updateScheduled) return;

    this._updateScheduled = true;

    // if (globalThis.requestAnimationFrame) {
    globalThis.requestAnimationFrame(() => {
      this._updateViewport();
      this.updateVisibility();
      this._updateScheduled = false;
    });
    // } else {
    //   // Fallback для окружений без requestAnimationFrame
    //   globalThis.setTimeout(() => {
    //     this._updateViewport();
    //     this.updateVisibility();
    //     this._updateScheduled = false;
    //   }, 16);
    // }
  }

  /**
   * Включает виртуализацию
   */
  public enable(): void {
    if (this._enabled) return;

    this._enabled = true;
    this.updateVisibility();
  }

  /**
   * Отключает виртуализацию (показывает все ноды)
   */
  public disable(): void {
    if (!this._enabled) return;

    this._enabled = false;

    // Показываем все скрытые ноды
    for (const nodeId of this._hiddenNodes) {
      const node = this._nodeManager.findById(nodeId);
      if (node) {
        const konvaNode = node.getNode();
        konvaNode.visible(true);
        konvaNode.listening(true);
      }
    }

    this._hiddenNodes.clear();
    this._visibleNodes.clear();
    this._nodeManager.layer.batchDraw();
  }

  /**
   * Возвращает статистику виртуализации
   */
  public getStats(): VirtualizationStats {
    const total = this._nodeManager.list().length;
    const visible = this._visibleNodes.size;
    const hidden = this._hiddenNodes.size;

    return {
      total,
      visible,
      hidden,
      cullingRate: total > 0 ? (hidden / total) * 100 : 0,
    };
  }

  /**
   * Очищает кэш bounding boxes
   */
  public clearCache(): void {
    this._bboxCache.clear();
  }

  /**
   * Устанавливает размер буферной зоны
   */
  public setBufferZone(pixels: number): void {
    this._bufferZone = pixels;
    this._updateViewport();
    this._scheduleUpdate();
  }

  /**
   * Устанавливает throttle для обновлений
   */
  public setThrottle(ms: number): void {
    this._throttle = new ThrottleHelper(ms);
  }

  /**
   * Проверяет, включена ли виртуализация
   */
  public get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Возвращает текущий viewport
   */
  public get viewport(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return { ...this._viewport };
  }

  /**
   * Принудительно обновляет видимость (игнорируя throttle)
   */
  public forceUpdate(): void {
    this._throttle.reset();
    this._updateViewport();
    this.updateVisibility();
  }

  /**
   * Возвращает LOD Manager (если включён)
   */
  public get lod(): LODManager | null {
    return this._lod;
  }

  /**
   * Уничтожает менеджер и очищает ресурсы
   */
  public destroy(): void {
    this.disable();
    this._bboxCache.clear();
    this._visibleNodes.clear();
    this._hiddenNodes.clear();

    // Очищаем LOD
    if (this._lod) {
      const nodes = this._nodeManager.list();
      this._lod.restoreAll(nodes);
    }
  }
}
