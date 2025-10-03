import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';

import { Plugin } from './Plugin';

// Extended type for Line with worldCoord
interface GuideLineWithCoord extends Konva.Line {
  worldCoord: number;
}

export interface RulerGuidesPluginOptions {
  guideColor?: string; // color of guides
  activeColor?: string; // color of active guide
  rulerThicknessPx?: number; // thickness of ruler (should match RulerPlugin)
  snapToGrid?: boolean; // snap to grid
  gridStep?: number; // grid step for snapping
}

export class RulerGuidesPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerGuidesPluginOptions>;
  private _guidesLayer: Konva.Layer | null = null;
  private _guides: GuideLineWithCoord[] = [];
  private _activeGuide: GuideLineWithCoord | null = null;
  private _draggingGuide: { type: 'h' | 'v'; line: GuideLineWithCoord } | null = null;

  // Cache for optimization
  private _rulerLayerCache: Konva.Layer | null = null;
  private _updateScheduled = false;
  private _dragMoveScheduled = false;
  private _batchDrawScheduled = false;

  constructor(options: RulerGuidesPluginOptions = {}) {
    super();
    const {
      guideColor = '#8e3e2c', // orange for regular lines
      activeColor = '#2b83ff', // blue for active line
      rulerThicknessPx = 30,
      snapToGrid = true,
      gridStep = 1, // step 1px for precise positioning
    } = options;
    this._options = {
      guideColor,
      activeColor,
      rulerThicknessPx,
      snapToGrid,
      gridStep,
    };
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Check for ruler-layer (created by RulerPlugin)
    const rulerLayer = core.stage.findOne('.ruler-layer');
    if (!rulerLayer) {
      throw new Error(
        'RulerGuidesPlugin requires RulerPlugin to be added to the CoreEngine first. ' +
          'Please add RulerPlugin before RulerGuidesPlugin.',
      );
    }

    // Create layer for guides
    this._guidesLayer = new Konva.Layer({ name: 'guides-layer' });
    core.stage.add(this._guidesLayer);

    // Move guides-layer ABOVE all layers (including ruler-layer)
    // Guides must be visible above everything
    this._guidesLayer.moveToTop();

    // Subscribe to stage events for tracking dragging from ruler
    const stage = core.stage;
    const thicknessPx = this._options.rulerThicknessPx;

    stage.on('mousedown.ruler-guides', () => {
      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Check if we clicked on a guide line
      const target = stage.getIntersection(pos);
      if (target && (target.name() === 'guide-h' || target.name() === 'guide-v')) {
        // Click on a guide line - handled by its own handler
        return;
      }

      // Check click position relative to ruler
      if (pos.y <= thicknessPx && pos.x >= thicknessPx) {
        // Click on horizontal ruler
        this._startCreateGuide('h');
      } else if (pos.x <= thicknessPx && pos.y >= thicknessPx) {
        // Click on vertical ruler
        this._startCreateGuide('v');
      } else {
        // Click outside ruler and guides - reset active guide
        this._setActiveGuide(null);
      }
    });

    // Cursors on hover over rulers
    stage.on('mousemove.ruler-guides', () => {
      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Check if we are over a guide line or another interactive element
      const target = stage.getIntersection(pos);
      if (target) {
        const targetName = target.name();
        // If over a guide line or interactive element (anchor, rotater and so on) - do not change cursor
        if (
          targetName === 'guide-h' ||
          targetName === 'guide-v' ||
          targetName.includes('_anchor') ||
          targetName.includes('rotater') ||
          target.draggable()
        ) {
          return;
        }
      }

      // Check if we are over horizontal ruler
      if (pos.y <= thicknessPx && pos.x >= thicknessPx) {
        // Over horizontal ruler
        stage.container().style.cursor = 'ns-resize';
      } else if (pos.x <= thicknessPx && pos.y >= thicknessPx) {
        // Over vertical ruler
        stage.container().style.cursor = 'ew-resize';
      } else {
        // Not over ruler and not over guide
        if (!this._draggingGuide) {
          stage.container().style.cursor = 'default';
        }
      }
    });

    // Cache ruler-layer
    this._rulerLayerCache = core.stage.findOne('.ruler-layer') as Konva.Layer | null;

    // Subscribe to world changes for updating line positions
    const world = core.nodes.world;
    world.on(
      'xChange.ruler-guides yChange.ruler-guides scaleXChange.ruler-guides scaleYChange.ruler-guides',
      () => {
        this._scheduleUpdate();
      },
    );

    // Subscribe to stage resize for updating line length
    stage.on('resize.ruler-guides', () => {
      this._scheduleUpdate();
    });

    core.stage.batchDraw();
  }

  protected onDetach(core: CoreEngine): void {
    // Unsubscribe from all events
    core.stage.off('.ruler-guides');
    core.nodes.world.off('.ruler-guides');

    // Remove layer
    if (this._guidesLayer) {
      this._guidesLayer.destroy();
      this._guidesLayer = null;
    }

    this._guides = [];
    this._activeGuide = null;
    this._draggingGuide = null;
  }

  /**
   * Schedules update of guide positions (without throttling for smoothness)
   */
  private _scheduleUpdate() {
    if (this._updateScheduled) return;

    this._updateScheduled = true;
    globalThis.requestAnimationFrame(() => {
      this._updateScheduled = false;
      this._updateGuidesPositions();
    });
  }

  /**
   * Updates positions of all guides when world transform changes
   */
  private _updateGuidesPositions() {
    if (!this._core || this._guides.length === 0) return;

    // Cache all calculations once
    const world = this._core.nodes.world;
    const scale = world.scaleX();
    const worldX = world.x();
    const worldY = world.y();
    const stageW = this._core.stage.width();
    const stageH = this._core.stage.height();

    // Pre-calculate point arrays for reuse
    const hPoints = [0, 0, stageW, 0];
    const vPoints = [0, 0, 0, stageH];

    // Optimization: use for-of and minimize method calls
    for (const guide of this._guides) {
      const worldCoord = guide.worldCoord;
      const isHorizontal = guide.name() === 'guide-h';

      if (isHorizontal) {
        const screenY = worldY + worldCoord * scale;
        guide.position({ x: 0, y: screenY });
        guide.points(hPoints);
      } else {
        const screenX = worldX + worldCoord * scale;
        guide.position({ x: screenX, y: 0 });
        guide.points(vPoints);
      }
    }

    this._guidesLayer?.batchDraw();
  }

  /**
   * Snaps coordinate to grid
   */
  private _snapToGrid(coord: number): number {
    if (!this._options.snapToGrid) return Math.round(coord);
    const step = this._options.gridStep;
    return Math.round(coord / step) * step;
  }

  /**
   * Schedules batchDraw for grouping updates
   */
  private _scheduleBatchDraw() {
    if (this._batchDrawScheduled) return;
    this._batchDrawScheduled = true;

    globalThis.requestAnimationFrame(() => {
      this._batchDrawScheduled = false;
      this._core?.stage.batchDraw();
    });
  }

  /**
   * Starts creating a guide line from ruler
   */
  private _startCreateGuide(type: 'h' | 'v') {
    if (!this._core || !this._guidesLayer) return;

    const stage = this._core.stage;
    const world = this._core.nodes.world;
    const scale = world.scaleX();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Calculate world coordinate with grid snapping
    const rawCoord = type === 'h' ? (pos.y - world.y()) / scale : (pos.x - world.x()) / scale;
    const worldCoord = this._snapToGrid(rawCoord);

    // Create guide line
    const line = new Konva.Line({
      name: type === 'h' ? 'guide-h' : 'guide-v',
      stroke: this._options.guideColor,
      strokeWidth: 1,
      opacity: 1,
      draggable: true,
      hitStrokeWidth: 8,
      dragBoundFunc: (p) => {
        if (!this._core) return p;
        const world = this._core.nodes.world;
        const scale = world.scaleX();

        // Limit movement to one axis with grid snapping
        if (type === 'h') {
          const rawWorldY = (p.y - world.y()) / scale;
          const worldY = this._snapToGrid(rawWorldY);
          return { x: 0, y: world.y() + worldY * scale };
        } else {
          const rawWorldX = (p.x - world.x()) / scale;
          const worldX = this._snapToGrid(rawWorldX);
          return { x: world.x() + worldX * scale, y: 0 };
        }
      },
    });

    // Save world coordinate
    (line as GuideLineWithCoord).worldCoord = worldCoord;

    // Add event handlers
    line.on('mouseenter', () => {
      if (this._core) {
        this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';
      }
      this._scheduleBatchDraw();
    });

    line.on('mouseleave', () => {
      if (this._core && !this._draggingGuide) {
        this._core.stage.container().style.cursor = 'default';
      }
      this._scheduleBatchDraw();
    });

    line.on('click', () => {
      this._setActiveGuide(line as GuideLineWithCoord);
    });

    line.on('dragstart', () => {
      const guideLine = line as GuideLineWithCoord;
      this._draggingGuide = { type, line: guideLine };
      this._setActiveGuide(guideLine);
      if (this._core) {
        this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';
      }
    });

    line.on('dragmove', () => {
      if (!this._core || this._dragMoveScheduled) return;

      this._dragMoveScheduled = true;
      globalThis.requestAnimationFrame(() => {
        this._dragMoveScheduled = false;
        if (!this._core) return;

        const world = this._core.nodes.world;
        const scale = world.scaleX();
        const pos = line.getAbsolutePosition();

        // Update world coordinate with grid snapping
        const rawCoord = type === 'h' ? (pos.y - world.y()) / scale : (pos.x - world.x()) / scale;
        const worldCoord = this._snapToGrid(rawCoord);

        (line as GuideLineWithCoord).worldCoord = worldCoord;

        // Set cursor while dragging
        this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';

        // Update ruler for dynamic highlighting
        if (this._rulerLayerCache) {
          this._rulerLayerCache.batchDraw();
        }
      });
    });

    line.on('dragend', () => {
      this._draggingGuide = null;
      // Cursor stays resize, since mouse is still over the line
      if (this._core) {
        this._core.stage.container().style.cursor = type === 'h' ? 'ns-resize' : 'ew-resize';
      }
    });

    const guideLine = line as GuideLineWithCoord;
    this._guidesLayer.add(guideLine);
    this._guides.push(guideLine);
    this._setActiveGuide(guideLine);

    // Initial position and size
    if (type === 'h') {
      line.position({ x: 0, y: world.y() + worldCoord * scale });
      line.points([0, 0, stage.width(), 0]);
    } else {
      line.position({ x: world.x() + worldCoord * scale, y: 0 });
      line.points([0, 0, 0, stage.height()]);
    }

    // Начинаем перетаскивание программно
    this._draggingGuide = { type, line: guideLine };

    const moveHandler = () => {
      if (!this._draggingGuide || !this._core) return;

      const p = this._core.stage.getPointerPosition();
      if (!p) return;

      const world = this._core.nodes.world;
      const scale = world.scaleX();
      const rawCoord = type === 'h' ? (p.y - world.y()) / scale : (p.x - world.x()) / scale;
      const worldCoord = this._snapToGrid(rawCoord);

      (line as GuideLineWithCoord).worldCoord = worldCoord;

      if (type === 'h') {
        line.position({ x: 0, y: world.y() + worldCoord * scale });
        line.points([0, 0, this._core.stage.width(), 0]);
      } else {
        line.position({ x: world.x() + worldCoord * scale, y: 0 });
        line.points([0, 0, 0, this._core.stage.height()]);
      }

      this._scheduleBatchDraw();
    };

    const upHandler = () => {
      this._draggingGuide = null;
      if (this._core) {
        this._core.stage.off('mousemove.guide-create');
        this._core.stage.off('mouseup.guide-create');
      }
    };

    stage.on('mousemove.guide-create', moveHandler);
    stage.on('mouseup.guide-create', upHandler);

    this._scheduleBatchDraw();
  }

  private _setActiveGuide(guide: GuideLineWithCoord | null) {
    if (this._activeGuide && this._activeGuide !== guide) {
      // Сбрасываем предыдущую активную направляющую
      this._activeGuide.stroke(this._options.guideColor);
      this._activeGuide.strokeWidth(1);
    }
    this._activeGuide = guide;
    if (guide) {
      // Highlight new active guide
      guide.stroke(this._options.activeColor);
      guide.strokeWidth(2);
    }

    // Notify ruler about the need to redraw for coordinate highlighting
    // Optimization: use cached layer
    if (this._rulerLayerCache) {
      this._rulerLayerCache.batchDraw();
    }

    // Notify RulerPlugin about changes to guides
    this._core?.stage.fire('guidesChanged.ruler');

    this._scheduleBatchDraw();
  }

  /**
   * Get active guide
   */
  public getActiveGuide(): Konva.Line | null {
    return this._activeGuide;
  }

  /**
   * Get active guide info
   * @returns { type: 'h' | 'v', coord: number } | null
   */
  public getActiveGuideInfo(): { type: 'h' | 'v'; coord: number } | null {
    if (!this._activeGuide) return null;
    const worldCoord = this._activeGuide.worldCoord;
    const type = this._activeGuide.name() === 'guide-h' ? ('h' as const) : ('v' as const);
    return { type, coord: worldCoord };
  }

  /**
   * Remove active guide
   */
  public removeActiveGuide() {
    if (this._activeGuide) {
      this._activeGuide.destroy();
      this._guides = this._guides.filter((g) => g !== this._activeGuide);
      this._activeGuide = null;
      this._scheduleBatchDraw();
    }
  }

  /**
   * Get all guides
   */
  public getGuides(): Konva.Line[] {
    return [...this._guides];
  }

  /**
   * Remove all guides
   */
  public clearGuides() {
    this._guides.forEach((g) => g.destroy());
    this._guides = [];
    this._activeGuide = null;
    this._scheduleBatchDraw();
  }
}
