import type { Color } from "culori";

export enum EffectType {
    None = "none",
    InnerShadow = "inner-shadow",
    DropShadow = "drop-shadow",
    LayerBlur = "layer-blur",
    BackgroundBlur = "background-blur",
    Noise = "noise",
    Texture = "texture",
    Glass = "glass",
}

export interface EffectBase {
    readonly type: EffectType;
    visible: boolean;
}

export interface DropShadowEffect extends EffectBase {
    readonly type: EffectType.DropShadow;
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string | Color;
    opacity: number;
}

export interface InnerShadowEffect extends EffectBase {
    readonly type: EffectType.InnerShadow;
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string | Color;
    opacity: number;
}

export interface LayerBlurEffect extends EffectBase {
    readonly type: EffectType.LayerBlur;
    blur: number;
}

export interface BackgroundBlurEffect extends EffectBase {
    readonly type: EffectType.BackgroundBlur;
    blur: number;
    opacity: number;
}

export type ShapeEffectType =
    | DropShadowEffect
    | InnerShadowEffect
    | LayerBlurEffect
    | BackgroundBlurEffect;