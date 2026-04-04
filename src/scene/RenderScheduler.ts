import type Konva from "konva";
import type { IRenderable } from "../core/interfaces";


export class RenderScheduler {
    private _raf = 0;
    private _dirty = new Set<IRenderable>();

    constructor(private readonly _stage: Konva.Stage) { }

    invalidate(layer: IRenderable) {
        this._dirty.add(layer);
        if (this._raf) return;

        this._raf = requestAnimationFrame(() => {
            this._raf = 0;

            const list = Array.from(this._dirty).sort((a, b) => {
                const ao = a.order;
                const bo = b.order;
                if (ao !== bo) return ao - bo;
                return (a.suborder ?? 0) - (b.suborder ?? 0);
            });
            this._dirty.clear();

            // 1) обновляем state/позиции/аттрибуты
            for (const l of list) l.render?.();

            // 2) рисуем ВСЁ сразу, без второго rAF
            this._stage.draw(); // <-- важно: draw, не batchDraw
        });
    }

    destroy() {
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = 0;
        this._dirty.clear();
    }
}