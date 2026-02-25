import { Color } from "./Color";
import { clamp01 } from "./utils";

export type ColorStopCanonical = {
    offset: number;
    color: Color;
}

export type ColorStopInput = {
    color: string | Color;
    offset?: number | `${number}%` | string;
}

export class DiamondGradient {
    public readonly kind = "diamond" as const;

    private readonly _position: string;
    private readonly _repeating: boolean;
    private readonly _stops: ColorStopCanonical[];

    private constructor(stops: ColorStopCanonical[], position: string, repeating: boolean) {
        this._stops = stops;
        this._position = position;
        this._repeating = repeating;
    }


    public static isValidString(input: string) {
        try {
            this.fromString(input);
            return true;
        } catch (e) {
            return false;
        }
    }

    public static fromString(input: string): DiamondGradient {
        const trimmed = input.trim();
        const isRepeating = trimmed.startsWith("repeating-diamond-gradient");
        const isNormal = trimmed.startsWith("diamond-gradient");

        if (!isRepeating && !isNormal) {
            throw new Error(`[DiamondGradient] Expected diamond-gradient but got: "${trimmed}"`);
        }

        const start = trimmed.indexOf("(");
        const end = trimmed.lastIndexOf(")");
        if (start === -1 || end === -1) throw new Error("[DiamondGradient] Invalid syntax");

        const inner = trimmed.slice(start + 1, end).trim();
        const params = inner.split(/,(?![^(]*\))/);

        let position = 'center';
        
        // Парсим заголовок (позицию)
        if (params.length > 0 && params[0].includes('at ')) {
            const firstParam = params[0].trim();
            const atIdx = firstParam.indexOf('at');
            position = firstParam.slice(atIdx + 2).trim().replace(/\s+/g, ' ');
            params.shift();
        }

        // Парсим стопы
        const stopInputs: ColorStopInput[] = params.map((p) => {
            const item = p.trim();
            const parts = item.split(/\s+/);
            if (parts.length === 1) return { color: Color.fromString(item) };

            const lastPart = parts[parts.length - 1];
            const isOffset = /^-?\d*\.?\d+(%|px)?$/.test(lastPart);

            if (isOffset) {
                const colorPart = item.slice(0, item.lastIndexOf(lastPart)).trim();
                return { color: Color.fromString(colorPart), offset: lastPart };
            }
            return { color: Color.fromString(item) };
        });

        const raw = stopInputs.map(s => ({
            color: typeof s.color === "string" ? Color.fromString(s.color) : s.color,
            offset: this._parseOffset(s.offset)
        }));

        const normalized = this._fillMissingOffsets(raw);
        return new DiamondGradient(normalized, position, isRepeating);
    }

    public getNormalizedPosition(): { x: number; y: number } {
        const pos = this._position.toLowerCase();
        const map: Record<string, { x: number, y: number }> = {
            'center': { x: 0.5, y: 0.5 },
            'top': { x: 0.5, y: 0 },
            'bottom': { x: 0.5, y: 1 },
            'left': { x: 0, y: 0.5 },
            'right': { x: 1, y: 0.5 },
            'top left': { x: 0, y: 0 },
            'top right': { x: 1, y: 0 },
            'bottom left': { x: 0, y: 1 },
            'bottom right': { x: 1, y: 1 },
        };

        if (map[pos]) return map[pos];

        const parts = pos.split(/\s+/);
        const x = parts[0].includes('%') ? parseFloat(parts[0]) / 100 : 0.5;
        const y = (parts[1] && parts[1].includes('%')) ? parseFloat(parts[1]) / 100 : 0.5;
        return { x, y };
    }

    // --- Интернальные методы (копия из твоих классов для автономности) ---

    private static _parseOffset(value?: number | string): number {
        if (value === undefined) return Number.NaN;
        if (typeof value === "number") return value;
        const v = parseFloat(value);
        if (isNaN(v)) return Number.NaN;
        return value.toString().includes('%') ? v / 100 : v;
    }

    private static _fillMissingOffsets(stops: Array<{ color: Color; offset: number }>): ColorStopCanonical[] {
        const out = stops.map(s => ({ ...s }));
        if (!out.some(s => Number.isFinite(s.offset))) {
            out.forEach((s, i) => s.offset = i / (out.length - 1));
        } else {
            if (!Number.isFinite(out[0].offset)) out[0].offset = 0;
            if (!Number.isFinite(out[out.length - 1].offset)) out[out.length - 1].offset = 1;

            for (let i = 1; i < out.length - 1; i++) {
                if (!Number.isFinite(out[i].offset)) {
                    let nextIdx = i + 1;
                    while (nextIdx < out.length && !Number.isFinite(out[nextIdx].offset)) nextIdx++;
                    const start = out[i - 1].offset;
                    const end = out[nextIdx].offset;
                    const count = nextIdx - i;
                    const step = (end - start) / (count + 1);
                    for (let j = 0; j < count; j++) out[i + j].offset = start + step * (j + 1);
                    i = nextIdx - 1;
                }
            }
        }
        return out as ColorStopCanonical[];
    }

    // Getters
    public getStops() { return this._stops; }
    public isRepeating() { return this._repeating; }
    public getPosition() { return this._position; }
}