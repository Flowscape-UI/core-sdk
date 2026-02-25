export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const clamp255 = (v: number) => Math.min(255, Math.max(0, Math.round(v)));