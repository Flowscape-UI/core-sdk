import { Color } from "./Color";
import type { ColorStopCanonical, ColorStopInput } from "./types";
import { clamp01 } from "./utils";

export type ConicGradientAngleInput = number | `${number}deg` | string;

export type ConicGradientOptions = {
    angle?: ConicGradientAngleInput;
    position?: string;
    repeating?: boolean;
};

export enum ConicGradientPosition {
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

export class ConicGradient {
    public readonly kind = "conic" as const;

    private readonly _angle: ConicGradientAngleInput;
    private readonly _position: string;
    private readonly _repeating: boolean;
    private readonly _stops: ColorStopCanonical[];

    private constructor(
        angle: ConicGradientAngleInput,
        position: string,
        stops: ColorStopCanonical[],
        repeating: boolean
    ) {
        this._angle = angle;
        this._position = position;
        this._repeating = repeating;
        this._stops = ConicGradient._normalizeStops(stops);
    }

    public static fromString(input: string): ConicGradient {
        const trimmed = input.trim();
        const isRepeating = trimmed.startsWith("repeating-conic-gradient");
        const isNormal = trimmed.startsWith("conic-gradient");

        if (!isRepeating && !isNormal) {
            throw new Error("[ConicGradient] Invalid gradient string");
        }

        const start = trimmed.indexOf("(");
        const end = trimmed.lastIndexOf(")");
        if (start === -1 || end === -1 || end <= start) {
            throw new Error("[ConicGradient] Malformed gradient string");
        }

        const content = trimmed.slice(start + 1, end).trim();
        const params = content.split(/,(?![^(]*\))/).map(p => p.trim());

        let angle: ConicGradientAngleInput = "0deg";
        let position = "center"; // По умолчанию

        // ПАРСИНГ ЗАГОЛОВКА (from... at...)
        if (params.length > 0 && (params[0]!.includes("from ") || params[0]!.includes("at "))) {
            const header = params[0];

            // Извлекаем угол
            const fromMatch = header!.match(/from\s+([^ ]+)/);
            if (fromMatch) angle = fromMatch[1]!;

            // Извлекаем позицию
            const atMatch = header!.match(/at\s+(.+)$/);
            if (atMatch) {
                // Очищаем позицию от лишних пробелов, чтобы соответствовать Enum
                position = atMatch[1]!.trim().replace(/\s+/g, ' ');
            }

            params.shift();
        }

        // ПАРСИНГ СТОПОВ (оставляем твою логику, она хорошая)
        const stops: ColorStopInput[] = params.map((p) => {
            const item = p.trim();
            const parts = item.split(/\s+/);
            if (parts.length === 1) return { color: Color.fromString(item) };

            const lastPart = parts[parts.length - 1];
            const isOffset = /^-?\d*\.?\d+(%|deg)?$/.test(lastPart!);

            if (isOffset) {
                const colorPart = item.slice(0, item.lastIndexOf(lastPart!)).trim();
                return {
                    color: Color.fromString(colorPart),
                    offset: this._parseOffset(lastPart as any)
                };
            }
            return { color: Color.fromString(item) };
        });

        return ConicGradient.fromStops(stops, {
            angle,
            position, // Теперь это либо "20% 30%", либо "top left"
            repeating: isRepeating,
        });
    }

    // Вспомогательный метод для получения координат в % (для рендерера)
    public getNormalizedPosition(): { x: number; y: number } {
        const pos = this._position.toLowerCase();

        // Карта соответствий ключевых слов
        const map: Record<string, { x: number, y: number }> = {
            [ConicGradientPosition.Center]: { x: 0.5, y: 0.5 },
            [ConicGradientPosition.Top]: { x: 0.5, y: 0 },
            [ConicGradientPosition.Bottom]: { x: 0.5, y: 1 },
            [ConicGradientPosition.Left]: { x: 0, y: 0.5 },
            [ConicGradientPosition.Right]: { x: 1, y: 0.5 },
            [ConicGradientPosition.TopLeft]: { x: 0, y: 0 },
            [ConicGradientPosition.TopRight]: { x: 1, y: 0 },
            [ConicGradientPosition.BottomLeft]: { x: 0, y: 1 },
            [ConicGradientPosition.BottomRight]: { x: 1, y: 1 },
            // Добавим варианты с инверсией слов для гибкости
            'left top': { x: 0, y: 0 },
            'right top': { x: 1, y: 0 },
            'left bottom': { x: 0, y: 1 },
            'right bottom': { x: 1, y: 1 },
        };

        if (map[pos]) return map[pos];

        // Если это не ключевое слово, парсим как проценты/пиксели
        const parts = pos.split(/\s+/);
        const x = this._parseCoord(parts[0]!);
        const y = parts.length > 1 ? this._parseCoord(parts[1]!) : 0.5;

        return { x, y };
    }

    private _parseCoord(val: string): number {
        const v = parseFloat(val);
        if (val.includes('%')) return v / 100;
        return v; // Если px, то вернет просто число (логика будет зависеть от width/height)
    }

    public static fromStops(inputs: ColorStopInput[], opts: ConicGradientOptions = {}): ConicGradient {
        const angle = opts.angle ?? "0deg";
        const position = opts.position ?? "at center";
        const repeating = opts.repeating ?? false;

        const raw = inputs.map((s) => ({
            color: typeof s.color === "string" ? Color.fromString(s.color) : s.color,
            offset: ConicGradient._parseOffset(s.offset),
        }));

        const normalized = ConicGradient._fillMissingOffsets(raw);
        return new ConicGradient(angle, position, normalized, repeating);
    }

    public static isValidString(s: string): boolean {
        try {
            this.fromString(s);
            return true;
        } catch {
            return false;
        }
    }

    public getStops(): ColorStopCanonical[] {
        return this._stops.map((s) => ({ offset: s.offset, color: s.color }));
    }

    public getAngle(): ConicGradientAngleInput { return this._angle; }
    public getPosition(): string { return this._position; }
    public isRepeating(): boolean { return this._repeating; }

    // ---------------- internals ----------------

    private static _parseOffset(value?: number | `${number}%` | `${number}deg`): number {
        if (value === undefined) return Number.NaN;
        if (typeof value === "number") return value;

        const s = value.toLowerCase();
        const v = parseFloat(s);
        if (isNaN(v)) return Number.NaN;

        if (s.endsWith("%")) return v / 100;
        if (s.endsWith("deg")) return v / 360; // В коническом 360deg = 100%

        return v;
    }

    private static _normalizeStops(stops: ColorStopCanonical[]): ColorStopCanonical[] {
        if (stops.length < 2) throw new Error("[ConicGradient] Need at least 2 stops");
        return stops
            .map((s) => ({ color: s.color, offset: clamp01(s.offset) }))
            .sort((a, b) => a.offset - b.offset);
    }

    private static _fillMissingOffsets(
        stops: Array<{ color: Color; offset: number }>
    ): ColorStopCanonical[] {
        // Логика 1 в 1 как в твоем LinearGradient
        const out: Array<{ color: Color; offset: number }> = stops.map((s) => ({ ...s }));
        const hasAny = out.some((s) => Number.isFinite(s.offset));

        if (!hasAny) {
            for (let i = 0; i < out.length; i++) {
                out[i]!.offset = i / (out.length - 1);
            }
            return out as ColorStopCanonical[];
        }

        if (out[0] && !Number.isFinite(out[0].offset)) out[0].offset = 0;
        if (out[out.length - 1] && !Number.isFinite(out[out.length - 1]!.offset)) out[out.length - 1]!.offset = 1;

        let i = 0;
        while (i < out.length) {
            if (Number.isFinite(out[i]!.offset)) { i++; continue; }
            const startIdx = i - 1;
            let endIdx = i;
            while (endIdx < out.length && !Number.isFinite(out[endIdx]!.offset)) endIdx++;

            const start = out[startIdx]!.offset;
            const end = out[endIdx]!.offset;
            const missing = endIdx - startIdx - 1;
            const step = (end - start) / (missing + 1);

            for (let k = 1; k <= missing; k++) {
                out[startIdx + k]!.offset = start + step * k;
            }
            i = endIdx + 1;
        }

        for (const s of out) s.offset = clamp01(s.offset);
        return out as ColorStopCanonical[];
    }
}