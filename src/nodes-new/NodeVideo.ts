import { NodeImage } from './NodeImage';
import type { INodeVideo } from './types/INodeVideo';
import type { NodeVideoOptions } from './types/NodeVideoOptions';

export class NodeVideo extends NodeImage implements INodeVideo {
    private _autoplay: boolean;
    private _loop: boolean;
    private _muted: boolean;

    constructor(params: NodeVideoOptions) {
        super(params);

        this._autoplay = params.autoplay ?? true;
        this._loop = params.loop ?? true;
        this._muted = params.muted ?? true;
    }

    public getAutoplay(): boolean {
        return this._autoplay;
    }

    public setAutoplay(value: boolean): void {
        this._autoplay = value;
    }

    public getLoop(): boolean {
        return this._loop;
    }

    public setLoop(value: boolean): void {
        this._loop = value;
    }

    public getMuted(): boolean {
        return this._muted;
    }

    public setMuted(value: boolean): void {
        this._muted = value;
    }
}