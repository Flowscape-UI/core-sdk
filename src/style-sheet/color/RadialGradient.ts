import { Color } from "./Color";
import type { ColorStopCanonical, ColorStopInput } from "./types";

export type RadialGradientShape = 'circle' | 'ellipse';

export type RadialGradientExtent =
    | 'closest-side'
    | 'closest-corner'
    | 'farthest-side'
    | 'farthest-corner';

export type RadialGradientOptions = {
    shape?: RadialGradientShape;
    position?: string;
    extent?: RadialGradientExtent;
    repeating?: boolean;
};

// Тот же Enum для консистентности
export enum RadialGradientPosition {
    Center = 'center',
    Top = 'top',
    Bottom = 'bottom',
    Left = 'left',
    Right = 'right',
    TopLeft = 'top left',
    TopRight = 'top right',
    BottomLeft = 'bottom left',
    BottomRight = 'bottom right',
}

export class RadialGradient {
    public readonly kind = "radial" as const;

    private readonly _shape: RadialGradientShape;
    private readonly _position: string;
    private readonly _extent: RadialGradientExtent;
    private readonly _repeating: boolean;
    private readonly _stops: ColorStopCanonical[];

    private constructor(
        stops: ColorStopCanonical[],
        opts: Required<Omit<RadialGradientOptions, 'repeating'>> & { repeating: boolean }
    ) {
        this._stops = RadialGradient._normalizeStops(stops);
        this._shape = opts.shape;
        this._position = opts.position;
        this._extent = opts.extent;
        this._repeating = opts.repeating;
    }

    public static fromStops(inputs: ColorStopInput[], opts: RadialGradientOptions = {}) {
        const shape = opts.shape ?? 'ellipse';
        const position = opts.position ?? 'center';
        const extent = opts.extent ?? 'farthest-corner';
        const repeating = opts.repeating ?? false;

        const raw = inputs.map((s) => ({
            color: typeof s.color === "string" ? Color.fromString(s.color) : s.color,
            offset: RadialGradient._parseOffset(s.offset),
        }));

        const normalized = RadialGradient._fillMissingOffsets(raw);

        return new RadialGradient(normalized, {
            shape,
            position,
            extent,
            repeating
        });
    }

    public static isValidString(s: string): boolean {
        try {
            const trimmed = s.trim();
            return trimmed.startsWith("radial-gradient") || trimmed.startsWith("repeating-radial-gradient");
        } catch {
            return false;
        }
    }

    public static fromString(input: string): RadialGradient {
        const trimmed = input.trim();
        const isRepeating = trimmed.startsWith("repeating-radial-gradient");
        const isNormal = trimmed.startsWith("radial-gradient");

        if (!isRepeating && !isNormal) {
            throw new Error(`[RadialGradient] Expected radial-gradient but got: "${trimmed}"`);
        }

        const start = trimmed.indexOf("(");
        const end = trimmed.lastIndexOf(")");
        if (start === -1 || end === -1) throw new Error("[RadialGradient] Invalid syntax");

        const inner = trimmed.slice(start + 1, end).trim();
        const params = inner.split(/,(?![^(]*\))/);

        let shape: RadialGradientShape = 'ellipse';
        let position = 'center';
        let extent: RadialGradientExtent = 'farthest-corner';

        const firstParam = params[0]!.trim();
        const hasOptions = /circle|ellipse|at|closest|farthest/.test(firstParam);

        if (hasOptions) {
            if (firstParam.includes('circle')) shape = 'circle';
            if (firstParam.includes('ellipse')) shape = 'ellipse';

            if (firstParam.includes('at')) {
                const atIdx = firstParam.indexOf('at');
                // Убираем 'at' и лишние пробелы, чтобы получить чистую строку позиции
                position = firstParam.slice(atIdx + 2).trim().replace(/\s+/g, ' ');
            }

            const extents: RadialGradientExtent[] = ['closest-side', 'closest-corner', 'farthest-side', 'farthest-corner'];
            for (const e of extents) {
                if (firstParam.includes(e)) {
                    extent = e;
                    break;
                }
            }
            params.shift();
        }

        const stops = params.map((p) => {
            const item = p.trim();
            const parts = item.split(/\s+/);
            if (parts.length === 1) return { color: Color.fromString(item) };

            const lastPart = parts[parts.length - 1];
            const isOffset = /^-?\d*\.?\d+(%|px|deg)?$/.test(lastPart!);

            if (isOffset) {
                const colorPart = item.slice(0, item.lastIndexOf(lastPart!)).trim();
                return {
                    color: Color.fromString(colorPart),
                    offset: lastPart
                };
            }
            return { color: Color.fromString(item) };
        });

        return RadialGradient.fromStops(stops as ColorStopInput[], {
            shape,
            position,
            extent,
            repeating: isRepeating
        });
    }

    /**
     * Возвращает координаты центра от 0 до 1 для использования в LayerBackground
     */
    public getNormalizedPosition(): { x: number; y: number } {
        const pos = this._position.toLowerCase();

        const map: Record<string, { x: number, y: number }> = {
            ['center']: { x: 0.5, y: 0.5 },
            ['top']: { x: 0.5, y: 0 },
            ['bottom']: { x: 0.5, y: 1 },
            ['left']: { x: 0, y: 0.5 },
            ['right']: { x: 1, y: 0.5 },
            ['top left']: { x: 0, y: 0 },
            ['left top']: { x: 0, y: 0 },
            ['top right']: { x: 1, y: 0 },
            ['right top']: { x: 1, y: 0 },
            ['bottom left']: { x: 0, y: 1 },
            ['left bottom']: { x: 0, y: 1 },
            ['bottom right']: { x: 1, y: 1 },
            ['right bottom']: { x: 1, y: 1 },
        };

        if (map[pos]) return map[pos];

        // Парсинг процентов/чисел
        const parts = pos.split(/\s+/);
        const x = this._parseCoord(parts[0]!);
        // Если указано одно значение (напр. "20%"), второе — 50%
        const y = parts.length > 1 ? this._parseCoord(parts[1]!) : 0.5;

        return { x, y };
    }

    private _parseCoord(val: string): number {
        const v = parseFloat(val);
        if (val.includes('%')) return v / 100;
        return v; // Для px логика зависит от контейнера в LayerBackground
    }

    // --- Getters ---
    public getStops() { return this._stops; }
    public getShape() { return this._shape; }
    public getPosition() { return this._position; }
    public getExtent() { return this._extent; }
    public isRepeating() { return this._repeating; }

    // --- Utils ---
    private static _parseOffset(value?: number | string): number {
        if (value === undefined) return Number.NaN;
        if (typeof value === "number") return value;
        const v = parseFloat(value);
        if (isNaN(v)) return Number.NaN;
        return value.toString().includes('%') ? v / 100 : v;
    }

    private static _normalizeStops(stops: ColorStopCanonical[]): ColorStopCanonical[] {
        if (stops.length < 2) throw new Error("[RadialGradient] Need at least 2 stops");
        return [...stops].sort((a, b) => a.offset - b.offset);
    }

    private static _fillMissingOffsets(stops: Array<{ color: Color; offset: number }>): ColorStopCanonical[] {
        const out = stops.map(s => ({ ...s }));
        if (out.length < 2) throw new Error("[RadialGradient] Need at least 2 stops");

        if (!out.some(s => Number.isFinite(s.offset))) {
            out.forEach((s, i) => s.offset = i / (out.length - 1));
        } else {
            if (!Number.isFinite(out[0]!.offset)) out[0]!.offset = 0;
            if (!Number.isFinite(out[out.length - 1]!.offset)) out[out.length - 1]!.offset = 1;

            for (let i = 1; i < out.length - 1; i++) {
                if (!Number.isFinite(out[i]!.offset)) {
                    let nextIdx = i + 1;
                    while (nextIdx < out.length && !Number.isFinite(out[nextIdx]!.offset)) nextIdx++;
                    const start = out[i - 1]!.offset;
                    const end = out[nextIdx]!.offset;
                    const count = nextIdx - i;
                    const step = (end - start) / (count + 1);
                    for (let j = 0; j < count; j++) out[i + j]!.offset = start + step * (j + 1);
                    i = nextIdx - 1;
                }
            }
        }
        return out as ColorStopCanonical[];
    }
}