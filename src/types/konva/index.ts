import Konva from 'konva';

export type KonvaNode = Konva.Node;
export type KonvaShape = Konva.Shape;
export type KonvaGroup = Konva.Group;
export type KonvaLayer = Konva.Layer;
export type KonvaStage = Konva.Stage;
export type KonvaText = Konva.Text;
export type KonvaImage = Konva.Image;
export type KonvaCircle = Konva.Circle;
export type KonvaEllipse = Konva.Ellipse;
export type KonvaArc = Konva.Arc;
export type KonvaArrow = Konva.Arrow;
export type KonvaStar = Konva.Star;
export type KonvaRing = Konva.Ring;
export type KonvaRegularPolygon = Konva.RegularPolygon;

export type KonvaNodeConfig = Konva.NodeConfig;
export type KonvaGroupConfig = Konva.GroupConfig;

/**
 * Нарративное API для прямого доступа к Konva (например, константы, класс Node).
 * Используйте осторожно; более безопасный путь — `node.getKonvaNode()`.
 */
export { Konva };
