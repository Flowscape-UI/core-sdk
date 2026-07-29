import type { IModuleBaseLayerUI } from "../base";

export interface IRulerGuideLine {
    getId(): number;

    getValue(): number;
    setValue(value: number): void;
    
    getColor(): string;
    setColor(value: string): void;

    getThickness(): number;
    setThickness(value: number): void;

    isVisible(): boolean;
    setVisible(value: boolean): void;

    reset(): void;
}

export interface IModuleRulerUI extends IModuleBaseLayerUI {
    /*****************************************************************/
    /*                            State                              */
    /*****************************************************************/

    isCornerVisible(): boolean;
    setCornerVisible(value: boolean): void;

    /*****************************************************************/
    /*                             Size                              */
    /*****************************************************************/

    getThickness(): number;
    setThickness(value: number): void;

    /*****************************************************************/
    /*                            Style                              */
    /*****************************************************************/

    getBackground(): string;
    setBackground(value: string): void;

    getTickColor(): string;
    setTickColor(value: string): void;

    getTextColor(): string;
    setTextColor(value: string): void;

    getFont(): string;
    setFont(value: string): void;

    /*****************************************************************/
    /*                         Draw limits                           */
    /*****************************************************************/

    getMinLabelPx(): number;
    setMinLabelPx(value: number): void;

    getMinTickPx(): number;
    setMinTickPx(value: number): void;

    getMinMajorTickPx(): number;
    setMinMajorTickPx(value: number): void;

    /*****************************************************************/
    /*                            Guides                             */
    /*****************************************************************/

    getGuideHorizontalRulerById(id: number): IRulerGuideLine | null;
    getGuideVerticalRulerById(id: number): IRulerGuideLine | null;

    getGuidesHorizontalRuler(): IRulerGuideLine[];
    getGuidesVerticalRuler(): IRulerGuideLine[];

    addGuideForHorizontalRuler(value: number): boolean;
    addGuideForVerticalRuler(value: number): boolean;

    removeGuideFromHorizontalRuler(id: number): boolean;
    removeGuideFromVerticalRuler(id: number): boolean;

    clearGuidesFromHorizontal(): void;
    clearGuidesFromVertical(): void;

    clearGuides(): void;

    /*****************************************************************/
    /*                            Update                             */
    /*****************************************************************/

    update(): void;
}

export type RulerGuideAxis = "horizontal" | "vertical";

export type RulerGuideView = {
    guide: IRulerGuideLine;
    element: HTMLDivElement;
};

export type RulerActiveGuide = {
    axis: RulerGuideAxis;
    pointerId: number;
    owner: HTMLElement;
    preview: HTMLDivElement;
    value: number;
};