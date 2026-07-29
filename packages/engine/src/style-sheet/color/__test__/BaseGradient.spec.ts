import { describe, it, expect } from "vitest";
import { BaseGradient } from "../BaseGradient";

class BaseGradientTest extends BaseGradient {
    public readonly kind = 'test';
    public parseColorStops(input: string) {
        return BaseGradient._parseColorStops(input);
    }
    public parseString(input: string) {
        return BaseGradient._parseString(input);
    }
}

describe("BaseGradient: _parseColorStops", () => {
    const parser = new BaseGradientTest();

    describe('_parseColorStops()', () => {
        const getOffsets = (input: string) => parser.parseColorStops(input).stops.map(s => s.offset);
    
        it("auto spread (edge 0 -> 1)", () => {
            expect(getOffsets('red, blue')).toEqual([0, 1]);
            expect(getOffsets('red, green, blue')).toEqual([0, 0.5, 1]);
            expect(getOffsets('red, yellow, green, blue')).toEqual([0, 0.333, 0.667, 1]);
        });
    
        it("percent support", () => {
            expect(getOffsets('red 10%, blue 90%')).toEqual([0.1, 0.9]);
            expect(getOffsets('red, green 30%, blue')).toEqual([0, 0.3, 1]);
        });
    
        it("Double-position (red 20% 50%)", () => {
            const stops = parser.parseColorStops('red 20% 50%, blue 80%').stops;
            const offsets = stops.map(s => s.offset);
            
            expect(offsets).toEqual([0.2, 0.5, 0.8]);
            expect(stops[0].color.toString()).toBe(stops[1].color.toString());
        });
    
        it("dificult spread (green, red, cyan 50%, velvet)", () => {
            expect(getOffsets('green, red, cyan 50%, purple')).toEqual([0, 0.25, 0.5, 1]);
        });
    
        it("leaving edges 0..1 (Aurora/Creative scenario)", () => {
            expect(getOffsets('red -20%, blue 120%')).toEqual([-0.2, 1.2]);
        });
    
        it("ignoring commas from split inside rgb/rgba", () => {
            const input = 'rgba(255, 0, 0, 0.5), #00ff00 50%, rgb(0, 0, 255)';
            const stops = parser.parseColorStops(input).stops;
            
            expect(stops).toHaveLength(3);
            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(0.5);
            expect(stops[2].offset).toBe(1);
        });
    
        it("working with large amount of colors (10 colors)", () => {
            const input = 'red, green, blue, cyan, white, black, yellow, pink, orange, gray';
            const offsets = getOffsets(input);
            
            expect(offsets).toHaveLength(10);
            expect(offsets[0]).toBe(0);
            expect(offsets[offsets.length - 1]).toBe(1);
            // First step (1 / 9 ≈ 0.111)
            expect(offsets[1]).toBe(0.111);
        });
    
        it("processing percents with floating point", () => {
            expect(getOffsets('red 10.5%, blue 20.333%')).toEqual([0.105, 0.203]);
        });
    });

    describe('Direction Parsing (Killer Feature)', () => {
        const getDirection = (input: string) => parser.parseColorStops(input).direction;

        it("should return default direction (180) if no direction provided", () => {
            expect(getDirection('red, blue')).toBe(180);
            expect(getDirection('#fff, #000 50%')).toBe(180);
        });

        it("should parse degrees correctly", () => {
            expect(getDirection('90deg, red, blue')).toBe(90);
            expect(getDirection('-45deg, red, blue')).toBe(-45);
            expect(getDirection('0deg, red, blue')).toBe(0);
            expect(getDirection('360deg, red, blue')).toBe(360);
        });

        it("should parse named directions correctly", () => {
            expect(getDirection('to top, red, blue')).toBe(0);
            expect(getDirection('to right, red, blue')).toBe(90);
            expect(getDirection('to bottom, red, blue')).toBe(180);
            expect(getDirection('to left, red, blue')).toBe(270);
            expect(getDirection('to right bottom, red, blue')).toBe(135);
        });

        it("should fallback to default direction if degrees are invalid (NaN protection)", () => {
            // "abcdeg" закончится на "deg", но parseFloat вернет NaN
            expect(getDirection('abcdeg, red, blue')).toBe(180);
        });

        it("should NOT consume color stops that look similar to directions", () => {
            // Это проверка того самого бага с "red 10%"
            const result = parser.parseColorStops('red 10%, blue');
            
            expect(result.direction).toBe(180); // Направление по умолчанию
            expect(result.stops).toHaveLength(2); // Оба цвета должны остаться
            expect(result.stops[0].offset).toBe(0.1); // red 10% успешно распарсился как стоп
        });

        it("combo check: direction + difficult colors", () => {
            const result = parser.parseColorStops('to top left, rgba(255,0,0,0.5) 10%, blue 90%');
            
            expect(result.direction).toBe(315);
            expect(result.stops).toHaveLength(2);
            expect(result.stops[0].offset).toBe(0.1);
            expect(result.stops[1].offset).toBe(0.9);
        });
    });

    // === НОВЫЙ БЛОК ДЛЯ ТЕСТИРОВАНИЯ ВЕРХНЕУРОВНЕВОГО ПАРСЕРА ===
    describe('Multi-layer Parsing (_parseString)', () => {
        it("should return empty array for empty or invalid input", () => {
            expect(parser.parseString("")).toEqual([]);
            expect(parser.parseString("just some random string")).toEqual([]);
            // Если нет слова gradient() - должен игнорировать
            expect(parser.parseString("linear-color(red, blue)")).toEqual([]); 
        });

        it("should parse a single gradient layer", () => {
            const result = parser.parseString("gradient(to right, red, blue)");
            
            expect(result).toHaveLength(1);
            expect(result[0].direction).toBe(90);
            expect(result[0].stops).toHaveLength(2);
            expect(result[0].stops[0].offset).toBe(0);
            expect(result[0].stops[1].offset).toBe(1);
        });

        it("should parse multiple gradient layers correctly", () => {
            const input = "gradient(to top, red, blue), gradient(135deg, green 10%, yellow 90%)";
            const result = parser.parseString(input);
            
            expect(result).toHaveLength(2);

            // Проверяем первый слой
            expect(result[0].direction).toBe(0); // to top
            expect(result[0].stops).toHaveLength(2);

            // Проверяем второй слой
            expect(result[1].direction).toBe(135); // 135deg
            expect(result[1].stops[0].offset).toBe(0.1);
            expect(result[1].stops[1].offset).toBe(0.9);
        });

        it("should handle complex colors (rgba/rgb) within multiple layers", () => {
            const input = "gradient(rgba(255, 255, 255, 0.5) 0%, black 100%), gradient(to left, rgb(255,0,0), transparent)";
            const result = parser.parseString(input);
            
            expect(result).toHaveLength(2);
            
            expect(result[0].direction).toBe(180); // Дефолтное направление, так как не указано
            expect(result[0].stops).toHaveLength(2);
            
            expect(result[1].direction).toBe(270); // to left
            expect(result[1].stops).toHaveLength(2);
        });

        it("should tolerate weird spacing, line breaks, and tabs", () => {
            // Пользователи часто форматируют CSS в несколько строк
            const input = `
                gradient(
                    to right, 
                    red, 
                    blue
                ),
                gradient(
                    green, 
                    yellow
                )
            `;
            const result = parser.parseString(input);
            
            expect(result).toHaveLength(2);
            expect(result[0].direction).toBe(90);
            expect(result[1].direction).toBe(180); // Дефолт
        });
        
        it("should ignore trailing commas or empty definitions safely", () => {
            const input = "gradient(red, blue), gradient(), ";
            const result = parser.parseString(input);
            
            // Ожидаем два слоя, второй будет с пустым массивом стопов (зависит от твоей реализации)
            expect(result).toHaveLength(2);
            expect(result[0].stops).toHaveLength(2);
            expect(result[1].stops).toHaveLength(0); // Если ты возвращаешь пустые стопы для "gradient()"
        });
    });
});