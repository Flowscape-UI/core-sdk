import {
    type ColorStopCanonical,
    type GradientOption,
} from "./types"
import { BaseGradient } from "./BaseGradient";
import { replaceMarkersFromInputString } from "./utils/replace-markers-from-input-string";

export class LinearGradient extends BaseGradient {
    private _direction: number;

    private constructor(stops: ColorStopCanonical[], direction: number) {
        super(stops);

        this._direction = direction;
    }

    public getDirection(): number {
        return this._direction;
    }

    public static fromString(input: string) {
        const isRepeating = input.toLowerCase().includes('repeating-linear');

        const markers = isRepeating ? ['repeating-linear-gradient()'] : ['linear-gradient()'];
        const normalized = replaceMarkersFromInputString(input, markers, 'gradient()');

        const parsed = this._parseString(normalized);

        if (parsed === undefined || parsed.length === 0) {
            throw new Error('No valid gradient string');
        }

        return this.fromStops(parsed[0]!, isRepeating);
    }

    public static fromStops(inputs: GradientOption, isRepeating: boolean = false) {
        if (!isRepeating) {
            const g = new LinearGradient(inputs.stops, inputs.direction);
            g.setRepeating(false)
            return g;
        }

        const originalStops = [...inputs.stops].sort((a, b) => a.offset - b.offset);
        const firstStop = originalStops[0];
        const lastStop = originalStops[originalStops.length - 1];

        // Вычисляем длину одного цикла (период)
        const cycleLength = lastStop!.offset - firstStop!.offset;

        // Если все стопы в одной точке, мы не можем зациклить
        if (cycleLength <= 0) {
            return new LinearGradient(inputs.stops, inputs.direction);
        }

        const repeatedStops: ColorStopCanonical[] = [];

        // Определяем, сколько циклов нам нужно в обе стороны, чтобы покрыть [0, 1]
        // Идем от -N до +N периодов
        const startShift = Math.floor(-lastStop!.offset / cycleLength);
        const endShift = Math.ceil((1 - firstStop!.offset) / cycleLength);

        for (let i = startShift; i <= endShift; i++) {
            const shift = i * cycleLength;

            for (const stop of originalStops) {
                const newOffset = stop.offset + shift;

                // Добавляем только те стопы, которые попадают в видимый диапазон [0, 1]
                // Допускаем небольшую погрешность для точности границ
                if (newOffset >= -0.001 && newOffset <= 1.001) {
                    repeatedStops.push({
                        color: stop.color,
                        offset: Math.max(0, Math.min(1, newOffset))
                    });
                }
            }
        }

        // Финальная сортировка для Canvas
        const finalStops = repeatedStops.sort((a, b) => a.offset - b.offset);

        const g = new LinearGradient(finalStops, inputs.direction);
        g.setRepeating(true);
        return g;
    }

    public static isValidString(s: string): boolean {
        try {
            this.fromString(s);
            return true;
        } catch {
            return false;
        }
    }
}