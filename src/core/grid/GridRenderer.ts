// core/grid/GridRenderer.ts
export type Rect = { x: number; y: number; width: number; height: number };

export type CameraLikeState = {
    scale: number;     // нам реально нужен только scale для толщины линий и minCellPx
};

export type WorldGridOptions = {
    enabled?: boolean;

    size?: number;          // world units per cell
    majorEvery?: number;    // e.g. 5

    minCellPx?: number;     // hide if cell is smaller than this in screen px
    maxLines?: number;      // safety

    minorAlpha?: number;
    majorAlpha?: number;
    axisAlpha?: number;
    showAxis?: boolean;
};

export type GridDrawInput = {
    camera: CameraLikeState;
    viewportAabbWorld: Rect;
};

export class GridRenderer {
    private _opts: Required<WorldGridOptions> = {
        enabled: true,
        size: 50,
        majorEvery: 5,
        minCellPx: 6,
        maxLines: 1500,
        minorAlpha: 1,
        majorAlpha: 1,
        axisAlpha: 1,
        showAxis: true,
    };

    public setOptions(options: Partial<WorldGridOptions>) {
        this._opts = { ...this._opts, ...options };
    }

    public getOptions(): Readonly<WorldGridOptions> {
        return this._opts;
    }

    public getGridStepWorld(): { minor: number; major: number } {
        const step = Math.max(1e-6, this._opts.size);
        const major = step * Math.max(1, this._opts.majorEvery);
        return { minor: step, major };
    }

    public draw(ctx: CanvasRenderingContext2D, input: GridDrawInput) {
        const opts = this._opts;
        if (!opts.enabled) return;

        const cam = input.camera;
        const aabb = input.viewportAabbWorld;

        const minX = aabb.x;
        const maxX = aabb.x + aabb.width;
        const minY = aabb.y;
        const maxY = aabb.y + aabb.height;

        const step = Math.max(1e-6, opts.size);
        const cellPx = step * cam.scale;

        if (cellPx < opts.minCellPx) return;

        const majorStep = step * Math.max(1, opts.majorEvery);

        const approxLines =
            (Math.ceil((maxX - minX) / step) + 1) +
            (Math.ceil((maxY - minY) / step) + 1);

        if (approxLines > opts.maxLines) return;

        const startX = Math.floor(minX / step) * step;
        const startY = Math.floor(minY / step) * step;

        const startMajorX = Math.floor(minX / majorStep) * majorStep;
        const startMajorY = Math.floor(minY / majorStep) * majorStep;

        ctx.save();
        ctx.globalCompositeOperation = "difference";
        ctx.lineWidth = 1 / cam.scale;

        // MINOR
        ctx.strokeStyle = `rgba(255,255,255,${opts.minorAlpha})`;
        ctx.beginPath();

        for (let x = startX; x <= maxX; x += step) {
            ctx.moveTo(x, minY);
            ctx.lineTo(x, maxY);
        }
        for (let y = startY; y <= maxY; y += step) {
            ctx.moveTo(minX, y);
            ctx.lineTo(maxX, y);
        }
        ctx.stroke();

        // MAJOR
        ctx.strokeStyle = `rgba(255,255,255,${opts.majorAlpha})`;
        ctx.beginPath();

        for (let x = startMajorX; x <= maxX; x += majorStep) {
            ctx.moveTo(x, minY);
            ctx.lineTo(x, maxY);
        }
        for (let y = startMajorY; y <= maxY; y += majorStep) {
            ctx.moveTo(minX, y);
            ctx.lineTo(maxX, y);
        }
        ctx.stroke();

        // AXIS
        if (opts.showAxis) {
            ctx.strokeStyle = `rgba(77,163,255,${opts.axisAlpha})`;
            ctx.beginPath();
            ctx.moveTo(0, minY);
            ctx.lineTo(0, maxY);
            ctx.moveTo(minX, 0);
            ctx.lineTo(maxX, 0);
            ctx.stroke();
        }

        ctx.restore();
    }
}