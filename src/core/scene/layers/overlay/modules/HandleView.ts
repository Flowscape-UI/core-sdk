import Konva from 'konva';

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };

export enum OffsetAnchor {
    TopLeft = 'TopLeft',
    Top = 'Top',
    TopRight = 'TopRight',
    Right = 'Right',
    BottomRight = 'BottomRight',
    Bottom = 'Bottom',
    BottomLeft = 'BottomLeft',
    Left = 'Left',
    Center = 'Center',
}

export type HandleType = "circle" | "square" | "line";

export type HandleStyle = {
    background?: string;      // fill
    borderColor?: string;     // stroke
    borderWidth?: number;     // strokeWidth
    opacity?: number;         // overall opacity
};

/**
 * normalized: [0..1] относительно bbox
 * px: в пикселях относительно bbox (от top-left bbox)
 */
export type HandlePositionSpec =
    | OffsetAnchor
    | { x: number; y: number } // normalized (0..1)
    | { px: { x: number; y: number } }; // pixels relative to bbox

export class OverlayHandleView {
    private readonly _root = new Konva.Group({ listening: true, perfectDrawEnabled: false });

    private _type: HandleType = 'circle';
    private _size = 10;

    // позиция относительно bbox
    private _posSpec: HandlePositionSpec = OffsetAnchor.TopLeft;

    // offset в пикселях (добавочный сдвиг после вычисления позиции)
    private _offsetPx: Point = { x: 0, y: 0 };
    private _radialOffset = 0;
    private _normalOffset = 0;

    // visual nodes
    private _circle: Konva.Circle | null = null;
    private _rect: Konva.Rect | null = null;
    private _image: Konva.Image | null = null;
    private _line: Konva.Line | null = null;

    private _style: Required<HandleStyle> = {
        background: '#ffffff',
        borderColor: '#4da3ff',
        borderWidth: 1,
        opacity: 1,
    };

    constructor(params?: { type?: HandleType; size?: number; style?: HandleStyle }) {
        if (params?.type) this._type = params.type;
        if (params?.size != null) this._size = params.size;
        if (params?.style) this.setStyle(params.style);

        this._rebuildShape();
    }

    // ---------- public API ----------

    public getRoot(): Konva.Group {
        return this._root;
    }

    public setType(type: HandleType) {
        if (this._type === type) return;
        this._type = type;
        this._rebuildShape();
    }

    public setSize(px: number) {
        this._size = px;
        this._applySize();
        this._applyStyle();
        this._layoutImage();
    }

    public setStyle(style: HandleStyle) {
        this._style = { ...this._style, ...style };
        this._applyStyle();
    }

    public setOffset(x: number, y: number) {
        this._offsetPx = { x, y };
    }

    public setRadialOffset(px: number) {
        this._radialOffset = px;
    }

    public setNormalOffset(px: number) {
        this._normalOffset = px;
    }

    public setPosition(spec: HandlePositionSpec) {
        this._posSpec = spec;
    }

    /**
     * Варианты:
     * - string URL (быстро для демо)
     * - HTMLImageElement (идеально: ты сам загрузил/закешировал)
     */
    public setImage(src: string | HTMLImageElement | null, opacity = 1) {
        if (!src) {
            this._image?.destroy();
            this._image = null;
            return;
        }

        if (!this._image) {
            this._image = new Konva.Image();
            this._image.listening(false);
            this._root.add(this._image);
        }

        this._image.opacity(opacity);

        if (typeof src === 'string') {
            const img = new Image();
            img.onload = () => {
                this._image?.image(img);
                this._layoutImage();
            };
            img.src = src;
        } else {
            this._image.image(src);
            this._layoutImage();
        }
    }

    /**
     * Обновить позицию хендлера под текущий bbox.
     * bbox должен быть в тех же координатах, где рисуется overlay (обычно SCREEN).
     */
    public updateByBox(box: Box) {
        const base = OverlayHandleView.getPosition(box, this._posSpec);

        let x = base.x;
        let y = base.y;

        // radial offset (от центра bbox наружу/внутрь)
        if (this._radialOffset !== 0) {
            const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            const dx = x - center.x;
            const dy = y - center.y;
            const len = Math.hypot(dx, dy) || 1;
            x += (dx / len) * this._radialOffset;
            y += (dy / len) * this._radialOffset;
        }

        // normal offset (перпендикуляр к стороне)
        if (this._normalOffset !== 0) {
            const n = this._computeNormal(box, base);
            x += n.x * this._normalOffset;
            y += n.y * this._normalOffset;
        }

        // manual offset
        x += this._offsetPx.x;
        y += this._offsetPx.y;

        // LINE MODE: points в screen coords, root не двигаем
        if (this._type === "line" && this._line) {
            this._root.position({ x: 0, y: 0 });
            this._updateLineByBox(box, { x, y }); // передаём "итоговую точку" на стороне
            return;
        }

        // POINT MODE: обычные хендлы
        this._root.position({ x, y });
    }

    // ---------- static helpers ----------

    public static getPosition(box: Box, spec: HandlePositionSpec): Point {
        // presets
        if (typeof spec === 'string') {
            switch (spec) {
                case OffsetAnchor.TopLeft:
                    return { x: box.x, y: box.y };
                case OffsetAnchor.Top:
                    return { x: box.x + box.width / 2, y: box.y };
                case OffsetAnchor.TopRight:
                    return { x: box.x + box.width, y: box.y };
                case OffsetAnchor.Right:
                    return { x: box.x + box.width, y: box.y + box.height / 2 };
                case OffsetAnchor.BottomRight:
                    return { x: box.x + box.width, y: box.y + box.height };
                case OffsetAnchor.Bottom:
                    return { x: box.x + box.width / 2, y: box.y + box.height };
                case OffsetAnchor.BottomLeft:
                    return { x: box.x, y: box.y + box.height };
                case OffsetAnchor.Left:
                    return { x: box.x, y: box.y + box.height / 2 };
                case OffsetAnchor.Center:
                    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            }
        }

        // px relative
        if ('px' in spec) {
            return { x: box.x + spec.px.x, y: box.y + spec.px.y };
        }

        // normalized [0..1]
        return { x: box.x + spec.x * box.width, y: box.y + spec.y * box.height };
    }

    // ---------- internals ----------

    private _updateLineByBox(box: Box, position: Point) {
        if (!this._line) return;

        // базовая точка на стороне (без offset’ов)
        const base = OverlayHandleView.getPosition(box, this._posSpec);

        // сколько надо сдвинуть линию (offsets в сумме)
        const dx = position.x - base.x;
        const dy = position.y - base.y;

        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

        switch (this._posSpec) {
            case OffsetAnchor.Top:
                x1 = box.x; y1 = box.y;
                x2 = box.x + box.width; y2 = box.y;
                break;

            case OffsetAnchor.Bottom:
                x1 = box.x; y1 = box.y + box.height;
                x2 = box.x + box.width; y2 = box.y + box.height;
                break;

            case OffsetAnchor.Left:
                x1 = box.x; y1 = box.y;
                x2 = box.x; y2 = box.y + box.height;
                break;

            case OffsetAnchor.Right:
                x1 = box.x + box.width; y1 = box.y;
                x2 = box.x + box.width; y2 = box.y + box.height;
                break;

            default:
                // line имеет смысл только на 4 сторонах
                this._line.visible(false);
                return;
        }

        this._line.visible(true);
        this._line.hitStrokeWidth(this._size);

        // применяем сдвиг
        this._line.points([x1 + dx, y1 + dy, x2 + dx, y2 + dy]);
    }

    private _computeNormal(box: Box, p: Point): Point {
        const epsilon = 0.001;

        const left = box.x;
        const right = box.x + box.width;
        const top = box.y;
        const bottom = box.y + box.height;

        // если близко к верхней стороне
        if (Math.abs(p.y - top) < epsilon) {
            return { x: 0, y: -1 };
        }

        // нижняя
        if (Math.abs(p.y - bottom) < epsilon) {
            return { x: 0, y: 1 };
        }

        // левая
        if (Math.abs(p.x - left) < epsilon) {
            return { x: -1, y: 0 };
        }

        // правая
        if (Math.abs(p.x - right) < epsilon) {
            return { x: 1, y: 0 };
        }

        // fallback — если это не край (например normalized внутри)
        // тогда используем radial направление
        const center = {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
        };

        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const len = Math.hypot(dx, dy) || 1;

        return { x: dx / len, y: dy / len };
    }

    private _rebuildShape() {
        this._circle?.destroy();
        this._rect?.destroy();
        this._line?.destroy();

        this._circle = null;
        this._rect = null;
        this._line = null;

        if (this._type === 'circle') {
            this._circle = new Konva.Circle({ listening: true });
            this._root.add(this._circle);
        }
        if (this._type === 'square') {
            this._rect = new Konva.Rect({ listening: true });
            this._root.add(this._rect);
        }
        if (this._type === 'line') {
            this._line = new Konva.Line({
                listening: true,
                closed: false,
            });
            this._root.add(this._line);
        }

        // важно: shape должен быть под image, чтобы image “лежала сверху”
        if (this._image) this._image.moveToTop();

        this._applySize();
        this._applyStyle();
        this._layoutImage();
    }

    private _applySize() {
        const r = this._size / 2;

        if (this._circle) {
            this._circle.radius(r);
            this._circle.position({ x: 0, y: 0 });
        }

        if (this._rect) {
            this._rect.size({ width: this._size, height: this._size });
            this._rect.offset({ x: r, y: r });
            this._rect.position({ x: 0, y: 0 });
            // радиус можно позже добавить как опцию
        }

        // root всегда центрируется в (0,0) — удобно позиционировать
        this._root.offset({ x: 0, y: 0 });
    }

    private _applyStyle() {
        const { background, borderColor, borderWidth, opacity } = this._style;

        if (this._circle) {
            this._circle.fill(background);
            this._circle.stroke(borderColor);
            this._circle.strokeWidth(borderWidth);
            this._circle.opacity(opacity);
        }
        if (this._rect) {
            this._rect.fill(background);
            this._rect.stroke(borderColor);
            this._rect.strokeWidth(borderWidth);
            this._rect.opacity(opacity);
        }
        if (this._line) {
            this._line.fill(background);
            this._line.stroke(borderColor);
            this._line.strokeWidth(borderWidth);
            this._line.opacity(opacity);
        }
        this._image?.opacity(opacity * (this._image.opacity() ?? 1));
    }

    private _layoutImage() {
        if (!this._image || !this._image.image()) return;

        // центрируем и вписываем image в handle
        const img = this._image.image() as HTMLImageElement;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        if (!iw || !ih) return;

        const pad = 2; // небольшой padding
        const max = Math.max(1, this._size - pad * 2);
        const scale = Math.min(max / iw, max / ih);

        const w = iw * scale;
        const h = ih * scale;

        this._image.size({ width: w, height: h });
        this._image.offset({ x: w / 2, y: h / 2 });
        this._image.position({ x: 0, y: 0 });
        this._image.listening(false);
        this._image.moveToTop();
    }
}
