import type { BaseNode } from '../nodes/BaseNode';

/**
 * Typed CoreEngine events
 * All events are strictly typed for better DX
 */
export interface CoreEvents {
  // === Node Events ===
  /** Node was created and added to the world */
  'node:created': [node: BaseNode];
  /** Node was removed from the world */
  'node:removed': [node: BaseNode];
  /** Node was selected */
  'node:selected': [node: BaseNode];
  /** Node was deselected */
  'node:deselected': [node: BaseNode];
  /** Node was transformed (position, size, rotation, etc.) */
  'node:transformed': [
    node: BaseNode,
    changes: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      scaleX?: number;
      scaleY?: number;
    },
  ];
  /** Node z-index was changed */
  'node:zIndexChanged': [node: BaseNode, oldIndex: number, newIndex: number];

  // === Group Events ===
  /** Group was created */
  'group:created': [group: BaseNode, nodes: BaseNode[]];
  /** Group was ungrouped */
  'group:ungrouped': [group: BaseNode, nodes: BaseNode[]];

  // === Selection Events ===
  /** Multi-selection was created */
  'selection:multi:created': [nodes: BaseNode[]];
  /** Multi-selection was destroyed */
  'selection:multi:destroyed': [];
  /** Selection was completely cleared */
  'selection:cleared': [];

  // === Copy/Paste Events ===
  /** Nodes were copied to clipboard */
  'clipboard:copy': [nodes: BaseNode[]];
  /** Nodes were cut to clipboard */
  'clipboard:cut': [nodes: BaseNode[]];
  /** Nodes were pasted from clipboard */
  'clipboard:paste': [nodes: BaseNode[]];

  // === Camera Events ===
  /** Zoom was changed programmatically */
  'camera:setZoom': [{ scale: number }];
  /** Zoom was changed by user (mouse wheel) */
  'camera:zoom': [{ scale: number; position: { x: number; y: number } }];
  /** Camera was reset */
  'camera:reset': [];
  /** Zoom step was changed */
  'camera:zoomStep': [{ zoomStep: number }];
  /** Pan step was changed */
  'camera:panStep': [{ panStep: number }];
  /** Camera was moved (panning) */
  'camera:pan': [{ dx: number; dy: number; position: { x: number; y: number } }];

  // === Plugin Events ===
  /** Plugin was added */
  'plugin:added': [pluginName: string];
  /** Plugin was removed */
  'plugin:removed': [pluginName: string];

  // === Persistence Events ===
  /** Persistence restore failed */
  'persistence:restore:error': [{ error: string }];
  /** Persistence restore completed */
  'persistence:restore:done': [];

  // === Stage Events ===
  /** Stage was resized */
  'stage:resized': [{ width: number; height: number }];
}
