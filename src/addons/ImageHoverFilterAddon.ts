import Konva from 'konva';

import { ImageNode } from '../nodes/ImageNode';
import { NodeAddon } from './NodeAddon';

export type ImageHoverFilterMode = 'sepia' | 'warm' | 'cool';

export interface ImageHoverFilterAddonOptions {
  mode?: ImageHoverFilterMode;
  /** 0..1 — сила эффекта для warm/cool */
  intensity?: number;
  /** pixelRatio для кэша во время hover. По умолчанию = devicePixelRatio или 1 */
  pixelRatio?: number;
}

type AnyFilter = (typeof Konva.Filters)[keyof typeof Konva.Filters] | string;

interface ImageHoverFilterState {
  prevFilters: AnyFilter[];
  prevRed: number;
  prevGreen: number;
  prevBlue: number;
  prevAlpha: number;
  prevHue: number;
  prevSaturation: number;
  prevLuminance: number;
  mouseEnterHandler: () => void;
  mouseLeaveHandler: () => void;
  hadHover: boolean;
}

export class ImageHoverFilterAddon extends NodeAddon<ImageNode> {
  private readonly mode: ImageHoverFilterMode;
  private readonly intensity: number;
  private readonly pixelRatio: number;
  private readonly nodes = new WeakMap<ImageNode, ImageHoverFilterState>();

  constructor(options: ImageHoverFilterAddonOptions = {}) {
    super();
    this.mode = options.mode ?? 'sepia';
    const rawIntensity = options.intensity ?? 0.4;
    this.intensity = Math.max(0, Math.min(1, rawIntensity));
    // const dpr = (globalThis as unknown as { devicePixelRatio?: number }).devicePixelRatio ?? 3;
    this.pixelRatio = options.pixelRatio ?? 3;
  }

  protected onAttach(node: ImageNode): void {
    if (this.nodes.has(node)) return;

    const image = node.getNode();
    const currentFiltersRaw = image.filters();
    const currentFilters = Array.isArray(currentFiltersRaw)
      ? (currentFiltersRaw as AnyFilter[])
      : [];

    const asAny = image as unknown as {
      red?: (v?: number) => number;
      green?: (v?: number) => number;
      blue?: (v?: number) => number;
      alpha?: (v?: number) => number;
      hue?: (v?: number) => number;
      saturation?: (v?: number) => number;
      luminance?: (v?: number) => number;
    };

    const prevRed = typeof asAny.red === 'function' ? asAny.red() : 0;
    const prevGreen = typeof asAny.green === 'function' ? asAny.green() : 0;
    const prevBlue = typeof asAny.blue === 'function' ? asAny.blue() : 0;
    const prevAlpha = typeof asAny.alpha === 'function' ? asAny.alpha() : 1;
    const prevHue = typeof asAny.hue === 'function' ? asAny.hue() : 0;
    const prevSaturation = typeof asAny.saturation === 'function' ? asAny.saturation() : 0;
    const prevLuminance = typeof asAny.luminance === 'function' ? asAny.luminance() : 0;

    const state: ImageHoverFilterState = {
      prevFilters: [...currentFilters],
      prevRed,
      prevGreen,
      prevBlue,
      prevAlpha,
      prevHue,
      prevSaturation,
      prevLuminance,
      mouseEnterHandler: () => undefined,
      mouseLeaveHandler: () => undefined,
      hadHover: false,
    };

    state.mouseEnterHandler = () => {
      state.hadHover = true;

      // Для работы фильтров Konva требуется cache
      image.cache({ pixelRatio: this.pixelRatio });

      if (this.mode === 'sepia') {
        const filtersRaw = image.filters();
        const filters = Array.isArray(filtersRaw) ? (filtersRaw as AnyFilter[]) : [];
        if (!filters.includes(Konva.Filters.Sepia)) {
          image.filters([...filters, Konva.Filters.Sepia]);
        }
      } else {
        const filtersRaw = image.filters();
        const filters = Array.isArray(filtersRaw) ? (filtersRaw as AnyFilter[]) : [];
        if (!filters.includes(Konva.Filters.HSL)) {
          image.filters([...filters, Konva.Filters.HSL]);
        }

        const intensity = this.intensity;
        const hueBase = 18; // градусов
        const saturationBase = 0.2; // усиление насыщенности
        const hueDelta = hueBase * intensity;
        const saturationDelta = saturationBase * intensity;

        switch (this.mode) {
          case 'warm': {
            if (typeof asAny.hue === 'function') {
              asAny.hue(state.prevHue + hueDelta);
            }
            if (typeof asAny.saturation === 'function') {
              asAny.saturation(state.prevSaturation + saturationDelta);
            }
            break;
          }
          case 'cool': {
            if (typeof asAny.hue === 'function') {
              asAny.hue(state.prevHue - hueDelta);
            }
            if (typeof asAny.saturation === 'function') {
              asAny.saturation(state.prevSaturation + saturationDelta);
            }
            break;
          }
          default:
            break;
        }
      }

      image.getLayer()?.batchDraw();
    };

    state.mouseLeaveHandler = () => {
      if (!state.hadHover) return;

      image.filters(state.prevFilters);

      if (this.mode === 'warm' || this.mode === 'cool') {
        if (typeof asAny.red === 'function') {
          asAny.red(state.prevRed);
        }
        if (typeof asAny.green === 'function') {
          asAny.green(state.prevGreen);
        }
        if (typeof asAny.blue === 'function') {
          asAny.blue(state.prevBlue);
        }
        if (typeof asAny.alpha === 'function') {
          asAny.alpha(state.prevAlpha);
        }
        if (typeof asAny.hue === 'function') {
          asAny.hue(state.prevHue);
        }
        if (typeof asAny.saturation === 'function') {
          asAny.saturation(state.prevSaturation);
        }
        if (typeof asAny.luminance === 'function') {
          asAny.luminance(state.prevLuminance);
        }
      }

      image.getLayer()?.batchDraw();
      image.clearCache();
    };

    image.on('mouseenter.imageHoverFilterAddon', state.mouseEnterHandler);
    image.on('mouseleave.imageHoverFilterAddon', state.mouseLeaveHandler);

    this.nodes.set(node, state);
  }

  protected onDetach(node: ImageNode): void {
    const state = this.nodes.get(node);
    if (!state) return;

    const image = node.getNode();

    image.off('mouseenter.imageHoverFilterAddon', state.mouseEnterHandler);
    image.off('mouseleave.imageHoverFilterAddon', state.mouseLeaveHandler);

    image.filters(state.prevFilters);

    const asAny = image as unknown as {
      red?: (v?: number) => number;
      green?: (v?: number) => number;
      blue?: (v?: number) => number;
      alpha?: (v?: number) => number;
    };

    if (this.mode === 'warm' || this.mode === 'cool') {
      if (typeof asAny.red === 'function') {
        asAny.red(state.prevRed);
      }
      if (typeof asAny.green === 'function') {
        asAny.green(state.prevGreen);
      }
      if (typeof asAny.blue === 'function') {
        asAny.blue(state.prevBlue);
      }
      if (typeof asAny.alpha === 'function') {
        asAny.alpha(state.prevAlpha);
      }
    }

    image.getLayer()?.batchDraw();

    // Полностью отключаем кэш, чтобы качество картинки вернулось к исходному
    image.clearCache();

    this.nodes.delete(node);
  }
}
