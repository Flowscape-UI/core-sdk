/**
 * Mathematical constants for engine core.
 * Compatible with WebGL / float32.
 *
 * Математические константы для ядра движка.
 * Все значения совместимы с WebGL / float32.
 */

/******************************************************/
/*                     Angles                         */
/******************************************************/

/** π = 3.141592653589... */
export const PI = Math.PI;

/** Full rotation (2π). / Полный оборот (2π). */
export const TAU = Math.PI * 2;

/** Half of π. / Половина π. */
export const HALF_PI = Math.PI / 2;

/** Quarter of π. / Четверть π. */
export const QUARTER_PI = Math.PI / 4;

/** Multiplier to convert degrees to radians. / Множитель для перевода градусов в радианы. */
export const DEG_TO_RAD = Math.PI / 180;

/** Multiplier to convert radians to degrees. / Множитель для перевода радиан в градусы. */
export const RAD_TO_DEG = 180 / Math.PI;



/******************************************************/
/*                    Epsilon                         */
/******************************************************/

/**
 * Small epsilon for floating point comparisons.
 *
 * Малый эпсилон для сравнения чисел с плавающей точкой.
 */
export const EPSILON = 1e-6;

/**
 * Strict epsilon for geometry and precision-sensitive comparisons.
 *
 * Строгий эпсилон для геометрии и вычислений требующих высокой точности.
 */
export const EPSILON_STRICT = 1e-9;



/******************************************************/
/*                  Float32 limits                    */
/******************************************************/

/**
 * Maximum float32 value. Compatible with Rust f32 / WebGL.
 *
 * Максимальное значение float32. Совместимо с Rust f32 / WebGL.
 */
export const FLOAT32_MAX = 3.4028235e38;

/**
 * Minimum float32 value (negative).
 *
 * Минимальное значение float32 (отрицательное).
 */
export const FLOAT32_MIN = -3.4028235e38;

/**
 * Smallest positive float32 value (denormalized threshold).
 *
 * Наименьшее положительное значение float32 (порог денормализации).
 */
export const FLOAT32_EPSILON = 1.1920929e-7;