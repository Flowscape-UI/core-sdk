import type { ColorStopCanonical } from ".";

export interface IGradient {
    getStops(): ColorStopCanonical[];
    isRepeating(): boolean;
    setRepeating(value: boolean): void;
}