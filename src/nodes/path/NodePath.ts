import { NodeType } from "../base";
import { ShapeBase } from "../shape";
import type { Vector2 } from "../../core/transform/types";
import type { INodePath, PathCommand } from "./types";
import { PathCommandType } from "./types";
import type { ID } from "../../core/types";

export class NodePath extends ShapeBase implements INodePath {
    private _commands: PathCommand[];

    constructor(id: ID, name?: string) {
        super(id, NodeType.Path, name ?? "Path");
        this._commands = [];
        this.setSize(100, 100);
    }

    public getCommands(): PathCommand[] {
        return this._commands.map(cmd => structuredClone(cmd));
    }

    public setCommands(value: PathCommand[]): void {
        const next = value.map(cmd => structuredClone(cmd));
        this._commands = next;
    }

    public moveTo(to: Vector2): void {
        this._commands.push({
            type: PathCommandType.MoveTo,
            to: { ...to },
        });
    }

    public lineTo(to: Vector2): void {
        this._commands.push({
            type: PathCommandType.LineTo,
            to: { ...to },
        });
    }

    public quadTo(control: Vector2, to: Vector2): void {
        this._commands.push({
            type: PathCommandType.QuadTo,
            control: { ...control },
            to: { ...to },
        });
    }

    public cubicTo(control1: Vector2, control2: Vector2, to: Vector2): void {
        this._commands.push({
            type: PathCommandType.CubicTo,
            control1: { ...control1 },
            control2: { ...control2 },
            to: { ...to },
        });
    }

    public closePath(): void {
        const last = this._commands[this._commands.length - 1];
        if (last?.type === PathCommandType.Close) {
            return;
        }
        this._commands.push({
            type: PathCommandType.Close,
        });
    }

    public clearPath(): void {
        if (this._commands.length === 0) {
            return;
        }
        this._commands = [];
    }

    public isClosed(): boolean {
        return this._commands[this._commands.length - 1]?.type === PathCommandType.Close;
    }


    public override toString(): string {
        const parts: string[] = [];

        for (const cmd of this._commands) {
            switch (cmd.type) {
                case PathCommandType.MoveTo:
                    parts.push(`M ${cmd.to.x} ${cmd.to.y}`);
                    break;
                case PathCommandType.LineTo:
                    parts.push(`L ${cmd.to.x} ${cmd.to.y}`);
                    break;
                case PathCommandType.QuadTo:
                    parts.push(`Q ${cmd.control.x} ${cmd.control.y} ${cmd.to.x} ${cmd.to.y}`);
                    break;
                case PathCommandType.CubicTo:
                    parts.push(`C ${cmd.control1.x} ${cmd.control1.y} ${cmd.control2.x} ${cmd.control2.y} ${cmd.to.x} ${cmd.to.y}`);
                    break;
                case PathCommandType.Close:
                    parts.push(`Z`);
                    break;
            }
        }

        return parts.join(" ");
    }

    public static fromString<T extends NodePath>(
        this: new (id: ID, name?: string) => T,
        id: ID,
        path: string
    ): T {
        const node = new this(id);
        const commands = NodePath.parseSvgPathToCommands(path);
        node.setCommands(commands);
        return node;
    }

    public static parseSvgPathToCommands(path: string): PathCommand[] {
        const tokens = this._tokenizeSvgPath(path);
        const commands: PathCommand[] = [];

        let i = 0;
        let current: Vector2 = { x: 0, y: 0 };
        let subpathStart: Vector2 = { x: 0, y: 0 };

        let lastQuadraticControl: Vector2 | null = null;
        let lastCubicControl2: Vector2 | null = null;

        const isCommand = (token: string): boolean => /^[a-zA-Z]$/.test(token);

        const readNumber = (): number => {
            if (i >= tokens.length) {
                throw new Error("Unexpected end of SVG path");
            }

            const value = Number(tokens[i++]);

            if (!Number.isFinite(value)) {
                throw new Error(`Invalid SVG path number: ${tokens[i - 1]}`);
            }

            return value;
        };

        const reflectPoint = (point: Vector2, around: Vector2): Vector2 => {
            return {
                x: around.x * 2 - point.x,
                y: around.y * 2 - point.y,
            };
        };

        while (i < tokens.length) {
            const token = tokens[i++];

            if (!isCommand(token)) {
                throw new Error(`Expected SVG command, got: ${token}`);
            }

            const cmd = token;
            const isRelative = cmd === cmd.toLowerCase();

            switch (cmd.toUpperCase()) {
                case "M": {
                    let first = true;

                    while (i < tokens.length && !isCommand(tokens[i])) {
                        const x = readNumber();
                        const y = readNumber();

                        const next = {
                            x: isRelative ? current.x + x : x,
                            y: isRelative ? current.y + y : y,
                        };

                        if (first) {
                            commands.push({
                                type: PathCommandType.MoveTo,
                                to: next,
                            });
                            subpathStart = { ...next };
                            first = false;
                        } else {
                            commands.push({
                                type: PathCommandType.LineTo,
                                to: next,
                            });
                        }

                        current = next;
                        lastQuadraticControl = null;
                        lastCubicControl2 = null;
                    }

                    break;
                }

                case "L": {
                    while (i < tokens.length && !isCommand(tokens[i])) {
                        const x = readNumber();
                        const y = readNumber();

                        const next = {
                            x: isRelative ? current.x + x : x,
                            y: isRelative ? current.y + y : y,
                        };

                        commands.push({
                            type: PathCommandType.LineTo,
                            to: next,
                        });

                        current = next;
                        lastQuadraticControl = null;
                        lastCubicControl2 = null;
                    }

                    break;
                }

                case "H": {
                    while (i < tokens.length && !isCommand(tokens[i])) {
                        const x = readNumber();

                        const next = {
                            x: isRelative ? current.x + x : x,
                            y: current.y,
                        };

                        commands.push({
                            type: PathCommandType.LineTo,
                            to: next,
                        });

                        current = next;
                        lastQuadraticControl = null;
                        lastCubicControl2 = null;
                    }

                    break;
                }

                case "V": {
                    while (i < tokens.length && !isCommand(tokens[i])) {
                        const y = readNumber();

                        const next = {
                            x: current.x,
                            y: isRelative ? current.y + y : y,
                        };

                        commands.push({
                            type: PathCommandType.LineTo,
                            to: next,
                        });

                        current = next;
                        lastQuadraticControl = null;
                        lastCubicControl2 = null;
                    }

                    break;
                }

                case "Q": {
                    while (i < tokens.length && !isCommand(tokens[i])) {
                        const cx = readNumber();
                        const cy = readNumber();
                        const x = readNumber();
                        const y = readNumber();

                        const control = {
                            x: isRelative ? current.x + cx : cx,
                            y: isRelative ? current.y + cy : cy,
                        };

                        const next = {
                            x: isRelative ? current.x + x : x,
                            y: isRelative ? current.y + y : y,
                        };

                        commands.push({
                            type: PathCommandType.QuadTo,
                            control,
                            to: next,
                        });

                        current = next;
                        lastQuadraticControl = { ...control };
                        lastCubicControl2 = null;
                    }

                    break;
                }

                case "T": {
                    while (i < tokens.length && !isCommand(tokens[i])) {
                        const x = readNumber();
                        const y = readNumber();

                        const control = lastQuadraticControl
                            ? reflectPoint(lastQuadraticControl, current)
                            : { ...current };

                        const next = {
                            x: isRelative ? current.x + x : x,
                            y: isRelative ? current.y + y : y,
                        };

                        commands.push({
                            type: PathCommandType.QuadTo,
                            control,
                            to: next,
                        });

                        current = next;
                        lastQuadraticControl = { ...control };
                        lastCubicControl2 = null;
                    }

                    break;
                }

                case "C": {
                    while (i < tokens.length && !isCommand(tokens[i])) {
                        const c1x = readNumber();
                        const c1y = readNumber();
                        const c2x = readNumber();
                        const c2y = readNumber();
                        const x = readNumber();
                        const y = readNumber();

                        const control1 = {
                            x: isRelative ? current.x + c1x : c1x,
                            y: isRelative ? current.y + c1y : c1y,
                        };

                        const control2 = {
                            x: isRelative ? current.x + c2x : c2x,
                            y: isRelative ? current.y + c2y : c2y,
                        };

                        const next = {
                            x: isRelative ? current.x + x : x,
                            y: isRelative ? current.y + y : y,
                        };

                        commands.push({
                            type: PathCommandType.CubicTo,
                            control1,
                            control2,
                            to: next,
                        });

                        current = next;
                        lastQuadraticControl = null;
                        lastCubicControl2 = { ...control2 };
                    }

                    break;
                }

                case "S": {
                    while (i < tokens.length && !isCommand(tokens[i])) {
                        const c2x = readNumber();
                        const c2y = readNumber();
                        const x = readNumber();
                        const y = readNumber();

                        const control1 = lastCubicControl2
                            ? reflectPoint(lastCubicControl2, current)
                            : { ...current };

                        const control2 = {
                            x: isRelative ? current.x + c2x : c2x,
                            y: isRelative ? current.y + c2y : c2y,
                        };

                        const next = {
                            x: isRelative ? current.x + x : x,
                            y: isRelative ? current.y + y : y,
                        };

                        commands.push({
                            type: PathCommandType.CubicTo,
                            control1,
                            control2,
                            to: next,
                        });

                        current = next;
                        lastQuadraticControl = null;
                        lastCubicControl2 = { ...control2 };
                    }

                    break;
                }

                case "Z": {
                    commands.push({
                        type: PathCommandType.Close,
                    });

                    current = { ...subpathStart };
                    lastQuadraticControl = null;
                    lastCubicControl2 = null;
                    break;
                }

                case "A": {
                    throw new Error("SVG arc commands (A/a) are not supported yet");
                }

                default:
                    throw new Error(`Unsupported SVG command: ${cmd}`);
            }
        }

        return commands;
    }


    private static _tokenizeSvgPath(path: string): string[] {
        return path
            .replace(/,/g, " ")
            .replace(/([a-zA-Z])/g, " $1 ")
            .trim()
            .split(/\s+/)
            .flatMap((token) => {
                if (/^[a-zA-Z]$/.test(token)) {
                    return [token];
                }

                const matches = token.match(/[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g);
                return matches ?? [];
            });
    }
}