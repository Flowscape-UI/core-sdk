/**
 * Типы для Ruler плагинов
 */

/**
 * Направляющая линия на линейке
 */
export interface RulerGuide {
  /** Координата в мировых единицах */
  worldCoord: number;
  /** Имя направляющей (опционально) */
  name?: string;
  /** Толщина линии (опционально) */
  strokeWidth?: number;
  /** Цвет линии (опционально) */
  stroke?: string;
}

/**
 * Тип направляющей (горизонтальная или вертикальная)
 */
export type RulerGuideType = 'h' | 'v';

/**
 * Информация об активной направляющей
 */
export interface ActiveGuideInfo {
  type: RulerGuideType;
  coord: number;
}
