import type { INodeRect } from "../types";

export enum ImageFit {
    Fill = "fill",
    Contain = "contain",
    Cover = "cover",
    None = "none",
}

export interface INodeImage extends INodeRect {
    /**
     * Returns the source URL of the image.
     *
     * Возвращает URL источника изображения.
     */
    getSrc(): string;

    /**
     * Sets the source URL of the image.
     *
     * Устанавливает URL источника изображения.
     */
    setSrc(value: string): void;


    /**
     * Returns the alternative text of the image.
     *
     * Возвращает альтернативный текст изображения.
     */
    getAlt(): string;

    /**
     * Sets the alternative text of the image.
     *
     * Устанавливает альтернативный текст изображения.
     */
    setAlt(value: string): void;


    /**
     * Returns the image fitting mode inside the node bounds.
     *
     * Возвращает режим вписывания изображения в границы ноды.
     */
    getFit(): ImageFit;

    /**
     * Sets the image fitting mode inside the node bounds.
     *
     * Устанавливает режим вписывания изображения в границы ноды.
     */
    setFit(value: ImageFit): void;
}