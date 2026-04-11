import { Color } from "./Color";
import type {
    ColorStopCanonical,
    GradientOption,
} from "./types";
import type { IGradient } from "./types/IGradient";

export abstract class BaseGradient implements IGradient {
    private static _directionsMap: Record<string, number> = {
        'to top': 0,
        'to right': 90,
        'to bottom': 180,
        'to left': 270,
        'to top right': 45,
        'to bottom right': 135,
        'to bottom left': 225,
        'to top left': 315,
        'to right top': 45,
        'to right bottom': 135,
        'to left bottom': 225,
        'to left top': 315,
    }

    private static _stops: ColorStopCanonical[];
    private static _isRepeating: boolean;

    private static readonly _defaultDirection: number = 180;

    constructor(stops: ColorStopCanonical[]) {
        BaseGradient._stops = stops;
        BaseGradient._isRepeating = false;
    }

    public getStops(): ColorStopCanonical[] {
        const stopsCopy = BaseGradient._stops.map(s => s);
        return stopsCopy;
    }

    public isRepeating(): boolean {
        return BaseGradient._isRepeating;
    }

    public setRepeating(value: boolean): void {
        BaseGradient._isRepeating = value;
    }

    public static isDirection(direction: string | number): boolean {
        if (typeof direction === 'number') {
            if (!Number.isNaN(direction) && Number.isFinite(direction)) {
                return true;
            }

            return false;
        }

        const d = direction.toLowerCase().trim();
        if (d.endsWith('deg')) {
            const parsed = parseFloat(d);
            return Number.isNaN(parsed) || !Number.isFinite(parsed) ? false : true;
        }

        return this._directionsMap[d] !== undefined;
    }


    protected static _parseString(input: string): GradientOption[] {
        const values = BaseGradient._extractGradientValues(input);

        if (values.length === 0) {
            return [];
        }

        return values.map((value) => this._parseColorStops(value));
    }

    // Example input: red, blue 50%, green
    protected static _parseColorStops(input: string): GradientOption {
        // 1. Сплитим по запятым, игнорируя их внутри rgb/rgba/hsl
        const parts = input.split(/,(?![^(]*\))/).map(p => p.trim());

        if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
            return {
                direction: this._defaultDirection,
                stops: [],
            };
        }

        // 1) Extract direction if it's first argument
        let direction = this._defaultDirection;

        if (parts.length > 0) {
            const firstPart = parts[0]!.toLowerCase();

            // Проверяем: это градусы ИЛИ это одно из зарезервированных слов направления
            const isDeegrees = firstPart.endsWith('deg');
            const isNamedDirection = firstPart.startsWith('to ') && this._directionsMap[firstPart] !== undefined;

            if (isDeegrees || isNamedDirection) {
                const directionStr = parts.shift()!;
                direction = this._parseDirection(directionStr);
            }
        }

        // 2) Extract color stops
        const intermediateStops: { offset: number | null, color: Color }[] = [];

        for (const part of parts) {
            // Ищем все проценты в подстроке
            const percentMatches = part.match(/(-?[\d.]+)%/g);
            const colorStr = part.replace(/(-?[\d.]+)%/g, '').trim();
            const color = Color.fromString(colorStr);

            if (percentMatches && percentMatches.length >= 2) {
                // Double-position stop: "red 20% 50%"
                percentMatches.forEach(m => {
                    intermediateStops.push({
                        offset: Math.round((parseFloat(m) / 100) * 1000) / 1000,
                        color: color
                    });
                });
            } else {
                // Обычный стоп: "red 20%" или просто "red"
                const offset = percentMatches
                    ? Math.round((parseFloat(percentMatches[0]) / 100) * 1000) / 1000
                    : null;

                intermediateStops.push({ offset, color });
            }
        }

        // 2. Гарантируем края (если не заданы явно)
        if (intermediateStops[0]?.offset === null) intermediateStops[0].offset = 0;
        if (intermediateStops[intermediateStops.length - 1]?.offset === null) {
            intermediateStops[intermediateStops.length - 1]!.offset = 1;
        }

        // 3. Заполняем пропуски (null) линейной интерполяцией
        for (let i = 0; i < intermediateStops.length; i++) {
            if (intermediateStops[i]!.offset === null) {
                let leftIdx = i - 1;
                while (leftIdx >= 0 && intermediateStops[leftIdx]!.offset === null) leftIdx--;

                let rightIdx = i + 1;
                while (rightIdx < intermediateStops.length && intermediateStops[rightIdx]!.offset === null) rightIdx++;

                const startOffset = intermediateStops[leftIdx]!.offset!;
                const endOffset = intermediateStops[rightIdx]!.offset!;
                const steps = rightIdx - leftIdx;

                const val = startOffset + (endOffset - startOffset) * ((i - leftIdx) / steps);
                intermediateStops[i]!.offset = Math.round(val * 1000) / 1000;
            }
        }

        return {
            direction,
            stops: intermediateStops as ColorStopCanonical[],
        };
    }


    // Helpers
    private static _extractGradientValues(input: string): string[] {
        const values: string[] = [];
        const marker = "gradient(";
        let i = 0;

        while (i < input.length) {
            // Ищем начало маркера "gradient("
            const startIdx = input.indexOf(marker, i);
            if (startIdx === -1) break;

            const openBracketIdx = startIdx + marker.length - 1; // Индекс '('

            // Находим закрывающую скобку с учетом вложенности (для rgba и прочего)
            let bracketLevel = 0;
            let contentEnd = -1;

            for (let j = openBracketIdx; j < input.length; j++) {
                if (input[j] === '(') bracketLevel++;
                else if (input[j] === ')') bracketLevel--;

                if (bracketLevel === 0) {
                    contentEnd = j;
                    break;
                }
            }

            if (contentEnd !== -1) {
                // Извлекаем контент (пропускаем саму открывающую скобку)
                const content = input.substring(openBracketIdx + 1, contentEnd).trim();
                values.push(content);

                // Сдвигаем указатель за закрывающую скобку
                i = contentEnd + 1;
            } else {
                // Если баланс скобок нарушен — выходим
                break;
            }
        }

        return values;
    }

    private static _parseDirection(direction: string | number): number {
        if (typeof direction === 'number') {
            if (
                !Number.isNaN(direction) &&
                Number.isFinite(direction)
            ) {
                return direction;
            }

            return this._defaultDirection;
        }

        const d = direction.toLowerCase().trim();
        if (d.endsWith('deg')) {
            const parsed = parseFloat(d);
            return Number.isNaN(parsed) || !Number.isFinite(parsed) ? this._defaultDirection : parsed;
        }

        return this._directionsMap[d] ?? this._defaultDirection;
    }
}