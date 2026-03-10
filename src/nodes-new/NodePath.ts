import { NodeRect, type INodePath, type NodePathOptions } from ".";


export class NodePath extends NodeRect implements INodePath {
    private _path: string;

    constructor(params: NodePathOptions) {
        super(params);

        this._path = params.path;
    }

    public getPath(): string {
        return this._path;
    }

    public setPath(path: string): void {
        this._path = path;
    }
}