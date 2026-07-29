import { NAMED_COLORS } from "./named-color-dictionary";
import { clamp01, clamp255 } from "./utils";


export type FloatRGBA = {
    r: number;
    g: number;
    b: number;
    a: number;
};

export type InputRGBA = {
    r: number;
    g: number;
    b: number;
    a?: number;
};



export class Color {
    private _value: FloatRGBA;

    private constructor(r: number = 1, g: number = 0, b: number = 0, a: number = 1) {
        this._value = {
            r: clamp01(r),
            g: clamp01(g),
            b: clamp01(b),
            a: clamp01(a),
        };
    }

    // ============================
    // FACTORIES
    // ============================
    public static isValidString(s: string): boolean {
        try {
            this.fromString(s);
            return true;
        } catch {
            return false;
        }
    }

    public static fromFloat(r: number = 1, g: number = 0, b: number = 0, a: number = 1): Color {
        return new Color(r, g, b, a);
    }

    public static fromRGBA(r: number, g: number, b: number, a = 1) {
        const rr = clamp255(r);
        const gg = clamp255(g);
        const bb = clamp255(b);
        const aa = clamp01(a);
        return new Color(rr / 255, gg / 255, bb / 255, aa);
    }

    public static fromHex(hex: string) {
        const c = new Color();
        c.setFromHex(hex);
        return c;
    }

    public static fromString(input: string) {
        const c = new Color();
        c.setFromString(input);
        return c;
    }

    // ============================
    // SETTERS
    // ============================

    public setColorFloat(v: Partial<FloatRGBA>) {
        if (v.r !== undefined) this._value.r = clamp01(v.r);
        if (v.g !== undefined) this._value.g = clamp01(v.g);
        if (v.b !== undefined) this._value.b = clamp01(v.b);
        if (v.a !== undefined) this._value.a = clamp01(v.a);
        return this;
    }

    public setColorRGBA(r: number, g: number, b: number, a = 1) {
        if([ r, g, b, a ].some(x => isNaN(x))) {
            throw new Error(`Invalid color values: r=${r}, g=${g}, b=${b}, a=${a}`);
        }
        if([ r, g, b ].some(x => x < 0 || x > 255)) {
            throw new Error(`RGB values must be in 0-255 range: r=${r}, g=${g}, b=${b}`);
        }
        if(a < 0 || a > 1) {
            throw new Error(`Alpha value must be in 0-1 range: a=${a}`);
        }
        
        this._value = {
            r: clamp01(clamp255(r) / 255),
            g: clamp01(clamp255(g) / 255),
            b: clamp01(clamp255(b) / 255),
            a: clamp01(a),
        };
        return this;
    }

    public setFromHex(hex: string) {
        const h = hex.trim().replace(/^#/, '');

        if (![3, 6, 8].includes(h.length)) {
            throw new Error(`Invalid hex length: ${hex}`);
        }

        // #RGB
        // MIN allowed length is 3 (e.g. #F00) and max is 8 (e.g. #FF000080)
        if (h.length === 3) {
            return this.setColorRGBA(
                parseInt(h.charAt(0) + h.charAt(0), 16),
                parseInt(h.charAt(1) + h.charAt(1), 16),
                parseInt(h.charAt(2) + h.charAt(2), 16)
            );
        }

        // Default to #RRGGBB
        if (h.length === 6) {
            return this.setColorRGBA(
                parseInt(h.slice(0, 2), 16),
                parseInt(h.slice(2, 4), 16),
                parseInt(h.slice(4, 6), 16)
            );
        }

        // If length is 8, treat as #RRGGBBAA
        if (h.length === 8) {
            return this.setColorRGBA(
                parseInt(h.slice(0, 2), 16),
                parseInt(h.slice(2, 4), 16),
                parseInt(h.slice(4, 6), 16),
                parseInt(h.slice(6, 8), 16) / 255
            );
        }

        throw new Error(`Invalid hex color: ${hex}`);
    }

    public setFromString(input: string) {
        const s = input.trim().toLowerCase();

        if (s.startsWith('#')) {
            return this.setFromHex(s);
        }

        if (s.startsWith('rgb(') || s.startsWith('rgba(')) {
            const inside = s.slice(s.indexOf('(') + 1, -1);
            const parts = inside.split(',').map(x => x.trim());

            const r = Number(parts[0]);
            const g = Number(parts[1]);
            const b = Number(parts[2]);
            const a = parts[3] !== undefined ? Number(parts[3]) : 1;

            return this.setColorRGBA(r, g, b, a);
        }

        const hex = NAMED_COLORS[s];
        if (hex) {
            return this.setFromHex(hex);
        }

        throw new Error(`Unsupported color format: ${input}`);
    }

    // ============================
    // GETTERS
    // ============================

    public getFloat(): FloatRGBA {
        return { ...this._value };
    }

    public getRGBA(): InputRGBA {
        return {
            r: clamp255(this._value.r * 255),
            g: clamp255(this._value.g * 255),
            b: clamp255(this._value.b * 255),
            a: this._value.a ?? 1,
        };
    }

    public toRgbString(): string {
        const { r, g, b } = this.getRGBA();
        return `rgb(${r}, ${g}, ${b})`;
    }

    public toRgbaString(): string {
        const { r, g, b, a } = this.getRGBA();
        const aa = a === undefined ? 1 : Math.round(a * 1000) / 1000;
        return `rgba(${r}, ${g}, ${b}, ${aa})`;
    }

    public toHexString(includeAlpha = false): string {
        const { r, g, b, a } = this.getRGBA();
        const hex = (n: number) => n.toString(16).padStart(2, '0');

        if (includeAlpha) {
            return `#${hex(r)}${hex(g)}${hex(b)}${hex(Math.round((a ?? 1) * 255))}`;
        }

        return `#${hex(r)}${hex(g)}${hex(b)}`;
    }

    public toString(showAlpha = false) {
        return showAlpha ? this.toRgbaString() : this.toRgbString();
    }

    // ============================
    // UTILITIES
    // ============================

    public reset() {
        this._value = { r: 1, g: 0, b: 0, a: 1 };
        return this;
    }

    public equals(other: Color): boolean {
        const a = this._value;
        const b = other._value;

        return (
            a.r === b.r &&
            a.g === b.g &&
            a.b === b.b &&
            a.a === b.a
        );
    }

    // линейная интерполяция (для анимаций / градиентов)
    public static lerp(c1: Color, c2: Color, t: number): Color {
        const a = c1._value;
        const b = c2._value;

        return new Color(
            a.r + (b.r - a.r) * t,
            a.g + (b.g - a.g) * t,
            a.b + (b.b - a.b) * t,
            a.a + (b.a - a.a) * t
        );
    }
}