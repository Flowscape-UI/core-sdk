import type { FrameOptions } from '../types/public/frame';

export const frameTemplates = {
  desktopFrame: {
    width: 1920,
    height: 1080,
    template: 'Figma desktop',
    label: 'Desktop',
  } satisfies Omit<FrameOptions, 'x' | 'y'>,
} as const;
