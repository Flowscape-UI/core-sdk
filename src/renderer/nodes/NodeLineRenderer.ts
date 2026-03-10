import Konva from 'konva';
import type { LineCapType, LineEndingType, NodeLine } from '../../nodes-new';

type Point = { x: number; y: number };

function getLineAngle(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x);
}

function getDistance(start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function getUnitVector(start: Point, end: Point): Point {
    const distance = getDistance(start, end);

    if (distance === 0) {
        return { x: 1, y: 0 };
    }

    return {
        x: (end.x - start.x) / distance,
        y: (end.y - start.y) / distance,
    };
}

function getPerpendicular(v: Point): Point {
    return {
        x: -v.y,
        y: v.x,
    };
}

function offsetPoint(point: Point, direction: Point, distance: number): Point {
    return {
        x: point.x + direction.x * distance,
        y: point.y + direction.y * distance,
    };
}


export class NodeLineRenderer {
    private readonly node: NodeLine;
    private readonly group: Konva.Group;
    private readonly mainLine: Konva.Line;

    constructor(node: NodeLine) {
        this.node = node;

        this.group = new Konva.Group();
        this.mainLine = new Konva.Line();

        this.group.add(this.mainLine);

        this.sync();
    }

    public getShape(): Konva.Group {
        return this.group;
    }

    public sync(): void {
        const pos = this.node.getPosition();
        const scale = this.node.getScale();

        const rawStart = this.node.getStartPoint();
        const rawEnd = this.node.getEndPoint();

        const direction = getUnitVector(rawStart, rawEnd);

        const startOffset = this.getEndingOffset(this.node.getStartEnding());
        const endOffset = this.getEndingOffset(this.node.getEndEnding());

        const lineStart = offsetPoint(rawStart, direction, startOffset);
        const lineEnd = offsetPoint(rawEnd, direction, -endOffset);

        this.group.x(pos.x);
        this.group.y(pos.y);
        this.group.scaleX(scale.x);
        this.group.scaleY(scale.y);

        this.group.destroyChildren();
        this.group.add(this.mainLine);

        // основная линия
        this.syncMainLine(lineStart, lineEnd);

        // caps ставим на укороченную линию
        this.renderCap(lineStart, lineEnd, true, this.node.getLineCapStart());
        this.renderCap(lineStart, lineEnd, false, this.node.getLineCapEnd());

        // endings ставим на реальные концы
        this.renderEnding(rawStart, rawEnd, true, this.node.getStartEnding());
        this.renderEnding(rawStart, rawEnd, false, this.node.getEndEnding());
    }

    private syncMainLine(start: Point, end: Point): void {
        this.mainLine.points([start.x, start.y, end.x, end.y]);
        this.mainLine.stroke(this.node.getStroke());
        this.mainLine.strokeWidth(this.node.getThickness());
        this.mainLine.lineCap('butt');
    }

    private renderCap(start: Point, end: Point, isStart: boolean, cap: LineCapType): void {
        if (cap === 'none') return;

        const thickness = this.node.getThickness();
        const point = isStart ? start : end;
        const direction = isStart ? getUnitVector(end, start) : getUnitVector(start, end);

        if (cap === 'round') {
            const circle = new Konva.Circle({
                x: point.x,
                y: point.y,
                radius: thickness / 2,
                fill: this.node.getStroke(),
                listening: false,
            });

            this.group.add(circle);
            return;
        }

        if (cap === 'square') {
            const perp = getPerpendicular(direction);
            const half = thickness / 2;

            const p1 = {
                x: point.x - perp.x * half,
                y: point.y - perp.y * half,
            };
            const p2 = {
                x: point.x + perp.x * half,
                y: point.y + perp.y * half,
            };
            const p3 = {
                x: p2.x + direction.x * thickness,
                y: p2.y + direction.y * thickness,
            };
            const p4 = {
                x: p1.x + direction.x * thickness,
                y: p1.y + direction.y * thickness,
            };

            const rectCap = new Konva.Line({
                points: [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y],
                closed: true,
                fill: this.node.getStroke(),
                strokeWidth: 0,
                listening: false,
            });

            this.group.add(rectCap);
        }
    }

    private getEndingOffset(ending: LineEndingType): number {
    const thickness = this.node.getThickness();
    const size = Math.max(8, thickness * 2.2);

    switch (ending) {
        case 'none':
            return 0;

        case 'circle-arrow':
            return size * 0.35;

        case 'line-arrow':
            return size * 0.2;
        case 'triangle-arrow':
        case 'reversed-triangle':
        case 'diamond-arrow':
            return size;

        default:
            return 0;
    }
}

    private renderEnding(start: Point, end: Point, isStart: boolean, ending: LineEndingType): void {
        if (ending === 'none') return;

        const point = isStart ? start : end;
        const direction = isStart ? getUnitVector(end, start) : getUnitVector(start, end);
        const perp = getPerpendicular(direction);

        const thickness = this.node.getThickness();
        const size = Math.max(8, thickness * 2.2);

        if (ending === 'line-arrow') {
            const p1 = {
                x: point.x - direction.x * size + perp.x * (size * 0.45),
                y: point.y - direction.y * size + perp.y * (size * 0.45),
            };

            const p2 = point;

            const p3 = {
                x: point.x - direction.x * size - perp.x * (size * 0.45),
                y: point.y - direction.y * size - perp.y * (size * 0.45),
            };

            const arrow = new Konva.Line({
                points: [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y],
                stroke: this.node.getStroke(),
                strokeWidth: thickness,
                lineCap: 'round',
                lineJoin: 'round',
                listening: false,
            });

            this.group.add(arrow);
            return;
        }

        if (ending === 'triangle-arrow' || ending === 'reversed-triangle') {
            const tip = ending === 'triangle-arrow'
                ? point
                : {
                    x: point.x - direction.x * size,
                    y: point.y - direction.y * size,
                };

            const baseCenter = ending === 'triangle-arrow'
                ? {
                    x: point.x - direction.x * size,
                    y: point.y - direction.y * size,
                }
                : point;

            const left = {
                x: baseCenter.x + perp.x * (size * 0.5),
                y: baseCenter.y + perp.y * (size * 0.5),
            };

            const right = {
                x: baseCenter.x - perp.x * (size * 0.5),
                y: baseCenter.y - perp.y * (size * 0.5),
            };

            const triangle = new Konva.Line({
                points: [tip.x, tip.y, left.x, left.y, right.x, right.y],
                closed: true,
                fill: this.node.getStroke(),
                strokeWidth: 0,
                listening: false,
            });

            this.group.add(triangle);
            return;
        }

        if (ending === 'circle-arrow') {
            const circle = new Konva.Circle({
                x: point.x,
                y: point.y,
                radius: size * 0.35,
                fill: this.node.getStroke(),
                listening: false,
            });

            this.group.add(circle);
            return;
        }

        if (ending === 'diamond-arrow') {
            const front = point;
            const back = {
                x: point.x - direction.x * size,
                y: point.y - direction.y * size,
            };
            const left = {
                x: point.x - direction.x * (size * 0.5) + perp.x * (size * 0.45),
                y: point.y - direction.y * (size * 0.5) + perp.y * (size * 0.45),
            };
            const right = {
                x: point.x - direction.x * (size * 0.5) - perp.x * (size * 0.45),
                y: point.y - direction.y * (size * 0.5) - perp.y * (size * 0.45),
            };

            const diamond = new Konva.Line({
                points: [front.x, front.y, left.x, left.y, back.x, back.y, right.x, right.y],
                closed: true,
                fill: this.node.getStroke(),
                strokeWidth: 0,
                listening: false,
            });

            this.group.add(diamond);
        }
    }
}