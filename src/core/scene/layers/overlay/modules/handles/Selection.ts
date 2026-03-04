// overlay/handles/SelectionBorderHandle.ts
import Konva from "konva";
import { OffsetAnchor, type Point } from "../HandleView";
import { Handle, type HandleOptions } from "./Handle";

const DEFAULT_OPTIONS: HandleOptions = {
    type: "square",
    size: 24,
    offset: {x: 0, y: 0},
    position: OffsetAnchor.Center,
    style: {
        cursor: "crosshair",
    },
};

export class HandleSelectionBorder extends Handle {
    private readonly _line: Konva.Line;

    constructor(id: string, options: Partial<HandleOptions>) {
        const opts = {
            ...DEFAULT_OPTIONS,
            ...options,
        }
        const line = new Konva.Line({
            points: [],
            closed: true,
            listening: false,
            perfectDrawEnabled: false,
            stroke: opts.style.borderColor ?? "#4da3ff",
            strokeWidth: opts.style.borderWidth ?? 1,
            opacity: opts.style.opacity ?? 1,
        });

        super(id, opts, line);
        this._line = line;
    }

    public override draw(): void {
        const cornersS = this._getSelectionCornersScreen();
        if (!cornersS) {
            this.node.visible(false);
            this._line.points([]);
            return;
        }

        const pts: number[] = [];
        for (const p of cornersS as Point[]) pts.push(p.x, p.y);

        this._line.points(pts);
        this.node.visible(true);
    }
}