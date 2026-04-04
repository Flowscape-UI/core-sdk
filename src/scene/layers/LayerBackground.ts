import Konva from 'konva';
import { Layer } from './Layer';
import { RenderOrder, type IInvalidatable } from '../../core/interfaces';


export type BackgroundValue = '' | string;

export class LayerBackground extends Layer {
    private readonly _rect: Konva.Rect;

    private _imageNode: Konva.Image | null = null;

    // сохраняем текущий фон, чтобы корректно пересчитать градиент при resize
    private _backgroundValue: BackgroundValue = '';


    private _imageNodeParam: any = {};

    constructor(
        width: number,
        height: number,
        stage: Konva.Stage,
        invalidator: IInvalidatable,
    ) {
        super(
            width,
            height,
            RenderOrder.Background,
            stage,
            invalidator,
        );
        this._rect = new Konva.Rect({
            x: 0,
            y: 0,
            width,
            height,
            fill: 'transparent',
            listening: false,
            perfectDrawEnabled: false,
        });

        this._layer.add(this._rect);
    }

    public render() {
        const v = this._backgroundValue;

        if (this._imageNode) {
            this.setImage(this._imageNodeParam);
        }

        // 1) Solid Color
        if (v === '' || Color.isValidString(v)) {
            this._backgroundReset();
            this._setFillColor(v);
            return;
        }

        // 2) Linear Gradient
        if (LinearGradient.isValidString(v)) {
            this._backgroundReset();
            this._setLinearGradient(v);
            return;
        }

        // 3) Radial Gradient
        if (RadialGradient.isValidString(v)) {
            this._backgroundReset();
            this._setRadialGradient(v);
            return;
        }

        // 4) Conic Gradient
        if (ConicGradient.isValidString(v)) {
            this._backgroundReset();
            this._setConicGradient(v);
            return;
        }

        // 5) Diamond Gradint
        if (DiamondGradient.isValidString(v)) {
            this._backgroundReset();
            this._setDiamondGradient(v);
            return;
        }

        // 6) Mesh gradient
        if (MeshGradient.isValidString(v)) {
            this._backgroundReset();
            this._setMeshGradient(v);
            return;
        }
    }

    public override setSize(width: number, height: number) {
        super.setSize(width, height);
        this._rect.size({ width, height });

        this.requestDraw();
    }

    /**
     * Принимает:
     * - '' -> прозрачный
     * - '#111' / 'rgba(...)' / 'red' -> заливка
     * - 'linear-gradient(...)' -> css-like градиент
     */
    public setBackground(value: BackgroundValue) {
        const v = (value ?? "").trim();
        if(v === this._backgroundValue) {
            return;
        }
        this._backgroundValue = v;
        this.requestDraw();
    }


    public async setImage(options: {
        url: string,
        width?: number,
        height?: number,
        opacity?: number,
    }) {
        this._imageNodeParam = options;
        const img = await this._loadImage(options.url);

        if (this._imageNode) {
            this._imageNode.destroy();
            this._imageNode = null;
        }

        const { width, height, opacity } = options;
        const { width: layerWidth, height: layerHeight } = this.getSize();
        const w = width ?? layerWidth;
        const h = height ?? layerHeight;
        this._imageNode = new Konva.Image({
            x: layerWidth / 2 - w / 2,
            y: layerHeight / 2 - h / 2,
            image: img,
            width: w,
            height: h,
            opacity: opacity ?? 0.5,
            listening: false,
        });

        // картинка поверх заливки/градиента
        this._layer.add(this._imageNode);
        this.requestDraw();
    }

    // ---------- internal (gradient) ----------
    private _setFillColor(value: string): void {
        this._rect.fillPriority("color");

        if (value === "" || value === "transparent") {
            this._rect.fill("transparent");
            return;
        }

        const c = Color.fromString(value);
        this._backgroundValue = c.toString(true);

        this._rect.fill(c.toString(true));
    }


    private _setLinearGradient(value: string): void {
        const g = LinearGradient.fromString(value);
        this._backgroundValue = value;

        this._rect.fillPriority("linear-gradient");

        // Получаем параметры из твоего класса
        const dir = g.getDirection(); // в градусах (0-360)
        const {width, height} = this.getSize();
        const W = width;
        const H = height;

        // 1. Переводим CSS-угол в радианы и корректируем систему координат
        // В CSS 0° - это Up. В Math 0 - это Right.
        // Формула для приведения: (angle - 90) * PI / 180
        const angleRad = ((dir - 90) * Math.PI) / 180;

        // 2. Вычисляем длину вектора, чтобы градиент вписывался в прямоугольник под углом
        // Это гарантирует, что цвета не "уедут", когда прямоугольник не квадратный
        const distance = Math.abs(W * Math.cos(angleRad)) + Math.abs(H * Math.sin(angleRad));

        // 3. Находим центр фигуры
        const centerX = W / 2;
        const centerY = H / 2;

        // 4. Рассчитываем конечные точки вектора относительно центра
        // В CSS градиент идет ОТ цвета К цвету, поэтому инвертируем вектор для end
        const startX = centerX - (Math.cos(angleRad) * distance) / 2;
        const startY = centerY - (Math.sin(angleRad) * distance) / 2;
        const endX = centerX + (Math.cos(angleRad) * distance) / 2;
        const endY = centerY + (Math.sin(angleRad) * distance) / 2;


        this._rect.fillLinearGradientStartPoint({ x: startX, y: startY });
        this._rect.fillLinearGradientEndPoint({ x: endX, y: endY });

        const stops = g.getStops();
        let konvaStops: (number | string)[] = [];

        if (!g.isRepeating()) {
            // обычный градиент
            for (const s of stops) {
                konvaStops.push(s.offset, s.color.toString(true));
            }
        } else {
            const first = stops[0]?.offset ?? 0;
            const last = stops[stops.length - 1]?.offset ?? 1;
            const period = last - first;

            if (!(period > 0)) {
                for (const s of stops) {
                    konvaStops.push(s.offset, s.color.toString(true));
                }
            } else {
                // ---- helper: color at t with repeating ----
                const _colorAt = (t: number): string => {
                    // map t into one period
                    const x = ((t - first) % period + period) % period + first;

                    // find neighbors
                    let left = stops[0];
                    let right = stops[stops.length - 1];

                    for (let i = 0; i < stops.length; i++) {
                        const cur = stops[i];
                        if (cur.offset <= x) left = cur;
                        if (cur.offset >= x) {
                            right = cur;
                            break;
                        }
                    }

                    const denom = right.offset - left.offset;
                    if (!(denom > 0)) return left.color.toString(true);

                    const tt = (x - left.offset) / denom;
                    return Color.lerp(left.color, right.color, tt).toString(true);
                };

                // ---- generate repeated stops inside [0..1] ----
                const kStart = Math.floor((0 - last) / period);
                const kEnd = Math.ceil((1 - first) / period);

                const repeated: Array<{ offset: number; color: string; i: number }> = [];
                let idx = 0;

                for (let k = kStart; k <= kEnd; k++) {
                    const shift = k * period;

                    for (const s of stops) {
                        const o = s.offset + shift;
                        if (o < 0 || o > 1) continue;

                        repeated.push({
                            offset: o,
                            color: s.color.toString(true),
                            i: idx++,
                        });
                    }
                }

                // stable sort (важно для одинаковых offset)
                repeated.sort((a, b) => {
                    const d = a.offset - b.offset;
                    if (d !== 0) return d;
                    return a.i - b.i;
                });

                const EPS = 1e-6;

                // ---- ensure boundary at 0 ----
                if (repeated.length === 0 || Math.abs(repeated[0].offset - 0) > EPS) {
                    repeated.unshift({ offset: 0, color: _colorAt(0), i: -2 });
                }

                // ---- ensure boundary at 1 ----
                const lastIdx = repeated.length - 1;
                if (repeated.length === 0 || Math.abs(repeated[lastIdx].offset - 1) > EPS) {
                    repeated.push({ offset: 1, color: _colorAt(1), i: -1 });
                }

                // re-sort after inserts
                repeated.sort((a, b) => {
                    const d = a.offset - b.offset;
                    if (d !== 0) return d;
                    return a.i - b.i;
                });

                // ---- output for Konva ----
                for (const s of repeated) {
                    konvaStops.push(s.offset, s.color);
                }

                if (konvaStops.length < 4) {
                    konvaStops = [];
                    for (const s of stops) {
                        konvaStops.push(s.offset, s.color.toString(true));
                    }
                }
            }
        }

        this._rect.fillLinearGradientColorStops(konvaStops);
    }

    private _setRadialGradient(value: string): void {
        const g = RadialGradient.fromString(value);
        this._rect.fillLinearGradientColorStops([]);
        this._rect.fillPriority("radial-gradient");

        const config = this._calculateRadialConfig(g);
        this._rect.fillRadialGradientStartPoint(config.center);
        this._rect.fillRadialGradientEndPoint(config.center);
        this._rect.fillRadialGradientStartRadius(0);
        this._rect.fillRadialGradientEndRadius(config.radius);
        this._rect.fillRadialGradientColorStops(this._getKonvaStops(g));
    }

    private _setConicGradient(value: string): void {
        const g = ConicGradient.fromString(value);
        this._backgroundValue = value;

        // Переключаем приоритет на паттерн
        this._rect.fillPriority("pattern");

        // Рендерим градиент в Canvas и устанавливаем как паттерн
        const patternCanvas = this._renderConicToCanvas(g);
        this._rect.fillPatternImage(patternCanvas);
        this._rect.fillPatternRepeat('no-repeat');

        // Выравниваем паттерн (опционально, если нужно смещение)
        this._rect.fillPatternOffsetX(0);
        this._rect.fillPatternOffsetY(0);
    }

    private _setDiamondGradient(value: string): void {
        const g = DiamondGradient.fromString(value);

        // 1. Генерируем канвас с ромбом (используем метод, который я давал выше)
        const canvas = this._renderDiamondToCanvas(g);

        // 2. Устанавливаем приоритет "pattern"
        this._rect.fillPriority("pattern");

        // 3. Передаем канвас как изображение для заливки
        this._rect.fillPatternImage(canvas);

        // 4. Важно: растягиваем паттерн на весь размер прямоугольника
        this._rect.fillPatternRepeat('no-repeat');
        this._rect.fillPatternScale({ x: 1, y: 1 });
        this._rect.fillPatternOffset({ x: 0, y: 0 });
    }

    private _setMeshGradient(value: string): void {
        const g = MeshGradient.fromString(value);
        const pattern = this._renderMeshToCanvas(g);
        this._applyPatternGradient(pattern);
    }


    private _calculateRadialConfig(g: RadialGradient) {
        const {width, height} = this.getSize();
        let cx = width / 2;
        let cy = height / 2;
        const pos = g.getPosition().toLowerCase();

        // Добавляем парсинг процентов!
        const matches = pos.match(/(-?\d+(?:\.\d+)?)%/g);
        if (matches && matches.length >= 2) {
            cx = (parseFloat(matches[0]) / 100) * width;
            cy = (parseFloat(matches[1]) / 100) * height;
        } else {
            if (pos.includes('left')) cx = 0;
            else if (pos.includes('right')) cx = width;
            if (pos.includes('top')) cy = 0;
            else if (pos.includes('bottom')) cy = height;
        }

        const dx = Math.max(cx, width - cx);
        const dy = Math.max(cy, height - cy);
        const radius = Math.sqrt(dx * dx + dy * dy);

        return { center: { x: cx, y: cy }, radius };
    }

    private _getKonvaStops(g: LinearGradient | RadialGradient): (number | string)[] {
        const stops = g.getStops();
        let konvaStops: (number | string)[] = [];

        if (!g.isRepeating()) {
            for (const s of stops) {
                konvaStops.push(s.offset, s.color.toString(true));
            }
        } else {
            // Твой алгоритм генерации repeated стопов (из предыдущего кода)
            // Копируем его сюда один раз, и он работает для обоих типов
            konvaStops = this._calculateRepeatingStops(stops);
        }
        return konvaStops;
    }

    private _calculateRepeatingStops(stops: ColorStopCanonical[]): (number | string)[] {
        const first = stops[0]?.offset ?? 0;
        const last = stops[stops.length - 1]?.offset ?? 1;
        const period = last - first;

        // Если период нулевой, репитинг невозможен, возвращаем как есть
        if (!(period > 0)) {
            return stops.flatMap(s => [s.offset, s.color.toString(true)]);
        }

        const konvaStops: (number | string)[] = [];

        // ---- Вспомогательная функция: цвет в любой точке t с учетом повторения ----
        const _colorAt = (t: number): string => {
            // Зацикливаем t в диапазон [first, last]
            const x = ((t - first) % period + period) % period + first;

            let left = stops[0];
            let right = stops[stops.length - 1];

            for (let i = 0; i < stops.length; i++) {
                const cur = stops[i];
                if (cur.offset <= x) left = cur;
                if (cur.offset >= x) {
                    right = cur;
                    break;
                }
            }

            const denom = right.offset - left.offset;
            if (!(denom > 0)) return left.color.toString(true);

            const tt = (x - left.offset) / denom;
            return Color.lerp(left.color, right.color, tt).toString(true);
        };

        // ---- Генерация повторений внутри [0..1] ----
        // Определяем, сколько периодов нам нужно отмотать назад и вперед
        const kStart = Math.floor((0 - last) / period);
        const kEnd = Math.ceil((1 - first) / period);

        const repeated: Array<{ offset: number; color: string; i: number }> = [];
        let idx = 0;

        for (let k = kStart; k <= kEnd; k++) {
            const shift = k * period;

            for (const s of stops) {
                const o = s.offset + shift;
                // Берем только то, что попадает в видимый диапазон Konva
                if (o < 0 || o > 1) continue;

                repeated.push({
                    offset: o,
                    color: s.color.toString(true),
                    i: idx++,
                });
            }
        }

        // Сортируем по оффсету
        repeated.sort((a, b) => a.offset - b.offset || a.i - b.i);

        const EPS = 1e-6;

        // Гарантируем точку в 0.0
        if (repeated.length === 0 || Math.abs(repeated[0].offset - 0) > EPS) {
            repeated.unshift({ offset: 0, color: _colorAt(0), i: -2 });
        }

        // Гарантируем точку в 1.0
        const lastIdx = repeated.length - 1;
        if (repeated.length === 0 || Math.abs(repeated[lastIdx].offset - 1) > EPS) {
            repeated.push({ offset: 1, color: _colorAt(1), i: -1 });
        }

        // Финальная сортировка после добавления границ
        repeated.sort((a, b) => a.offset - b.offset || a.i - b.i);

        // Формируем плоский массив для Konva [offset, color, offset, color, ...]
        for (const s of repeated) {
            konvaStops.push(s.offset, s.color);
        }

        return konvaStops;
    }

    private _renderConicToCanvas(g: ConicGradient): HTMLCanvasElement {
        const { width, height } = this.getSize();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        // --- ВОТ ЗДЕСЬ МАГИЯ СВЯЗКИ ---
        // Получаем нормализованные координаты (от 0 до 1) из класса градиента
        const { x: normX, y: normY } = g.getNormalizedPosition();

        // Переводим их в реальные пиксели холста
        const cx = normX * width;
        const cy = normY * height;
        // ------------------------------

        const angleAttr = g.getAngle();
        const startAngleDeg = typeof angleAttr === 'number'
            ? angleAttr
            : parseFloat(String(angleAttr).replace(/[^\d.-]/g, '')) || 0;

        const rotationOffset = (startAngleDeg - 90) * (Math.PI / 180);
        const stops = g.getStops();

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - cx;
                const dy = y - cy;

                if (dx === 0 && dy === 0) {
                    // ... (логика центрального пикселя) ...
                    continue;
                }

                let angle = Math.atan2(dy, dx) - rotationOffset;
                while (angle < 0) angle += Math.PI * 2;
                while (angle >= Math.PI * 2) angle -= Math.PI * 2;

                const t = angle / (Math.PI * 2);
                const color = this._getColorAt(g, stops, t);
                const idx = (y * width + x) * 4;

                data[idx] = color.r;
                data[idx + 1] = color.g;
                data[idx + 2] = color.b;
                data[idx + 3] = (color.a ?? 1) * 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    private _renderDiamondToCanvas(g: DiamondGradient): HTMLCanvasElement {
        const {width, height} = this.getSize();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        const { x: normX, y: normY } = g.getNormalizedPosition();
        const cx = normX * width;
        const cy = normY * height;

        // Для Diamond максимальное расстояние — это путь до самого дальнего угла по осям X + Y
        const maxDistX = Math.max(cx, width - cx);
        const maxDistY = Math.max(cy, height - cy);
        const maxDist = maxDistX + maxDistY;

        const stops = g.getStops();

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = Math.abs(x - cx);
                const dy = Math.abs(y - cy);

                // Формула ромба (Манхэттенское расстояние)
                const dist = dx + dy;
                const t = clamp01(dist / maxDist);

                const color = this._getColorAt(g as any, stops, t);
                const idx = (y * width + x) * 4;

                data[idx] = color.r;
                data[idx + 1] = color.g;
                data[idx + 2] = color.b;
                data[idx + 3] = (color.a ?? 1) * 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    private _renderMeshToCanvas(g: MeshGradient): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return canvas;

        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        const points = g.getPoints();

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const nx = x / (size - 1);
                const ny = y / (size - 1);

                let totalWeight = 0;
                let r = 0, g_col = 0, b = 0, a = 0;

                for (const p of points) {
                    const dx = nx - p.x;
                    const dy = ny - p.y;
                    const distSq = dx * dx + dy * dy;

                    const eps = 0.000001;

                    // Используем радиус точки в расчете веса!
                    // Теперь параметр "circle 0.5" реально влияет на размер пятна.
                    const pRadius = p.radius || 0.5;
                    const weight = 1 / (Math.pow(distSq / (pRadius * pRadius), 1.2) + eps);

                    const col = p.color.getRGBA();
                    r += col.r * weight;
                    g_col += col.g * weight;
                    b += col.b * weight;
                    a += (col.a ?? 1) * weight;
                    totalWeight += weight;
                }

                const idx = (y * size + x) * 4;

                // --- ФИНАЛЬНЫЙ ШТРИХ: ШУМ ---
                // Добавляем крошечную случайную вариацию яркости (-1.5 до +1.5 из 255)
                // Это "разбивает" ровные границы цветов.
                const noise = (Math.random() - 0.5) * 3.0;

                data[idx] = (r / totalWeight) + noise;
                data[idx + 1] = (g_col / totalWeight) + noise;
                data[idx + 2] = (b / totalWeight) + noise;
                data[idx + 3] = (a / totalWeight) * 255;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    private _getColorAt(g: ConicGradient, stops: ColorStopCanonical[], t: number) {
        let offset = t;

        // Логика повторения (repeating-conic-gradient)
        if (g.isRepeating()) {
            const first = stops[0].offset;
            const last = stops[stops.length - 1].offset;
            const period = last - first;
            if (period > 0) {
                // Зацикливаем t внутри диапазона [first, last]
                offset = ((((t - first) % period) + period) % period) + first;
            }
        }

        // Поиск двух ближайших стопов
        let left = stops[0];
        let right = stops[stops.length - 1];

        for (let i = 0; i < stops.length; i++) {
            if (stops[i].offset <= offset) {
                left = stops[i];
            }
            if (stops[i].offset >= offset) {
                right = stops[i];
                break; // Нашли правый стоп, выходим
            }
        }

        // Если мы за пределами или стопы совпали
        const dist = right.offset - left.offset;
        if (dist <= 0) return left.color.getRGBA();

        // Вычисляем локальный коэффициент смешивания [0...1]
        const localT = (offset - left.offset) / dist;

        // Используем твой метод интерполяции из класса Color
        return Color.lerp(left.color, right.color, localT).getRGBA();
    }


    private _loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`[LayerBackground] Failed to load image: ${url}`));
            img.src = url;
        });
    }

    private _applyPatternGradient(patternCanvas: HTMLCanvasElement) {
        const {width, height} = this.getSize();
        this._rect.setAttrs({
            fillPriority: 'pattern',
            fillPatternImage: patternCanvas as any,
            fillPatternRepeat: 'no-repeat',
            // Растягиваем паттерн под текущий размер фигуры
            fillPatternScale: {
                x: width / patternCanvas.width,
                y: height / patternCanvas.height
            },
            fillPatternOffset: { x: 0, y: 0 }
        });

        // 2. ГЛАВНОЕ: Konva кэширует текстуру паттерна. 
        // Чтобы анимация пошла, нужно пометить объект как "грязный".
        // this._rect.id(); // Простое обращение к id иногда помогает, но лучше:

        // Если у тебя включен кэш Konva (rect.cache()), его НУЖНО сбросить:
        // this._rect.clearCache(); 

        // 3. Используй draw() вместо batchDraw() для тестов анимации, 
        // чтобы исключить задержки планировщика
        // this._layer.draw();
    }

    private _backgroundReset(): void {
        this._rect.fill("transparent");
        this._rect.fillLinearGradientColorStops([]);
        this._rect.fillRadialGradientColorStops([]);
    }
}