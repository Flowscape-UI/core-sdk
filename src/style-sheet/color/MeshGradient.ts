import { Color } from "./Color";
import { clamp01 } from "./utils";

export type MeshPoint = {
    x: number;      // 0..1
    y: number;      // 0..1
    color: Color;
    radius: number; // 0..1 (область влияния)
};

export class MeshGradient {
    public readonly kind = "mesh" as const;
    private readonly _points: MeshPoint[];

    private constructor(points: MeshPoint[]) {
        this._points = points;
    }

    /**
     * Создает градиент из массива точек
     */
    public static fromPoints(points: MeshPoint[]): MeshGradient {
        if (points.length === 0) {
            throw new Error("[MeshGradient] At least one point is required");
        }
        return new MeshGradient(points);
    }

    /**
     * Валидация строки: mesh-gradient(...)
     */
    public static isValidString(s: string): boolean {
        const trimmed = s.trim();
        return trimmed.startsWith("mesh-gradient(") && trimmed.endsWith(")");
    }

    /**
     * Парсинг строки. 
     * Формат: mesh-gradient(circle 0.5 at 20% 20% red, circle 0.3 at 80% 80% blue)
     */
    public static fromString(input: string): MeshGradient {
        if (!this.isValidString(input)) {
            throw new Error(`[MeshGradient] Invalid mesh-gradient string: "${input}"`);
        }

        const start = input.indexOf("(");
        const end = input.lastIndexOf(")");
        const inner = input.slice(start + 1, end).trim();
        
        // Сплит по запятым, игнорируя запятые внутри rgb/rgba
        const pointStrings = inner.split(/,(?![^(]*\))/);

        const points: MeshPoint[] = pointStrings.map(ps => {
        const raw = ps.trim();
        
        // 1. Парсим радиус (теперь разрешаем большие значения, не только до 1.0)
        const radiusMatch = raw.match(/circle\s+([\d.]+)/);
        const radius = radiusMatch ? parseFloat(radiusMatch[1]) : 0.5;

        // 2. ИСПРАВЛЕННЫЙ RegExp: добавили "-?" для поддержки отрицательных координат
        // Ищем: "at", пробелы, опциональный минус, цифры/точки, знак процента
        const posMatch = raw.match(/at\s+(-?[\d.]+)%\s+(-?[\d.]+)%/);
        const x = posMatch ? parseFloat(posMatch[1]) / 100 : 0.5;
        const y = posMatch ? parseFloat(posMatch[2]) / 100 : 0.5;

        const parts = raw.split(/\s+/);
        const colorStr = parts[parts.length - 1];
        
        return {
            // УБИРАЕМ clamp01 для x и y, чтобы они могли быть -0.5 или 1.5
            x: x, 
            y: y,
            radius: radius, // Радиус тоже можно не клампить, если нужны гигантские пятна
            color: Color.fromString(colorStr)
        };
    });

        return new MeshGradient(points);
    }

    // --- API соответствие ---

    public getPoints(): MeshPoint[] {
        return this._points.map(p => ({ ...p }));
    }

    /**
     * Для совместимости с IGradient. 
     * У меша нет линейных стопов, возвращаем пустой массив.
     */
    public getStops(): any[] {
        return [];
    }

    public isRepeating(): boolean {
        return false; // Меш по определению не цикличен в данной реализации
    }
}