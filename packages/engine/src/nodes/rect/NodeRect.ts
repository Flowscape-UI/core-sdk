import type { ID } from "../../core/types";
import { MathF32 } from "../../core/math";
import type { Vector2 } from "../../core/transform/types";
import type { Rect } from "../base";
import { NodeType } from "../base";
import { ShapeBase, type ShapePathCommand } from "../shape";
import { matrixInvert } from "../utils/matrix-invert";
import { type INodeRect } from "./types";

export class NodeRect extends ShapeBase implements INodeRect {
    constructor(id: ID, name?: string, type?: NodeType) {
        super(id, type ?? NodeType.Rect, name ?? "Rect");
    }

    public override hitTest(worldPoint: Vector2): boolean {
        const bounds = this.getWorldViewAABB();

        if (
            worldPoint.x < bounds.x ||
            worldPoint.x > bounds.x + bounds.width ||
            worldPoint.y < bounds.y ||
            worldPoint.y > bounds.y + bounds.height
        ) {
            return false;
        }

        try {
            const invMatrix = matrixInvert(this.getWorldMatrix());
            const localPoint = this._applyMatrixToPoint(invMatrix, worldPoint);

            const local = this.getLocalOBB();
            const view = this.getLocalViewOBB();
            const cornerRadius = this.getCornerRadius();
            const outset = this._getViewOutset(local, view);

            const normalized = this._normalizeCornerRadii(view, {
                tlx: cornerRadius.tl + outset.l,
                tly: cornerRadius.tl + outset.t,
                trx: cornerRadius.tr + outset.r,
                try: cornerRadius.tr + outset.t,
                brx: cornerRadius.br + outset.r,
                bry: cornerRadius.br + outset.b,
                blx: cornerRadius.bl + outset.l,
                bly: cornerRadius.bl + outset.b,
            });

            return this._isPointInsideRoundedRect(localPoint, view, normalized);
        } catch {
            return false;
        }
    }

    public override toPathCommands(): readonly ShapePathCommand[] {
        const local = this.getLocalOBB();
        const view = this.getLocalViewOBB();
        const cornerRadius = this.getCornerRadius();
        const outset = this._getViewOutset(local, view);

        const viewPath = this._buildRoundedRectPath(view, {
            tlx: cornerRadius.tl + outset.l,
            tly: cornerRadius.tl + outset.t,
            trx: cornerRadius.tr + outset.r,
            try: cornerRadius.tr + outset.t,
            brx: cornerRadius.br + outset.r,
            bry: cornerRadius.br + outset.b,
            blx: cornerRadius.bl + outset.l,
            bly: cornerRadius.bl + outset.b,
        });

        return viewPath;
    }

    private _buildRoundedRectPath(
        bounds: Rect,
        radii: {
            tlx: number;
            tly: number;
            trx: number;
            try: number;
            brx: number;
            bry: number;
            blx: number;
            bly: number;
        },
    ): ShapePathCommand[] {
        const normalized = this._normalizeCornerRadii(bounds, radii);

        const x = bounds.x;
        const y = bounds.y;
        const w = bounds.width;
        const h = bounds.height;

        const commands: ShapePathCommand[] = [];

        commands.push({
            type: "moveTo",
            point: { x: MathF32.add(x, normalized.tlx), y },
        });

        commands.push({
            type: "lineTo",
            point: { x: MathF32.sub(MathF32.add(x, w), normalized.trx), y },
        });
        this._pushCornerArc(
            commands,
            { x: MathF32.sub(MathF32.add(x, w), normalized.trx), y: MathF32.add(y, normalized.try) },
            normalized.trx,
            normalized.try,
            -90,
            0,
        );

        commands.push({
            type: "lineTo",
            point: { x: MathF32.add(x, w), y: MathF32.sub(MathF32.add(y, h), normalized.bry) },
        });
        this._pushCornerArc(
            commands,
            { x: MathF32.sub(MathF32.add(x, w), normalized.brx), y: MathF32.sub(MathF32.add(y, h), normalized.bry) },
            normalized.brx,
            normalized.bry,
            0,
            90,
        );

        commands.push({
            type: "lineTo",
            point: { x: MathF32.add(x, normalized.blx), y: MathF32.add(y, h) },
        });
        this._pushCornerArc(
            commands,
            { x: MathF32.add(x, normalized.blx), y: MathF32.sub(MathF32.add(y, h), normalized.bly) },
            normalized.blx,
            normalized.bly,
            90,
            180,
        );

        commands.push({
            type: "lineTo",
            point: { x, y: MathF32.add(y, normalized.tly) },
        });
        this._pushCornerArc(
            commands,
            { x: MathF32.add(x, normalized.tlx), y: MathF32.add(y, normalized.tly) },
            normalized.tlx,
            normalized.tly,
            180,
            270,
        );

        commands.push({ type: "closePath" });
        return commands;
    }

    private _pushCornerArc(
        commands: ShapePathCommand[],
        center: { x: number; y: number },
        radiusX: number,
        radiusY: number,
        startAngle: number,
        endAngle: number,
    ): void {
        if (radiusX <= 0 || radiusY <= 0) {
            return;
        }

        commands.push({
            type: "arcTo",
            center,
            radiusX,
            radiusY,
            startAngle,
            endAngle,
            clockwise: true,
        });
    }

    private _normalizeCornerRadii(
        bounds: Rect,
        radii: {
            tlx: number;
            tly: number;
            trx: number;
            try: number;
            brx: number;
            bry: number;
            blx: number;
            bly: number;
        },
    ): {
        tlx: number;
        tly: number;
        trx: number;
        try: number;
        brx: number;
        bry: number;
        blx: number;
        bly: number;
    } {
        const clamped = {
            tlx: MathF32.max(0, radii.tlx),
            tly: MathF32.max(0, radii.tly),
            trx: MathF32.max(0, radii.trx),
            try: MathF32.max(0, radii.try),
            brx: MathF32.max(0, radii.brx),
            bry: MathF32.max(0, radii.bry),
            blx: MathF32.max(0, radii.blx),
            bly: MathF32.max(0, radii.bly),
        };

        const width = MathF32.max(0, bounds.width);
        const height = MathF32.max(0, bounds.height);

        const scaleXTop = clamped.tlx + clamped.trx > 0
            ? width / (clamped.tlx + clamped.trx)
            : 1;
        const scaleXBottom = clamped.blx + clamped.brx > 0
            ? width / (clamped.blx + clamped.brx)
            : 1;
        const scaleYLeft = clamped.tly + clamped.bly > 0
            ? height / (clamped.tly + clamped.bly)
            : 1;
        const scaleYRight = clamped.try + clamped.bry > 0
            ? height / (clamped.try + clamped.bry)
            : 1;

        const scaleX = MathF32.min(scaleXTop, scaleXBottom);
        const scaleY = MathF32.min(scaleYLeft, scaleYRight);
        const scale = MathF32.min(1, MathF32.min(scaleX, scaleY));

        return {
            tlx: MathF32.mul(clamped.tlx, scale),
            tly: MathF32.mul(clamped.tly, scale),
            trx: MathF32.mul(clamped.trx, scale),
            try: MathF32.mul(clamped.try, scale),
            brx: MathF32.mul(clamped.brx, scale),
            bry: MathF32.mul(clamped.bry, scale),
            blx: MathF32.mul(clamped.blx, scale),
            bly: MathF32.mul(clamped.bly, scale),
        };
    }

    private _getViewOutset(local: Rect, localView: Rect): {
        t: number;
        r: number;
        b: number;
        l: number;
    } {
        const right = local.x + local.width;
        const bottom = local.y + local.height;
        const viewRight = localView.x + localView.width;
        const viewBottom = localView.y + localView.height;

        return {
            l: MathF32.max(0, local.x - localView.x),
            t: MathF32.max(0, local.y - localView.y),
            r: MathF32.max(0, viewRight - right),
            b: MathF32.max(0, viewBottom - bottom),
        };
    }

    private _isPointInsideRoundedRect(
        point: Vector2,
        bounds: Rect,
        radii: {
            tlx: number;
            tly: number;
            trx: number;
            try: number;
            brx: number;
            bry: number;
            blx: number;
            bly: number;
        },
    ): boolean {
        const x = bounds.x;
        const y = bounds.y;
        const w = bounds.width;
        const h = bounds.height;

        const px = point.x;
        const py = point.y;

        if (px < x || px > x + w || py < y || py > y + h) {
            return false;
        }

        if (px < x + radii.tlx && py < y + radii.tly) {
            return this._isInsideCornerEllipse(
                px,
                py,
                x + radii.tlx,
                y + radii.tly,
                radii.tlx,
                radii.tly,
            );
        }

        if (px > x + w - radii.trx && py < y + radii.try) {
            return this._isInsideCornerEllipse(
                px,
                py,
                x + w - radii.trx,
                y + radii.try,
                radii.trx,
                radii.try,
            );
        }

        if (px > x + w - radii.brx && py > y + h - radii.bry) {
            return this._isInsideCornerEllipse(
                px,
                py,
                x + w - radii.brx,
                y + h - radii.bry,
                radii.brx,
                radii.bry,
            );
        }

        if (px < x + radii.blx && py > y + h - radii.bly) {
            return this._isInsideCornerEllipse(
                px,
                py,
                x + radii.blx,
                y + h - radii.bly,
                radii.blx,
                radii.bly,
            );
        }

        return true;
    }

    private _isInsideCornerEllipse(
        px: number,
        py: number,
        cx: number,
        cy: number,
        rx: number,
        ry: number,
    ): boolean {
        if (rx <= 0 || ry <= 0) {
            return true;
        }

        const nx = (px - cx) / rx;
        const ny = (py - cy) / ry;

        return nx * nx + ny * ny <= 1;
    }
}
