import type { ID } from "../../../core/types";
import { NodeType } from "../../base";
import { NodeRect } from "../NodeRect";
import { type INodeFrame } from "./types";

export class NodeFrame extends NodeRect implements INodeFrame {
    private _clipContent: boolean;

    constructor(id: ID, name?: string) {
        super(id, name ?? "Frame", NodeType.Frame);
        this._clipContent = true;
    }

    public getClipsContent(): boolean {
        return this._clipContent;
    }

    public setClipsContent(value: boolean): void {
        if (value === this._clipContent) {
            return;
        }

        this._clipContent = value;
    }
}