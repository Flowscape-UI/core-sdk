import { NodeBase, NodeType, type ID } from "../base";

export class NodeRect extends NodeBase {
    constructor(id: ID, name?: string) {
        super(id, NodeType.Rect, name ?? "Rect");
        this.setSize(100, 100);
    }


    /***********************************************************/
    /*                        Appearence                       */
    /***********************************************************/
    public getCornerRadius(): {
        tl: number,
        tr: number,
        bl: number,
        br: number
    } {
        return {}
    }

    public setCornerRadius(
        tl: number,
        tr: number,
        bl: number,
        br: number
    ): void {

    }


    public getFill(): string {
        return '';
    }

    public setFill(value: string): void {

    }


    /***********************************************************/
    /*                          Stroke                         */
    /***********************************************************/
    public getStokeWidth(): number {
        return 0;
    }

    public setStrokeWidth(value: number): void {

    }

    public getStrokeFill(): string {
        return '';
    }

    public setStrokeFill(value: string): void {

    }

    public getStrokeAlign(): string {
        return ''
    }

    public setStrokeAlignt(value: string): void {
        
    }

    // 
    public getStrokeVisibility(): {
        tl: number,
        tr: number,
        bl: number,
        br: number
    } {

    }

    public setStrokeVisibility(tl: boolean, tr: boolean, br: boolean, bl: boolean): void {

    }


    public getEffect(): string {
        return ''
    }

    public setEffect(value: string): void {
        
    }
}