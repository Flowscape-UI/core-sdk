import { NodeType, type ID } from "../../base";
import { NodeImage } from "../image";
import type { INodeVideo } from "./types";

export class NodeVideo extends NodeImage implements INodeVideo {
    private _poster: string;

    private _isAutoplay: boolean;
    private _isLooping: boolean;
    private _isPaused: boolean;

    private _currentFrame: number;
    private _totalFrames: number;

    private _playbackSpeed: number;

    private _currentTime: number;
    private _duration: number;

    private _volume: number;
    private _cachedVolume: number;
    private _isMuted: boolean;

    constructor(id: ID, name?: string) {
        super(id, name ?? "Video", NodeType.Video);

        this._poster = "";

        this._isAutoplay = false;
        this._isLooping = false;
        this._isPaused = true;

        this._currentFrame = 0;
        this._totalFrames = 0;

        this._playbackSpeed = 1;

        this._currentTime = 0;
        this._duration = 0;

        this._volume = 0.2;
        this._cachedVolume = this._volume;
        this._isMuted = false;
    }



    /***********************************************************/
    /*                      Source / Meta                      */
    /***********************************************************/
    public override setSrc(value: string): void {
        const prev = this.getSrc();
        super.setSrc(value);

        if (prev === this.getSrc()) {
            return;
        }

        this._resetPlaybackState();

        if (!value) {
            return;
        }

        void this._loadVideoMetadata(value);
    }

    public getDuration(): number {
        return this._duration;
    }

    public getCurrentTime(): number {
        return this._currentTime;
    }

    public setCurrentTime(value: number): void {
        const next = Math.max(0, Math.min(this._duration || 0, value));

        if (next === this._currentTime) {
            return;
        }

        this._currentTime = next;
    }

    public getCurrentFrame(): number {
        return this._currentFrame;
    }

    public getTotalFrames(): number {
        return this._totalFrames;
    }



    /***********************************************************/
    /*                         Playback                        */
    /***********************************************************/
    public isAutoplay(): boolean {
        return this._isAutoplay;
    }

    public setAutoplay(value: boolean): void {
        if (value === this._isAutoplay) {
            return;
        }

        this._isAutoplay = value;
    }

    public isLooping(): boolean {
        return this._isLooping;
    }

    public setLooping(value: boolean): void {
        if (value === this._isLooping) {
            return;
        }

        this._isLooping = value;
    }

    public isPaused(): boolean {
        return this._isPaused;
    }

    public play(): void {
        if (!this._isPaused) {
            return;
        }

        this._isPaused = false;
    }

    public pause(): void {
        if (this._isPaused) {
            return;
        }

        this._isPaused = true;
    }

    public getPlaybackSpeed(): number {
        return this._playbackSpeed;
    }

    public setPlaybackSpeed(value: number): void {
        const next = Math.max(0.1, value);

        if (next === this._playbackSpeed) {
            return;
        }

        this._playbackSpeed = next;
    }



    /***********************************************************/
    /*                          Volume                         */
    /***********************************************************/
    public isMuted(): boolean {
        return this._isMuted;
    }

    public getVolume(): number {
        return this._volume;
    }

    public setVolume(value: number): void {
        const volume = Math.max(0, value);

        if (volume === this._volume) {
            return;
        }

        this._volume = volume;
        this._cachedVolume = volume;
        this._isMuted = volume === 0;
    }

    public mute(): void {
        if (this._isMuted) {
            return;
        }

        this._isMuted = true;
        this._volume = 0;
    }

    public unmute(): void {
        if (!this._isMuted) {
            return;
        }

        this._isMuted = false;
        this._volume = this._cachedVolume > 0 ? this._cachedVolume : 0.2;
    }



    /***********************************************************/
    /*                         Poster                          */
    /***********************************************************/
    public getPoster(): string {
        return this._poster;
    }

    public setPoster(value: string): void {
        if (value === this._poster) {
            return;
        }

        this._poster = value;
    }



    /***********************************************************/
    /*                         Helpers                         */
    /***********************************************************/
    private _resetPlaybackState(): void {
        this._isPaused = true;
        this._currentTime = 0;
        this._currentFrame = 0;
        this._totalFrames = 0;

        this._duration = 0;
        this.setSize(0, 0);
    }

    private async _loadVideoMetadata(src: string): Promise<void> {
        if (typeof document === "undefined") {
            return;
        }

        const video = document.createElement("video");

        video.preload = "metadata";
        video.src = src;

        await new Promise<void>((resolve) => {
            const cleanup = () => {
                video.onloadedmetadata = null;
                video.onerror = null;
            };

            video.onloadedmetadata = () => {
                cleanup();
                resolve();
            };

            video.onerror = () => {
                cleanup();
                resolve();
            };
        });

        if (!Number.isFinite(video.duration)) {
            return;
        }

        this._duration = video.duration;
        this.setSize(video.videoWidth || 0, video.videoHeight || 0);

        // Exact total frame count is usually not available from plain HTMLVideoElement metadata.
        // Keep 0 for now until a dedicated renderer/player layer provides frame-accurate data.
        this._totalFrames = 0;
        this._currentFrame = 0;
    }
}