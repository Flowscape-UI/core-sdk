import Konva from "konva";
import type { Point } from "../../../../camera";
import type { WorldCorners } from "../types";

export function mid(a: Point, b: Point): Point {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function norm(v: Point): Point {
    const len = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / len, y: v.y / len };
}

export function centerFromCorners(c: WorldCorners): Point {
    const [tl, tr, br, bl] = c;
    return mid(mid(tl, tr), mid(bl, br));
}

export function normalizeAngle(a: number): number {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}

export function getNodeWorldCorners(node: Konva.Node, worldRoot: Konva.Group): WorldCorners {
    // локальный AABB ноды (без её transform)
    const r = node.getClientRect({ skipTransform: true });

    const local: Point[] = [
        { x: r.x, y: r.y },                       // tl
        { x: r.x + r.width, y: r.y },             // tr
        { x: r.x + r.width, y: r.y + r.height },  // br
        { x: r.x, y: r.y + r.height },            // bl
    ];

    // 1) local -> STAGE (включая камеру)
    const nodeAbs = node.getAbsoluteTransform();

    // 2) STAGE -> WORLD (убираем камеру)
    const worldAbs = worldRoot.getAbsoluteTransform().copy().invert();

    const world = local.map((p) => {
        const stageP = nodeAbs.point(p);
        const w = worldAbs.point(stageP);
        return { x: w.x, y: w.y };
    });

    return world as WorldCorners;
}