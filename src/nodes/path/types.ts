import type { Vector2 } from "../../core/transform/types";
import type { IShapeBase } from "../shape";

export enum PathCommandType {
    MoveTo = "move-to",
    LineTo = "line-to",
    QuadTo = "quad-to",
    CubicTo = "cubic-to",
    Close = "close",
}

export type PathMoveToCommand = {
    type: PathCommandType.MoveTo;
    to: Vector2;
};

export type PathLineToCommand = {
    type: PathCommandType.LineTo;
    to: Vector2;
};

export type PathQuadToCommand = {
    type: PathCommandType.QuadTo;
    control: Vector2;
    to: Vector2;
};

export type PathCubicToCommand = {
    type: PathCommandType.CubicTo;
    control1: Vector2;
    control2: Vector2;
    to: Vector2;
};

export type PathCloseCommand = {
    type: PathCommandType.Close;
};

export type PathCommand =
    | PathMoveToCommand
    | PathLineToCommand
    | PathQuadToCommand
    | PathCubicToCommand
    | PathCloseCommand;


export interface INodePath extends IShapeBase {
    /**
     * Returns the list of path commands that define the geometry of this path.
     *
     * The returned commands describe the vector structure of the shape
     * using move, line, quadratic and cubic Bézier segments.
     *
     * Возвращает список команд пути, определяющих геометрию данного пути.
     *
     * Возвращаемые команды описывают векторную структуру фигуры
     * с помощью сегментов перемещения, линии, квадратичных и кубических кривых Безье.
     */
    getCommands(): PathCommand[];

    /**
     * Replaces the current path geometry with a new list of commands.
     *
     * This method fully overwrites the existing vector structure
     * of the path.
     *
     * Заменяет текущую геометрию пути новым набором команд.
     *
     * Метод полностью перезаписывает существующую векторную структуру пути.
     */
    setCommands(value: PathCommand[]): void;


    /**
     * Starts a new subpath at the specified point.
     *
     * This command moves the drawing cursor without creating a segment.
     *
     * Начинает новый подпуть в указанной точке.
     *
     * Эта команда перемещает курсор рисования без создания сегмента.
     */
    moveTo(to: Vector2): void;

    /**
     * Adds a straight line segment from the current point
     * to the specified point.
     *
     * Добавляет прямой сегмент линии от текущей точки
     * к указанной точке.
     */
    lineTo(to: Vector2): void;

    /**
     * Adds a quadratic Bézier curve segment.
     *
     * The curve is defined by a single control point and
     * an end point.
     *
     * Добавляет сегмент квадратичной кривой Безье.
     *
     * Кривая определяется одной управляющей точкой
     * и конечной точкой.
     */
    quadTo(control: Vector2, to: Vector2): void;

    /**
     * Adds a cubic Bézier curve segment.
     *
     * The curve is defined by two control points and
     * an end point.
     *
     * Добавляет сегмент кубической кривой Безье.
     *
     * Кривая определяется двумя управляющими точками
     * и конечной точкой.
     */
    cubicTo(control1: Vector2, control2: Vector2, to: Vector2): void;

    /**
     * Closes the current subpath by connecting the last point
     * to the starting point of the subpath.
     *
     * Замыкает текущий подпуть, соединяя последнюю точку
     * с начальной точкой подпути.
     */
    closePath(): void;


    /**
     * Removes all path commands and resets the path geometry.
     *
     * Удаляет все команды пути и сбрасывает геометрию пути.
     */
    clearPath(): void;

    /**
     * Returns true if the last command closes the path.
     *
     * Возвращает true, если последняя команда замыкает путь.
     */
    isClosed(): boolean;


    /**
     * Serializes the path commands into an SVG-compatible path string.
     *
     * The returned string can be used in SVG <path d="..."> attributes
     * or stored for later reconstruction using fromString().
     *
     * Сериализует команды пути в строку SVG path.
     *
     * Полученная строка может использоваться в атрибуте
     * SVG <path d="..."> или сохраняться для последующего
     * восстановления через fromString().
     */
    toString(): string;
}