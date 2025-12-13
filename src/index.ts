/**
 * Public API of Flowscape Core SDK.
 * Everything exported from here is considered a stable part of the SDK.
 */

// Core
export { CoreEngine } from './core/CoreEngine';
export type { CoreEngineOptions } from './core/CoreEngine';
export { Plugins } from './plugins/Plugins';
export { EventBus } from './utils/EventBus';

// Managers
export { CameraManager } from './managers/CameraManager';
export { HistoryManager } from './managers/HistoryManager';
export type { HistoryAction } from './managers/HistoryManager';
export { NodeManager } from './managers/NodeManager';

// Plugins
export { AreaSelectionPlugin } from './plugins/AreaSelectionPlugin';
export type { AreaSelectionPluginOptions } from './plugins/AreaSelectionPlugin';
export { CameraHotkeysPlugin } from './plugins/CameraHotkeysPlugin';
export type { CameraHotkeysOptions } from './plugins/CameraHotkeysPlugin';
export { GridPlugin } from './plugins/GridPlugin';
export type { GridPluginOptions } from './plugins/GridPlugin';
export { HistoryPlugin } from './plugins/HistoryPlugin';
export type { HistoryPluginOptions } from './plugins/HistoryPlugin';
export { LogoPlugin } from './plugins/LogoPlugin';
export type { LogoOptions } from './plugins/LogoPlugin';
export { NodeHotkeysPlugin } from './plugins/NodeHotkeysPlugin';
export type { NodeHotkeysOptions } from './plugins/NodeHotkeysPlugin';
export { RulerGuidesPlugin } from './plugins/RulerGuidesPlugin';
export type { RulerGuidesPluginOptions } from './plugins/RulerGuidesPlugin';
export { RulerHighlightPlugin } from './plugins/RulerHighlightPlugin';
export type { RulerHighlightPluginOptions } from './plugins/RulerHighlightPlugin';
export { RulerManagerPlugin } from './plugins/RulerManagerPlugin';
export type { RulerManagerPluginOptions } from './plugins/RulerManagerPlugin';
export { RulerPlugin } from './plugins/RulerPlugin';
export type { RulerPluginOptions } from './plugins/RulerPlugin';
export { SelectionPlugin } from './plugins/SelectionPlugin';
export type { SelectionPluginOptions } from './plugins/SelectionPlugin';
export { VisualGuidesPlugin } from './plugins/VisualGuidesPlugin';
export type { VisualGuidesPluginOptions } from './plugins/VisualGuidesPlugin';

// Addons
export { ImageHoverFilterAddon } from './addons/ImageHoverFilterAddon';
export { NodeAddon } from './addons/NodeAddon';
export { NodeAddons } from './addons/NodeAddons';
export { PluginAddon } from './addons/PluginAddon';
export { RulerGuidesAddon } from './addons/RulerGuidesAddon';
export { RulerHighlightAddon } from './addons/RulerHighlightAddon';
export { RulerManagerAddon } from './addons/RulerManagerAddon';
export { ShapeHoverHighlightAddon } from './addons/ShapeHoverHighlightAddon';
export { TextAutoTrimAddon } from './addons/TextAutoTrimAddon';

// Utils
export { DebounceHelper } from './utils/DebounceHelper';
export { ThrottleHelper } from './utils/ThrottleHelper';

// Public types (handle interfaces and node options)
export type {
  ArcNodeHandle,
  ArrowNodeHandle,
  CircleNodeHandle,
  EllipseNodeHandle,
  GroupNodeHandle,
  ImageNodeHandle,
  NodeAddonsHandle,
  NodeHandle,
  RegularPolygonNodeHandle,
  RingNodeHandle,
  ShapeNodeHandle,
  StarNodeHandle,
  TextNodeHandle,
} from './types/public/node-handles';

export type { ArcNodeOptions } from './nodes/ArcNode';
export type { ArrowNodeOptions } from './nodes/ArrowNode';
export type { BaseNodeOptions } from './nodes/BaseNode';
export type { CircleNodeOptions } from './nodes/CircleNode';
export type { EllipseNodeOptions } from './nodes/EllipseNode';
export type { GroupNodeOptions } from './nodes/GroupNode';
export type { ImageNodeOptions, ImageSource } from './nodes/ImageNode';
export type { RegularPolygonNodeOptions } from './nodes/RegularPolygonNode';
export type { RingNodeOptions } from './nodes/RingNode';
export type { ShapeNodeOptions } from './nodes/ShapeNode';
export type { StarNodeOptions } from './nodes/StarNode';
export type { TextNodeOptions } from './nodes/TextNode';

// Event types
export type { CoreEvents } from './types/core.events.interface';

// Konva types (for working with getKonvaNode())
export type {
  Konva,
  KonvaArc,
  KonvaArrow,
  KonvaCircle,
  KonvaEllipse,
  KonvaGroup,
  KonvaGroupConfig,
  KonvaImage,
  KonvaLayer,
  KonvaNode,
  KonvaNodeConfig,
  KonvaRegularPolygon,
  KonvaRing,
  KonvaShape,
  KonvaStage,
  KonvaStar,
  KonvaText,
} from './types/konva';
