import type { BaseNode } from '../nodes/BaseNode';

/**
 * Типизированные события CoreEngine
 * Все события строго типизированы для лучшего DX
 */
export interface CoreEvents {
  // === Node Events ===
  /** Нода была создана и добавлена в мир */
  'node:created': [node: BaseNode];
  /** Нода была удалена из мира */
  'node:removed': [node: BaseNode];
  /** Нода была выделена */
  'node:selected': [node: BaseNode];
  /** Выделение ноды было снято */
  'node:deselected': [node: BaseNode];
  /** Нода была изменена (position, size, rotation, etc.) */
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
  /** Z-index ноды был изменён */
  'node:zIndexChanged': [node: BaseNode, oldIndex: number, newIndex: number];

  // === Group Events ===
  /** Группа была создана */
  'group:created': [group: BaseNode, nodes: BaseNode[]];
  /** Группа была разгруппирована */
  'group:ungrouped': [group: BaseNode, nodes: BaseNode[]];

  // === Selection Events ===
  /** Множественное выделение создано */
  'selection:multi:created': [nodes: BaseNode[]];
  /** Множественное выделение уничтожено */
  'selection:multi:destroyed': [];
  /** Выделение полностью снято */
  'selection:cleared': [];

  // === Copy/Paste Events ===
  /** Ноды были скопированы в буфер обмена */
  'clipboard:copy': [nodes: BaseNode[]];
  /** Ноды были вырезаны в буфер обмена */
  'clipboard:cut': [nodes: BaseNode[]];
  /** Ноды были вставлены из буфера обмена */
  'clipboard:paste': [nodes: BaseNode[]];

  // === Camera Events ===
  /** Зум был изменён программно */
  'camera:setZoom': [{ scale: number }];
  /** Зум был изменён пользователем (колесо мыши) */
  'camera:zoom': [{ scale: number; position: { x: number; y: number } }];
  /** Камера была сброшена */
  'camera:reset': [];
  /** Шаг зума был изменён */
  'camera:zoomStep': [{ zoomStep: number }];
  /** Шаг панорамирования был изменён */
  'camera:panStep': [{ panStep: number }];
  /** Камера была перемещена (панорамирование) */
  'camera:pan': [{ dx: number; dy: number; position: { x: number; y: number } }];

  // === Plugin Events ===
  /** Плагин был добавлен */
  'plugin:added': [pluginName: string];
  /** Плагин был удалён */
  'plugin:removed': [pluginName: string];

  // === Stage Events ===
  /** Stage был изменён (resize) */
  'stage:resized': [{ width: number; height: number }];
}
