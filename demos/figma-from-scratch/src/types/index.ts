// types.ts
export type NodeStyle = {
    fill: { hex: string; opacity: number };            // 0..100
    stroke: { hex: string; opacity: number; width: number }; // px
    radius: number;                                      // px (только для Rect)
    text: {
        value: string;
        size: number;                                      // px
        weight: 'normal' | 'bold';
        align: 'left' | 'center' | 'right';
    };
};
