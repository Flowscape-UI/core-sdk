import type { NodeOptions } from './NodeOptions';

export type StrokeAlign = 'inside' | 'center' | 'outside';
export type LineCapType = 'none' | 'round' | 'square';

export type LineEndingType =
    | 'none'
    | 'line-arrow'
    | 'triangle-arrow'
    | 'reversed-triangle'
    | 'circle-arrow'
    | 'diamond-arrow';

export type NodeLineOptions = NodeOptions & {
    startPoint?: { x: number; y: number };
    endPoint?: { x: number; y: number };

    thickness?: number;
    strokeAlign?: StrokeAlign;
    
    lineCapStart?: LineCapType;
    lineCapEnd?: LineCapType;

    startEnding?: LineEndingType;
    endEnding?: LineEndingType;

    stroke?: string;
};