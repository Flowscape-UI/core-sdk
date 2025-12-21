import Konva from 'konva';

import type { FrameOptions } from '../types/public/frame';

import { BaseNode, type BaseNodeOptions } from './BaseNode';

// Объединяем опции BaseNode и FrameOptions без конфликтов по наследованию интерфейсов
export type FrameNodeOptions = FrameOptions & BaseNodeOptions;

export class FrameNode extends BaseNode<Konva.Group> {
  private _rect: Konva.Rect;
  private _contentGroup: Konva.Group;
  private _container: Konva.Group;

  constructor(options: FrameNodeOptions) {
    const groupConfig: Konva.ContainerConfig = {
      draggable: options.draggable ?? true,
    };
    if (options.name !== undefined) {
      groupConfig.name = options.name;
    }

    const group = new Konva.Group(groupConfig);

    super(group, options);

    const width = options.width;
    const height = options.height;
    const background = options.background ?? '#ffffff';

    // Внутренний контейнер с clip для имитации overflow: hidden
    const container = new Konva.Group({
      clip: {
        x: 0,
        y: 0,
        width,
        height,
      },
    });

    const rectConfig: Konva.RectConfig = {
      x: 0,
      y: 0,
      width,
      height,
      fill: background,
    };

    if (options.cornerRadius !== undefined) {
      rectConfig.cornerRadius = options.cornerRadius;
    }

    const rect = new Konva.Rect(rectConfig);

    const contentGroup = new Konva.Group();

    container.add(rect);
    container.add(contentGroup);

    this.konvaNode.add(container);

    this._rect = rect;
    this._contentGroup = contentGroup;
    this._container = container;

    // ВАЖНО: для selection/transformer bbox фрейма должен совпадать с его визуальным rect,
    // а не с детьми внутри contentGroup. Поэтому переопределяем getClientRect только
    // для этого экземпляра группы, проксируя вызов на rect.
    const groupAny = this.konvaNode as unknown as Konva.Group & {
      _frameOrigGetClientRect?: Konva.Group['getClientRect'];
    };

    if (!groupAny._frameOrigGetClientRect) {
      groupAny._frameOrigGetClientRect = groupAny.getClientRect.bind(groupAny);

      (
        groupAny as unknown as {
          getClientRect: (config?: unknown) => unknown;
        }
      ).getClientRect = (config?: unknown) => {
        return rect.getClientRect(config as never);
      };
    }
  }

  public getRect(): Konva.Rect {
    return this._rect;
  }

  public getContentGroup(): Konva.Group {
    return this._contentGroup;
  }

  /**
   * Resize visual frame area without affecting child nodes.
   * Updates rect size and clipping container.
   */
  public resize(width: number, height: number): void {
    this._rect.width(width);
    this._rect.height(height);

    this._container.clip({
      x: 0,
      y: 0,
      width,
      height,
    });
  }
}
