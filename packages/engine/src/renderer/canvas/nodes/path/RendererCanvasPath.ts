import Konva from "konva";
import {
    type ShapePathCommand,
    type NodePath,
} from "../../../../nodes";
import { RendererCanvasBase } from "../base";


const FILL_NAME = "path-fill";
const FILL_SELECTOR = `.${FILL_NAME}`;

export class RendererCanvasPath extends RendererCanvasBase<NodePath> {
    public create(node: NodePath): Konva.Group {
        const group = new Konva.Group({
            id: String(node.id),
        });

        const fill = new Konva.Shape({
            name: FILL_NAME,
            listening: false,
            sceneFunc: (ctx, shape) => {
                const commands = (shape.getAttr("pathCommands") ?? []) as readonly ShapePathCommand[];

                if (!commands.length) {
                    return;
                }

                ctx.beginPath();
                this._appendPathCommands(ctx, commands);

                const fillColor = shape.fill();
                if (fillColor) {
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                }

                const strokeColor = shape.getAttr("strokeColor");
                const strokeWidth = shape.getAttr("strokeWidth") ?? 0;

                if (strokeColor && strokeWidth > 0) {
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = strokeWidth;
                    ctx.stroke();
                }
            },
        });

        group.add(fill);

        return group;
    }

    protected onUpdate(node: NodePath, view: Konva.Group): void {
        const fill = this._findOneOrThrow<Konva.Shape>(view, FILL_SELECTOR);

        fill.setAttrs({
            pathCommands: node.toPathCommands(),
            strokeColor: "getStrokeFill" in node ? (node as any).getStrokeFill() : undefined,
            strokeWidth: "getStrokeWidth" in node ? (node as any).getStrokeWidth() : 0,
        });

        fill.fill(node.getFill());
    }

    private _appendPathCommands(
        ctx: Konva.Context,
        commands: readonly ShapePathCommand[]
    ): void {
        for (const command of commands) {
            switch (command.type) {
                case "moveTo":
                    ctx.moveTo(command.point.x, command.point.y);
                    break;

                case "lineTo":
                    ctx.lineTo(command.point.x, command.point.y);
                    break;

                case "arcTo":
                    ctx.ellipse(
                        command.center.x,
                        command.center.y,
                        command.radiusX,
                        command.radiusY,
                        0,
                        this._degToRad(command.startAngle),
                        this._degToRad(command.endAngle),
                        !command.clockwise
                    );
                    break;

                case "closePath":
                    ctx.closePath();
                    break;
            }
        }
    }

    private _degToRad(value: number): number {
        return (value * Math.PI) / 180;
    }
}
