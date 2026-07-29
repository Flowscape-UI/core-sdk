import type { INodeImage } from "../image";

export interface INodeVideo extends INodeImage {
    /**
     * Returns the total duration of the video in seconds.
     *
     * Возвращает общую длительность видео в секундах.
     */
    getDuration(): number;

    /**
     * Returns the current playback time in seconds.
     *
     * Возвращает текущее время воспроизведения в секундах.
     */
    getCurrentTime(): number;

    /**
     * Sets the current playback time in seconds.
     *
     * Устанавливает текущее время воспроизведения в секундах.
     */
    setCurrentTime(value: number): void;


    /**
     * Returns the index of the currently displayed frame.
     *
     * Возвращает индекс текущего отображаемого кадра.
     */
    getCurrentFrame(): number;

    /**
     * Returns the total number of frames in the video if available.
     *
     * Возвращает общее количество кадров в видео, если доступно.
     */
    getTotalFrames(): number;


    /***********************************************************/
    /*                         Playback                        */
    /***********************************************************/

    /**
     * Returns whether the video should start playing automatically.
     *
     * Возвращает, должен ли видео запускаться автоматически.
     */
    isAutoplay(): boolean;

    /**
     * Enables or disables automatic playback of the video.
     *
     * Включает или отключает автоматический запуск видео.
     */
    setAutoplay(value: boolean): void;

    /**
     * Returns whether the video is set to loop.
     *
     * Возвращает, зациклено ли воспроизведение видео.
     */
    isLooping(): boolean;

    /**
     * Enables or disables looping of the video.
     *
     * Включает или отключает зацикливание видео.
     */
    setLooping(value: boolean): void;

    /**
     * Returns whether the video playback is currently paused.
     *
     * Возвращает, находится ли воспроизведение видео на паузе.
     */
    isPaused(): boolean;

    /**
     * Starts or resumes video playback.
     *
     * Запускает или возобновляет воспроизведение видео.
     */
    play(): void;

    /**
     * Pauses the video playback.
     *
     * Ставит воспроизведение видео на паузу.
     */
    pause(): void;

    /**
     * Returns the playback speed multiplier.
     *
     * Возвращает множитель скорости воспроизведения.
     */
    getPlaybackSpeed(): number;

    /**
     * Sets the playback speed multiplier.
     *
     * Устанавливает скорость воспроизведения.
     */
    setPlaybackSpeed(value: number): void;


    /***********************************************************/
    /*                          Volume                         */
    /***********************************************************/

    /**
     * Returns whether the video is muted.
     *
     * Возвращает, отключён ли звук видео.
     */
    isMuted(): boolean;

    /**
     * Returns the current volume level.
     *
     * Возвращает текущий уровень громкости.
     */
    getVolume(): number;

    /**
     * Sets the volume level.
     *
     * Устанавливает уровень громкости.
     */
    setVolume(value: number): void;

    /**
     * Mutes the video.
     *
     * Отключает звук видео.
     */
    mute(): void;

    /**
     * Restores the volume and unmutes the video.
     *
     * Восстанавливает громкость и включает звук видео.
     */
    unmute(): void;


    /***********************************************************/
    /*                         Poster                          */
    /***********************************************************/

    /**
     * Returns the poster image shown before the video starts.
     *
     * Возвращает изображение-постер, отображаемое до запуска видео.
     */
    getPoster(): string;

    /**
     * Sets the poster image displayed before the video starts.
     *
     * Устанавливает изображение-постер для видео.
     */
    setPoster(value: string): void;
}