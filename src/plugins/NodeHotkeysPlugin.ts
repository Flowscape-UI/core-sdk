import Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';

import { Plugin } from './Plugin';
import { SelectionPlugin } from './SelectionPlugin';

export interface NodeHotkeysOptions {
  target?: Window | Document | HTMLElement | EventTarget;
  ignoreEditableTargets?: boolean;
}

interface ClipboardData {
  nodes: {
    type: string;
    config: Record<string, unknown>;
    position: { x: number; y: number };
    children?: ClipboardData['nodes'];
  }[];
  // Visual center in world coordinates at the time of copying (takes into account offset/rotation/scale)
  center?: { x: number; y: number };
}

export class NodeHotkeysPlugin extends Plugin {
  private _core?: CoreEngine;
  private _options: Required<Omit<NodeHotkeysOptions, 'target'>> & { target: EventTarget };
  private _clipboard: ClipboardData | null = null;
  private _selectionPlugin?: SelectionPlugin;

  constructor(options: NodeHotkeysOptions = {}) {
    super();
    const { target = globalThis as unknown as EventTarget, ignoreEditableTargets = true } = options;

    this._options = {
      target,
      ignoreEditableTargets,
    };
  }

  protected onAttach(core: CoreEngine): void {
    this._core = core;

    // Subscribe to keydown
    this._options.target.addEventListener('keydown', this._onKeyDown as EventListener);
  }

  protected onDetach(_core: CoreEngine): void {
    this._options.target.removeEventListener('keydown', this._onKeyDown as EventListener);
    this._core = undefined as unknown as CoreEngine;
    this._selectionPlugin = undefined as unknown as SelectionPlugin;
    this._clipboard = null;
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    if (!this._core) return;

    // Lazy get SelectionPlugin on first use (robust against minification via instanceof)
    if (!this._selectionPlugin) {
      const plugin = this._core.plugins.list().find((p) => p instanceof SelectionPlugin);
      if (plugin) {
        this._selectionPlugin = plugin;
      }
    }

    if (!this._selectionPlugin) return;

    // Ignore if focus is on editable element
    if (this._options.ignoreEditableTargets && this._isEditableTarget(e.target)) {
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    // Ctrl+C - Copy
    if (ctrl && e.code === 'KeyC') {
      e.preventDefault();
      this._handleCopy();
      return;
    }

    // Ctrl+X - Cut
    if (ctrl && e.code === 'KeyX') {
      e.preventDefault();
      this._handleCut();
      return;
    }

    // Ctrl+V - Paste
    if (ctrl && e.code === 'KeyV') {
      e.preventDefault();
      this._handlePaste();
      return;
    }

    // Delete or Backspace - Delete
    if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      this._handleDelete();
      return;
    }

    // Ctrl+] or Ctrl+Shift+= - Raise z-index (moveUp)
    if (ctrl && (e.code === 'BracketRight' || (shift && e.code === 'Equal'))) {
      e.preventDefault();
      this._handleMoveUp();
      return;
    }

    // Ctrl+[ or Ctrl+Shift+- - Lower z-index (moveDown)
    if (ctrl && (e.code === 'BracketLeft' || (shift && e.code === 'Minus'))) {
      e.preventDefault();
      this._handleMoveDown();
      return;
    }
  };

  private _isEditableTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  private _handleCopy(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    const nodes = selected.map((node) => this._serializeNode(node));
    const center = this._computeSelectionWorldCenter(selected);
    this._clipboard = { nodes, center };

    // Copied successfully
    if (this._core) {
      this._core.eventBus.emit('clipboard:copy', selected);
    }
  }

  private _handleCut(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    const nodes = selected.map((node) => this._serializeNode(node));
    const center = this._computeSelectionWorldCenter(selected);
    this._clipboard = { nodes, center };

    // Delete nodes
    this._deleteNodes(selected);

    // Cut successfully
    if (this._core) {
      this._core.eventBus.emit('clipboard:cut', selected);
    }
  }

  private _handlePaste(): void {
    if (!this._core || !this._clipboard || this._clipboard.nodes.length === 0) return;
    // Determine paste position
    const pastePosition = this._getPastePosition();

    // Calculate center of copied nodes
    const clipboardCenter = this._getClipboardCenter();

    // Paste nodes with offset relative to new position
    const newNodes: BaseNode[] = [];
    for (const nodeData of this._clipboard.nodes) {
      const offsetX = nodeData.position.x - clipboardCenter.x;
      const offsetY = nodeData.position.y - clipboardCenter.y;

      const newNode = this._deserializeNode(nodeData, {
        x: pastePosition.x + offsetX,
        y: pastePosition.y + offsetY,
      });

      if (newNode) {
        newNodes.push(newNode);
      }
    }

    // Pasted successfully
    if (newNodes.length > 0) {
      this._core.eventBus.emit('clipboard:paste', newNodes);
    }
    this._core.nodes.layer.batchDraw();
  }

  private _handleDelete(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    this._deleteNodes(selected);
    // Deleted successfully
  }

  private _getSelectedNodes(): BaseNode[] {
    if (!this._selectionPlugin) return [];
    // 1) If a temporary group (_tempMultiGroup) is active, collect nodes from its children
    const tempGroup = (
      this._selectionPlugin as unknown as { _tempMultiGroup?: { getChildren?: () => unknown[] } }
    )._tempMultiGroup;
    if (tempGroup && typeof tempGroup.getChildren === 'function' && this._core) {
      const children = tempGroup.getChildren();
      const list: BaseNode[] = this._core.nodes.list();
      const set = new Set<BaseNode>();
      for (const ch of children) {
        const bn = list.find((n) => n.getNode() === ch);
        if (bn) set.add(bn);
      }
      if (set.size > 0) return Array.from(set);
    }

    // 2) Check temporary group through _tempMultiSet (multiset SelectionPlugin)
    const tempMultiSet = (this._selectionPlugin as unknown as { _tempMultiSet?: Set<BaseNode> })
      ._tempMultiSet;
    if (tempMultiSet && tempMultiSet.size > 0) {
      return Array.from(tempMultiSet);
    }

    // 3) Check single selection
    const selected = (this._selectionPlugin as unknown as { _selected?: BaseNode | null })
      ._selected;
    if (selected) {
      return [selected];
    }

    return [];
  }

  private _deleteNodes(nodes: BaseNode[]): void {
    if (!this._core) return;

    // Clear selection before deletion
    if (this._selectionPlugin) {
      const plugin = this._selectionPlugin as unknown as {
        _destroyTempMulti?: () => void;
        _clearSelection?: () => void;
      };
      if (typeof plugin._destroyTempMulti === 'function') {
        plugin._destroyTempMulti();
      }
      if (typeof plugin._clearSelection === 'function') {
        plugin._clearSelection();
      }
    }

    // Delete nodes
    for (const node of nodes) {
      this._core.nodes.remove(node);
    }
  }

  // Serialize node to buffer, position in world coordinates
  private _serializeNode(node: BaseNode): ClipboardData['nodes'][0] {
    const konvaNode = node.getNode();
    const attrs = konvaNode.getAttrs();
    // Use Konva className (robust against minification), not constructor.name
    const nodeType = this._getNodeTypeFromKonva(konvaNode as unknown as Konva.Node);

    let pos = { x: 0, y: 0 };
    if (this._core) {
      const kn = konvaNode as unknown as Konva.Node;
      const abs = kn.getAbsolutePosition();
      const inv = this._core.nodes.world.getAbsoluteTransform().copy().invert();
      const wpt = inv.point(abs);
      pos = { x: wpt.x, y: wpt.y };
    }

    const serialized: ClipboardData['nodes'][0] = {
      type: nodeType,
      config: {
        ...attrs,
        id: undefined,
      },
      position: pos,
    };

    // If it's a group, serialize child elements
    if (nodeType === 'group') {
      const gKn = konvaNode as unknown as Konva.Group;
      const children = gKn.getChildren();
      const serializedChildren: ClipboardData['nodes'] = [];

      for (const child of children) {
        // Serialize each child Konva.Node directly
        const childSerialized = this._serializeKonvaNode(child as unknown as Konva.Node);
        if (childSerialized) {
          serializedChildren.push(childSerialized);
        }
      }

      if (serializedChildren.length > 0) {
        serialized.children = serializedChildren;
      }
    }

    return serialized;
  }

  // Serialize Konva.Node (not BaseNode) for group children
  private _serializeKonvaNode(kn: Konva.Node): ClipboardData['nodes'][0] | null {
    if (!this._core) return null;

    const attrs = kn.getAttrs();
    const className = kn.getClassName();

    // Define type of className Konva (Rect -> shape, Circle -> circle, etc.)
    let nodeType = className.toLowerCase();
    if (nodeType === 'rect') nodeType = 'shape';

    // For group children, save RELATIVE positions (x, y inside group)
    const serialized: ClipboardData['nodes'][0] = {
      type: nodeType,
      config: {
        ...attrs,
        id: undefined,
      },
      position: { x: kn.x(), y: kn.y() }, // Relative coordinates inside group
    };

    // Recursively process nested groups
    if (kn instanceof Konva.Group) {
      const children = kn.getChildren();
      const serializedChildren: ClipboardData['nodes'] = [];

      for (const child of children) {
        const childSerialized = this._serializeKonvaNode(child as unknown as Konva.Node);
        if (childSerialized) {
          serializedChildren.push(childSerialized);
        }
      }

      if (serializedChildren.length > 0) {
        serialized.children = serializedChildren;
      }
    }

    return serialized;
  }

  // Get node type from Konva className (robust against minification)
  private _getNodeTypeFromKonva(kn: Konva.Node): string {
    const className = kn.getClassName();
    // Map Konva class names to our internal types
    const typeMap: Record<string, string> = {
      Rect: 'shape',
      Circle: 'circle',
      Ellipse: 'ellipse',
      Text: 'text',
      Image: 'image',
      Group: 'group',
      Arc: 'arc',
      Star: 'star',
      Arrow: 'arrow',
      Ring: 'ring',
      RegularPolygon: 'regularPolygon',
      Label: 'label',
    };
    return typeMap[className] ?? className.toLowerCase();
  }

  private _deserializeNode(
    data: ClipboardData['nodes'][0],
    position: { x: number; y: number },
  ): BaseNode | null {
    if (!this._core) return null;

    // Remove zIndex from config, as it will be set automatically
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { zIndex, ...configWithoutZIndex } = data.config;

    const config = {
      ...configWithoutZIndex,
      x: position.x,
      y: position.y,
    };

    try {
      let newNode: BaseNode | null = null;

      switch (data.type) {
        case 'shape':
          newNode = this._core.nodes.addShape(config);
          break;
        case 'text':
          newNode = this._core.nodes.addText(config);
          break;
        case 'circle':
          newNode = this._core.nodes.addCircle(config);
          break;
        case 'ellipse':
          newNode = this._core.nodes.addEllipse(config);
          break;
        case 'arc':
          newNode = this._core.nodes.addArc(config);
          break;
        case 'star':
          newNode = this._core.nodes.addStar(config);
          break;
        case 'arrow':
          newNode = this._core.nodes.addArrow(config);
          break;
        case 'ring':
          newNode = this._core.nodes.addRing(config);
          break;
        case 'regularPolygon':
        case 'regularpolygon':
          newNode = this._core.nodes.addRegularPolygon(config);
          break;
        case 'image':
          newNode = this._core.nodes.addImage(config);
          break;
        case 'label':
          // LabelNode пока не поддерживается через NodeManager
          globalThis.console.warn('LabelNode is not supported for copy/paste yet');
          return null;
        case 'group': {
          newNode = this._core.nodes.addGroup(config);
          // Принудительно применяем все атрибуты трансформации после создания
          const groupKonvaNode = newNode.getNode() as unknown as Konva.Group;
          // Применяем масштаб, поворот и другие атрибуты
          if (data.config['scaleX'] !== undefined)
            groupKonvaNode.scaleX(data.config['scaleX'] as number);
          if (data.config['scaleY'] !== undefined)
            groupKonvaNode.scaleY(data.config['scaleY'] as number);
          if (data.config['rotation'] !== undefined)
            groupKonvaNode.rotation(data.config['rotation'] as number);
          if (data.config['skewX'] !== undefined)
            groupKonvaNode.skewX(data.config['skewX'] as number);
          if (data.config['skewY'] !== undefined)
            groupKonvaNode.skewY(data.config['skewY'] as number);
          if (data.config['offsetX'] !== undefined)
            groupKonvaNode.offsetX(data.config['offsetX'] as number);
          if (data.config['offsetY'] !== undefined)
            groupKonvaNode.offsetY(data.config['offsetY'] as number);

          // CRITICAL FIX: restore ALL child elements through NodeManager
          // This ensures that they can be accessed through double-click
          if (data.children && data.children.length > 0) {
            for (const childData of data.children) {
              // Create ANY child node (group or regular) through _deserializeNode
              // This registers it in NodeManager and makes it available
              const childBaseNode = this._deserializeNode(childData, {
                x: childData.position.x,
                y: childData.position.y,
              });
              if (childBaseNode) {
                const childKonvaNode = childBaseNode.getNode();
                // Disable draggable for child elements
                if (typeof childKonvaNode.draggable === 'function') {
                  childKonvaNode.draggable(false);
                }
                // Move from world to parent group
                childKonvaNode.moveTo(groupKonvaNode);
              }
            }
          }
          break;
        }
        default:
          globalThis.console.warn(`Unknown node type: ${data.type}`);
          return null;
      }

      // Apply transformation attributes for ALL node types
      const konvaNode = newNode.getNode() as unknown as Konva.Node;
      if (data.config['scaleX'] !== undefined) konvaNode.scaleX(data.config['scaleX'] as number);
      if (data.config['scaleY'] !== undefined) konvaNode.scaleY(data.config['scaleY'] as number);
      if (data.config['rotation'] !== undefined)
        konvaNode.rotation(data.config['rotation'] as number);
      if (data.config['skewX'] !== undefined) konvaNode.skewX(data.config['skewX'] as number);
      if (data.config['skewY'] !== undefined) konvaNode.skewY(data.config['skewY'] as number);
      if (data.config['offsetX'] !== undefined) konvaNode.offsetX(data.config['offsetX'] as number);
      if (data.config['offsetY'] !== undefined) konvaNode.offsetY(data.config['offsetY'] as number);

      return newNode;
    } catch (error) {
      globalThis.console.error(`Failed to deserialize node:`, error);
      return null;
    }
  }

  private _getPastePosition(): { x: number; y: number } {
    if (!this._core) return { x: 0, y: 0 };

    const stage = this._core.stage;
    const pointer = stage.getPointerPosition();

    // Check if cursor is on screen and within canvas
    if (pointer && this._isPointerOnScreen(pointer)) {
      const world = this._core.nodes.world;
      const worldTransform = world.getAbsoluteTransform().copy().invert();
      const worldPos = worldTransform.point(pointer);
      return { x: worldPos.x, y: worldPos.y };
    }

    // If cursor is not on screen or out of bounds - paste in the center of the screen
    return this._getScreenCenter();
  }

  private _isPointerOnScreen(pointer: { x: number; y: number }): boolean {
    if (!this._core) return false;
    const stage = this._core.stage;
    const width = stage.width();
    const height = stage.height();
    return pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
  }

  private _getScreenCenter(): { x: number; y: number } {
    if (!this._core) return { x: 0, y: 0 };

    const stage = this._core.stage;
    const world = this._core.nodes.world;

    const centerX = stage.width() / 2;
    const centerY = stage.height() / 2;

    const worldTransform = world.getAbsoluteTransform().copy().invert();
    const worldPos = worldTransform.point({ x: centerX, y: centerY });

    return { x: worldPos.x, y: worldPos.y };
  }

  private _getClipboardCenter(): { x: number; y: number } {
    if (!this._clipboard || this._clipboard.nodes.length === 0) {
      return { x: 0, y: 0 };
    }
    // If exact visual center is saved, use it
    if (this._clipboard.center) return this._clipboard.center;
    // Fallback: average of positions
    let sumX = 0;
    let sumY = 0;
    for (const node of this._clipboard.nodes) {
      sumX += node.position.x;
      sumY += node.position.y;
    }
    return { x: sumX / this._clipboard.nodes.length, y: sumY / this._clipboard.nodes.length };
  }

  // Calculate visual bbox of selected nodes and return its center in world coordinates
  private _computeSelectionWorldCenter(nodes: BaseNode[]): { x: number; y: number } {
    if (!this._core || nodes.length === 0) return { x: 0, y: 0 };
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const n of nodes) {
      const kn = n.getNode() as unknown as Konva.Node;
      // clientRect already accounts for all transformations (except default stroke — not critical for us)
      const r = kn.getClientRect({ skipShadow: true, skipStroke: true });
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return { x: 0, y: 0 };
    }

    // Center of bbox is now in stage coordinates. Convert to world coordinates.
    const cxStage = (minX + maxX) / 2;
    const cyStage = (minY + maxY) / 2;
    const world = this._core.nodes.world;
    const invWorld = world.getAbsoluteTransform().copy().invert();
    const ptWorld = invWorld.point({ x: cxStage, y: cyStage });
    return { x: ptWorld.x, y: ptWorld.y };
  }

  // Raise z-index of selected node (increment by 1)
  private _handleMoveUp(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    // Move each selected node one level forward
    for (const node of selected) {
      const konvaNode = node.getNode() as unknown as Konva.Node;

      // Skip changing z-index for single node inside a real group
      if (this._isNodeInsidePermanentGroup(konvaNode)) {
        continue;
      }

      const oldIndex = konvaNode.zIndex();
      konvaNode.moveUp();
      const newIndex = konvaNode.zIndex();

      // Check if z-index change is possible (for nodes inside groups)
      this._syncGroupZIndex(konvaNode);

      // Emit z-index change event
      if (this._core && oldIndex !== newIndex) {
        this._core.eventBus.emit('node:zIndexChanged', node, oldIndex, newIndex);
      }
    }

    if (this._core) {
      // Force redraw of the entire layer
      this._core.nodes.layer.draw();

      // Also redraw stage to update transformer
      this._core.stage.batchDraw();
    }
  }

  // Lower z-index of selected node (decrement by 1)
  private _handleMoveDown(): void {
    const selected = this._getSelectedNodes();
    if (selected.length === 0) return;

    // Move each selected node one level backward (in reverse order to avoid conflicts)
    for (let i = selected.length - 1; i >= 0; i--) {
      const node = selected[i];
      if (!node) continue;
      const konvaNode = node.getNode() as unknown as Konva.Node;

      // Skip changing z-index for single node inside a real group
      if (this._isNodeInsidePermanentGroup(konvaNode)) {
        continue;
      }

      const oldIndex = konvaNode.zIndex();
      konvaNode.moveDown();
      const newIndex = konvaNode.zIndex();

      // Check if z-index change is possible (for nodes inside groups)
      this._syncGroupZIndex(konvaNode);

      // Emit z-index change event
      if (this._core && oldIndex !== newIndex) {
        this._core.eventBus.emit('node:zIndexChanged', node, oldIndex, newIndex);
      }
    }

    if (this._core) {
      // Force redraw of the entire layer
      this._core.nodes.layer.draw();

      // Also redraw stage to update transformer
      this._core.stage.batchDraw();
    }
  }

  /**
   * Checks if the node is inside a real group (not the group itself)
   */
  private _isNodeInsidePermanentGroup(konvaNode: Konva.Node): boolean {
    // If it's the group itself, allow z-index change
    if (konvaNode instanceof Konva.Group) {
      return false;
    }

    const parent = konvaNode.getParent();
    if (!parent) return false;

    // If parent is a group (not world) - it's a real group
    return parent instanceof Konva.Group && parent.name() !== 'world';
  }

  /**
   * Checks if the node is inside a real group
   * - For group itself — do nothing (moveUp/moveDown already applied to the group)
   * - For node inside group — FORBIDDEN to change z-index
   */
  private _syncGroupZIndex(konvaNode: Konva.Node): void {
    const parent = konvaNode.getParent();
    if (!parent) return;

    // If it's the group itself, do nothing (moveUp/moveDown already applied to the group)
    // Children keep their relative order inside the group
    if (konvaNode instanceof Konva.Group) {
      return;
    }

    // If node inside group — FORBIDDEN to change z-index
    // Need to change z-index of the group, not individual nodes
    if (parent instanceof Konva.Group && parent.name() !== 'world') {
      // z-index change forbidden for nodes inside group
      return;
    }
  }
}
