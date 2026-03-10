import type { NodeImageOptions } from './NodeImageOptions';

export type NodeVideoOptions = NodeImageOptions & {
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
};