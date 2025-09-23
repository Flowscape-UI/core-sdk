import type { BaseNode } from '../nodes/BaseNode';

export interface CoreEvents {
  'node:removed': [node: BaseNode];
  'camera:setZoom': [{ scale: number }];
  'camera:zoom': [{ scale: number; position: { x: number; y: number } }];
  'camera:reset': [];
  'camera:zoomStep': [{ zoomStep: number }];
  'camera:panStep': [{ panStep: number }];
}
