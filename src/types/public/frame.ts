export interface FrameOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  background?: string;
  cornerRadius?: number | number[];
  label?: string;
  template?: string;
  draggable?: boolean;
  id?: string;
  name?: string;
}

export interface FrameHandle {
  id: string;
}
