import { Transform } from "../../core/transform/Transform";
import type { Matrix, Vector2 } from "../../core/transform/types";
import type { ITransform } from "../../core/transform/types/ITransform";
import { multiplyMatrix } from "../utils";
import { NodeType, type ID, type INode } from "./types";


export class NodeBase implements INode, ITransform {
    private readonly NAME_MAX_LENGTH: number = 256;
    private readonly DEFAULT_NODE_NAME: string = "Node";

    public readonly type: NodeType;
    public readonly id: ID;

    public isVisible: boolean;
    public isLocked: boolean;

    private _name: string;
    private _parent: INode | null;
    private _children: INode[];

    protected _width: number;
    protected _height: number;
    protected _transform: Transform;

    constructor(
        id: ID,
        type: NodeType = NodeType.Base,
        name: string = "Node"
    ) {
        this.id = id;
        this.type = type;
        this._name = this._getSanitizedString(name);

        this.isVisible = true;
        this.isLocked = false;

        this._width = 0;
        this._height = 0;

        this._children = [];
        this._parent = null;
        this._transform = new Transform();
    }


    public getName(): string {
        return this._name;
    }

    public setName(value: string): void {
        this._name = this._getSanitizedString(value);
    }






    public getParent(): INode | null {
        return this._parent;
    }

    public setParent(parent: INode): void {
        if (this._parent !== null) {
            this._parent.removeChild(this);
        }
        this._parent = parent;
    }


    public removeParent(): void {
        if (!this._parent) return;
        this._parent.removeChild(this);
    }


    // Children controller
    public getChildren(): readonly INode[] {
        return [...this._children];
    }

    public addChild(child: INode): void {
        if (child === this) {
            throw new Error('Node cannot be added to itself');
        }

        if (child.getParent() === this) {
            return;
        }

        const oldParent = child.getParent();
        if (oldParent) {
            oldParent.removeChild(child);
        }

        child.setParent(this);
        this._children.push(child);
    }

    public removeChild(child: INode): void {
        const index = this._children.indexOf(child);
        if (index === -1) return;

        this._children.splice(index, 1);
        child.removeParent();
    }

    public getWidth(): number {
        return this._width;
    }

    public setWidth(value: number): void {
        if (this.isLocked === true) {
            return;
        }
        this._width = Math.max(0, value);
    }

    public getHeight(): number {
        return this._height;
    }

    public setHeight(value: number): void {
        if (this.isLocked === true) {
            return;
        }
        this._height = Math.max(0, value);
    }

    public setSize(width: number, height: number): void {
        this.setWidth(width);
        this.setHeight(height);
    }

    // Transform delegation
    public getPosition(): Vector2 {
        return this._transform.getPosition();
    }
    public setPosition(x: number, y: number): void {
        if (this.isLocked === true) {
            return;
        }
        this._transform.setPosition(x, y);
    }
    public translate(dx: number, dy: number): void {
        if (this.isLocked === true) {
            return;
        }
        this._transform.translate(dx, dy);
    }
    public getScale(): Vector2 {
        return this._transform.getScale();
    }
    public setScale(sx: number, sy: number): void {
        if (this.isLocked === true) {
            return;
        }
        this._transform.setScale(sx, sy);
    }
    public getRotation(): number {
        return this._transform.getRotation();
    }
    public setRotation(angle: number): void {
        this._transform.setRotation(angle);
    }
    public getPivot(): Vector2 {
        return this._transform.getPivot();
    }
    public setPivot(px: number, py: number): void {
        if (this.isLocked === true) {
            return;
        }
        this._transform.setPivot(px, py);
    }
    public getLocalMatrix(): Matrix {
        return this._transform.getLocalMatrix(this._width, this._height);
    }
    public getWorldMatrix(): Matrix {
        const localMatrix = this.getLocalMatrix();

        if (!this._parent) {
            return localMatrix;
        }

        const parentMatrix = this._parent.getWorldMatrix();
        return multiplyMatrix(parentMatrix, localMatrix);
    }


    /**
    * Checks whether `potentialAncestor` is an ancestor of `node`.
    * A node is NOT considered an ancestor of itself.
    *
    * @param potentialAncestor - The node to check as ancestor
    * @param node - The node to start traversal from
    * @returns true if potentialAncestor exists in the parent chain of node
    */
    public static isAncestor(source: INode | null, target: INode): boolean {
        const visited = new Set<ID>();
        let current = source;

        while (current) {
            if (current === target) {
                return true;
            }
            if (visited.has(current.id)) {
                return false;
            }

            visited.add(current.id);
            current = current.getParent();
        }

        return false;
    }

    /**
    * Checks whether the given `target` node exists in the ancestor chain of `source` node.
    * A node is NOT considered an ancestor of itself.
    *
    * @param source - The node whose ancestor chain will be traversed
    * @param target - The node to search for in the ancestor chain
    * @returns `true` if `target` is an ancestor of `source`
    */
    public static hasAncestor(source: INode, target: INode): boolean {
        const visited = new Set<INode>();
        let current: INode | null = source.getParent();

        while (current) {
            if (current === target) return true;
            if (visited.has(current)) return false;
            visited.add(current);
            current = current.getParent();
        }

        return false;
    }


    /************************************************/
    /*                    Helpers                   */
    /************************************************/
    private _getSanitizedString(value: string): string {
        let name = value;

        // 1. Normalize Unicode - expand compound characters and bring
        // them to a single form in order to bypass split unicode attacks
        name = name.normalize('NFKC');

        // 2. Remove null-bytes and control characters (including \r\n\t and invisible ones)
        // \x00-\x1F - ASCII control chars, \x7F - DEL, \x80-\x9F - latin-1 control
        name = name.replace(/[\x00-\x1F\x7F\x80-\x9F]/g, '');

        // 3. Remove Unicode special characters: RTL/LTR marks,
        // zero-width, soft hyphen, etc. These symbols are invisible,
        // but they change the display or bypass filters.
        name = name.replace(/[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, '');

        // 4. Removing dangerous ASCII characters for all contexts:
        // HTML, attributes, shell, SQL, path traversal, template injection
        name = name.replace(/[<>&"'`=\/\\|;:!$*?#@%^()[\]{},~\-.+]/g, '');

        // 5. Trim spaces (after deleting characters, edges may remain)
        name = name.trim();

        // 6. Collapse multiple spaces into one
        name = name.replace(/\s+/g, ' ');

        // 7. Cutting the length with TrimEnd - slice may leave a trailing space
        const maxLen = this.NAME_MAX_LENGTH ?? 64;
        if (name.length > maxLen) {
            name = name.slice(0, maxLen).trimEnd();
        }

        // 8. Fallback if after all cleaning name is empty
        if (name.length === 0) {
            name = this.DEFAULT_NODE_NAME;
        }

        return name;
    }
}
