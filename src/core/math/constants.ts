/**
 * Mathematical constants for engine core.
 * Все значения подобраны с учётом WebGL / float32 совместимости.
 */

/* -------------------------------------------------- */
/*                     Angles                         */
/* -------------------------------------------------- */

/** π = 3.141592653589... */
export const PI = Math.PI;

/** 2π (full rotation / полный оборот) */
export const TAU = Math.PI * 2;

/** π / 2 */
export const HALF_PI = Math.PI / 2;

/** π / 4 */
export const QUARTER_PI = Math.PI / 4;

/** Degree → Radian multiplier */
export const DEG_TO_RAD = Math.PI / 180;

/** Radian → Degree multiplier */
export const RAD_TO_DEG = 180 / Math.PI;

/* -------------------------------------------------- */
/*                    Epsilon                         */
/* -------------------------------------------------- */

/**
 * Small epsilon for float comparisons.
 * Используется для сравнения чисел с плавающей точкой.
 */
export const EPSILON = 1e-6;

/**
 * Более строгий epsilon (например для геометрии)
 */
export const EPSILON_STRICT = 1e-9;

/* -------------------------------------------------- */
/*                  Float32 limits                    */
/* -------------------------------------------------- */

/**
 * Maximum float32 value.
 * (совместимо с Rust f32 / WebGL)
 */
export const FLOAT32_MAX = 3.4028235e38;

/**
 * Minimum float32 value (negative)
 */
export const FLOAT32_MIN = -3.4028235e38;

/**
 * Minimum positive float32 (denormalized threshold)
 */
export const FLOAT32_EPSILON = 1.1920929e-7;