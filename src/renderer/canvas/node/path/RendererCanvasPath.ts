import Konva from "konva";
import {
    PathCommandType,
    type NodePath,
    type PathCommand
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
                const commands = (shape.getAttr("commands") ?? []) as PathCommand[];

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
            commands: node.getCommands(),
            strokeColor: "getStrokeFill" in node ? (node as any).getStrokeFill() : undefined,
            strokeWidth: "getStrokeWidth" in node ? (node as any).getStrokeWidth() : 0,
        });

        fill.fill(node.getFill());
    }

    private _appendPathCommands(
        ctx: CanvasRenderingContext2D,
        commands: PathCommand[]
    ): void {
        for (const command of commands) {
            switch (command.type) {
                case PathCommandType.MoveTo:
                    ctx.moveTo(command.to.x, command.to.y);
                    break;

                case PathCommandType.LineTo:
                    ctx.lineTo(command.to.x, command.to.y);
                    break;

                case PathCommandType.QuadTo:
                    ctx.quadraticCurveTo(
                        command.control.x,
                        command.control.y,
                        command.to.x,
                        command.to.y
                    );
                    break;

                case PathCommandType.CubicTo:
                    ctx.bezierCurveTo(
                        command.control1.x,
                        command.control1.y,
                        command.control2.x,
                        command.control2.y,
                        command.to.x,
                        command.to.y
                    );
                    break;

                case PathCommandType.Close:
                    ctx.closePath();
                    break;
            }
        }
    }
}