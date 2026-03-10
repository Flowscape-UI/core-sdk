import type { INodeImage } from './INodeImage';

export interface INodeVideo extends INodeImage {
    getAutoplay(): boolean;
    setAutoplay(value: boolean): void;

    getLoop(): boolean;
    setLoop(value: boolean): void;

    getMuted(): boolean;
    setMuted(value: boolean): void;
}