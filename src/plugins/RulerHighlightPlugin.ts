import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import { DebounceHelper } from '../utils/DebounceHelper';

import { Plugin } from './Plugin';

export interface RulerHighlightPluginOptions {
  highlightColor?: string; // color of the highlight
  highlightOpacity?: number; // opacity of the highlight
  rulerThicknessPx?: number; // thickness of the ruler (should match RulerPlugin)
}

/**
 * RulerHighlightPlugin
 * Highlights the areas of the coordinate system that are occupied by selected objects
 * Works only if RulerPlugin and SelectionPlugin are present
 */
export class RulerHighlightPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<RulerHighlightPluginOptions>;
  private _highlightLayer: Konva.Layer | null = null;
  private _hGroup: Konva.Group | null = null; // horizontal ruler group
  private _vGroup: Konva.Group | null = null; // vertical ruler group
  private _hHighlights: Konva.Rect[] = []; // horizontal highlights
  private _vHighlights: Konva.Rect[] = []; // vertical highlights

  // Cache for optimization
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

    // Check for the presence of ruler-layer (created by RulerPlugin)
    const rulerLayer = core.stage.findOne('.ruler-layer') as Konva.Layer | null;
    if (!rulerLayer) {
      globalThis.console.warn(
        'RulerHighlightPlugin: RulerPlugin not found. ' +
          'Please add RulerPlugin before RulerHighlightPlugin. ' +
          'Plugin will not work without RulerPlugin.',
      );
      return;
    }

    // Use the same ruler-layer for highlights
    this._highlightLayer = rulerLayer;

    // Find the groups of horizontal and vertical rulers inside ruler-layer
    // They should be the first two Group in layer
    const groups = rulerLayer.find('Group');
    if (groups.length >= 2) {
      this._hGroup = groups[0] as Konva.Group;
      this._vGroup = groups[1] as Konva.Group;
    } else {
      globalThis.console.warn('RulerHighlightPlugin: Could not find ruler groups');
      return;
    }

    // Subscribe to world changes for updating highlight positions
    // Optimization: use throttling for all events
    const world = core.nodes.world;
    world.on(
      'xChange.ruler-highlight yChange.ruler-highlight scaleXChange.ruler-highlight scaleYChange.ruler-highlight',
      () => {
        this._scheduleUpdate();
      },
    );

    // Subscribe to stage resize for updating highlight positions
    core.stage.on('resize.ruler-highlight', () => {
      this._scheduleUpdate();
    });

    // Subscribe to transformer changes (selection)
    // Use event delegation through stage
    core.stage.on('transform.ruler-highlight transformend.ruler-highlight', () => {
      this._scheduleUpdate();
    });

    // Subscribe to clicks for tracking selection change
    core.stage.on('click.ruler-highlight', () => {
      this._invalidateCache();
      this._scheduleUpdate();
    });

    // Subscribe to dragmove for updating during dragging
    core.stage.on('dragmove.ruler-highlight', () => {
      this._scheduleUpdate();
    });

    // Subscribe to AreaSelection events for immediate update on area selection
    core.stage.on('mouseup.ruler-highlight', () => {
      this._invalidateCache();
      this._scheduleUpdate();
    });

    // Initial draw
    this._updateHighlights();
  }

  protected onDetach(core: CoreEngine): void {
    // Unsubscribe from all events
    try {
      core.stage.off('.ruler-highlight');
      core.nodes.world.off('.ruler-highlight');
    } catch {
      // Ignore errors on unsubscribe
    }

    // Remove only our highlights, but not the layer (it belongs to RulerPlugin)
    this._hHighlights.forEach((r) => {
      try {
        r.destroy();
      } catch {
        // Ignore errors on destroy
      }
    });
    this._vHighlights.forEach((r) => {
      try {
        r.destroy();
      } catch {
        // Ignore errors on destroy
      }
    });

    this._hHighlights = [];
    this._vHighlights = [];
    this._highlightLayer = null;
    this._hGroup = null;
    this._vGroup = null;
  }

  /**
   * Schedules an update (debouncing)
   */
  private _scheduleUpdate() {
    this._updateDebounce.schedule(() => {
      this._updateHighlights();
    });
  }

  /**
   * Invalidates the cache of transformers
   */
  private _invalidateCache() {
    this._cacheInvalidated = true;
  }

  /**
   * Updates highlights based on selected objects
   */
  private _updateHighlights() {
    if (!this._core) return;
    if (!this._highlightLayer) return; // layer not created - do nothing

    // Optimization: reuse existing highlights instead of recreating
    // Clear old highlights only if they exist
    for (const highlight of this._hHighlights) {
      highlight.destroy();
    }
    this._hHighlights = [];

    for (const highlight of this._vHighlights) {
      highlight.destroy();
    }
    this._vHighlights = [];

    // Get selected objects directly from transformers (already unwrapped)
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

    // Collect segments for horizontal and vertical rulers
    interface Segment {
      start: number;
      end: number;
    }
    const hSegments: Segment[] = [];
    const vSegments: Segment[] = [];

    // For each object, get its bounds
    for (const konvaNode of allNodes) {
      // Get bbox object relative to world node (without world transform)
      const rect = konvaNode.getClientRect({ relativeTo: world });

      // Convert world coordinates to screen coordinates
      const screenX1 = worldX + rect.x * worldScale;
      const screenX2 = worldX + (rect.x + rect.width) * worldScale;
      const screenY1 = worldY + rect.y * worldScale;
      const screenY2 = worldY + (rect.y + rect.height) * worldScale;

      // Add segments for horizontal ruler (X)
      if (screenX1 < stageW && screenX2 > tPx) {
        const start = Math.max(tPx, screenX1);
        const end = Math.min(stageW, screenX2);
        if (start < end) {
          hSegments.push({ start, end });
        }
      }

      // Add segments for vertical ruler (Y)
      if (screenY1 < stageH && screenY2 > tPx) {
        const start = Math.max(tPx, screenY1);
        const end = Math.min(stageH, screenY2);
        if (start < end) {
          vSegments.push({ start, end });
        }
      }
    }

    // Merge overlapping/adjacent segments for optimization
    const mergedHSegments = this._mergeSegments(hSegments);
    const mergedVSegments = this._mergeSegments(vSegments);

    // Create rectangles for horizontal ruler
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

    // Create rectangles for vertical ruler
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
   * Recursively collects all individual objects (unwraps groups)
   */
  private _collectNodes(node: Konva.Node, result: Konva.Node[]): void {
    // Skip Transformer and other service objects
    const className = node.getClassName();
    const nodeName = node.name();

    // List of service names to skip
    const serviceNames = ['overlay-hit', 'ruler-', 'guide-', '_anchor', 'back', 'rotater'];
    const isServiceNode = serviceNames.some((name) => nodeName.includes(name));

    if (className === 'Transformer' || className === 'Layer' || isServiceNode) {
      return;
    }

    // If it's Group - recursively process children
    if (className === 'Group') {
      const group = node as Konva.Group;
      const children = group.getChildren();

      // If group is empty, skip it
      if (children.length === 0) {
        return;
      }

      // Unwrap children of group
      for (const child of children) {
        this._collectNodes(child, result);
      }
    } else {
      // It's a regular object (Shape, Rect, Circle and so on) - add it
      // Only if it's not a duplicate
      if (!result.includes(node)) {
        result.push(node);
      }
    }
  }

  /**
   * Merges overlapping and adjacent segments
   */
  private _mergeSegments(
    segments: { start: number; end: number }[],
  ): { start: number; end: number }[] {
    if (segments.length === 0) return [];

    // Sort segments by start
    const sorted = segments.slice().sort((a, b) => a.start - b.start);

    const first = sorted[0];
    if (!first) return [];

    const merged: { start: number; end: number }[] = [];
    let current = { start: first.start, end: first.end };

    for (let i = 1; i < sorted.length; i++) {
      const seg = sorted[i];
      if (!seg) continue;

      // If segments overlap or are adjacent (with a small gap)
      if (seg.start <= current.end + 1) {
        // Merge segments
        current.end = Math.max(current.end, seg.end);
      } else {
        // Segments do not overlap - save current and start new
        merged.push(current);
        current = { start: seg.start, end: seg.end };
      }
    }

    // Add last segment
    merged.push(current);

    return merged;
  }

  /**
   * Get list of selected Konva nodes (with group unwrapping)
   * Optimization: cache transformers
   */
  private _getSelectedKonvaNodes(): Konva.Node[] {
    if (!this._core) return [];

    const transformerNodes: Konva.Node[] = [];

    try {
      // Optimization: use transformers cache
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
      // Ignore errors
    }

    // Now unwrap groups to get individual objects
    const allNodes: Konva.Node[] = [];
    for (const node of transformerNodes) {
      this._collectNodes(node, allNodes);
    }

    return allNodes;
  }

  /**
   * Public method to force update highlights
   * Useful to call when selection changes from outside
   */
  public update() {
    this._updateHighlights();
  }
}
