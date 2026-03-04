import { Color } from "../Color";

export {type IGradient} from "./IGradient";

export type GradientDegreeString = `${number}deg`;

export type ColorStopCanonical = {
    offset: number;
    color: Color;
}

export type GradientOption = {
    direction: number,
    stops: ColorStopCanonical[],
}

export type ColorStopInput = {
    color: string | Color;
    offset?: number | `${number}%`;
}

export enum BoxPosition {
    Top = 'top',
    Right = 'right',
    Bottom = 'bottom',
    Left = 'left',
    Center = 'center',
    // TopRight = 'top right',
    // TopLeft = 'top left',
    // BottomRight = 'bottom right',
    // BottomLeft = 'bottom left',
    // TopRightInverse = 'right top',
    // TopLeftInverse = 'left top',
    // BottomRightInverse = 'right bottom',
    // BottomLeftInverse = 'left bottom',
}