/**
 * Canvas serialization/deserialization utility.
 * Handles conversion of canvas state to/from JSON format with blob extraction.
 */

import type Konva from 'konva';

import type { CoreEngine } from '../core/CoreEngine';
import type { BaseNode } from '../nodes/BaseNode';
import type { FrameNode } from '../nodes/FrameNode';

const MEDIA_NODE_TYPES = ['image', 'video', 'gif', 'svg'] as const;
type MediaNodeType = (typeof MEDIA_NODE_TYPES)[number];

export interface SerializedNode {
  id: string;
  type: string;
  attrs: Record<string, unknown>;
  zIndex: number;
  blobId?: string;
  children?: SerializedNode[];
  parentFrameId?: string;
}

export interface SerializedCamera {
  x: number;
  y: number;
  scale: number;
}

export interface SerializedCanvas {
  version: number;
  timestamp: number;
  nodes: SerializedNode[];
  camera: SerializedCamera;
  blobIds: string[];
}

export interface ExtractedBlob {
  id: string;
  blob: Blob;
  originalUrl: string;
}

export interface DeserializeOptions {
  blobUrls?: Map<string, string>;
  clearExisting?: boolean;
}

function getNodeType(node: BaseNode): string {
  const konvaNode = node.getKonvaNode();
  const className = konvaNode.getClassName();
  const flowscapeType = konvaNode.getAttr('flowscapeNodeType') as string | undefined;
  if (flowscapeType) return flowscapeType;

  const classNameMap: Record<string, string> = {
    Text: 'text',
    Image: 'image',
    Rect: 'shape',
    Circle: 'circle',
    Ellipse: 'ellipse',
    Arc: 'arc',
    Star: 'star',
    Arrow: 'arrow',
    Ring: 'ring',
    RegularPolygon: 'regularPolygon',
    Group: 'group',
  };
  return classNameMap[className] ?? 'shape';
}

function isMediaNodeType(type: string): type is MediaNodeType {
  return MEDIA_NODE_TYPES.includes(type as MediaNodeType);
}

function isFrameNode(node: BaseNode): boolean {
  return typeof (node as unknown as { getContentGroup?: unknown }).getContentGroup === 'function';
}

function isGroupNode(node: BaseNode): boolean {
  const konvaNode = node.getKonvaNode();
  return konvaNode.getClassName() === 'Group' && !isFrameNode(node);
}

function generateBlobId(): string {
  return `blob_${String(Date.now())}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Check if URL is a local blob or data URL that we can/should store
 */
function isLocalBlobUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:');
}

async function urlToBlob(url: string): Promise<Blob | null> {
  // Only fetch local blob/data URLs to avoid CORS errors with external resources
  // External URLs (http/https) will be loaded from original source on restore
  if (!isLocalBlobUrl(url)) {
    return null;
  }

  try {
    const response = await globalThis.fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to extract base64'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to convert blob to base64'));
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = globalThis.atob(base64);
  const byteNumbers = new Array<number>(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

function serializeNode(
  node: BaseNode,
  blobIdMap: Map<string, string>,
  frameContentMap: Map<string, string>,
): SerializedNode {
  const konvaNode = node.getKonvaNode();
  const type = getNodeType(node);
  const attrs = konvaNode.getAttrs() as Record<string, unknown>;
  const cleanAttrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (
      typeof value === 'function' ||
      value instanceof HTMLElement ||
      value instanceof HTMLImageElement ||
      value instanceof HTMLVideoElement ||
      value instanceof HTMLCanvasElement ||
      key === 'image' ||
      key === 'container'
    ) {
      continue;
    }
    cleanAttrs[key] = value;
  }

  // For media nodes, convert scale to actual dimensions
  // Konva Transformer changes scaleX/scaleY, not width/height
  if (isMediaNodeType(type)) {
    const scaleX = konvaNode.scaleX();
    const scaleY = konvaNode.scaleY();
    if (scaleX !== 1 || scaleY !== 1) {
      cleanAttrs['width'] = konvaNode.width() * scaleX;
      cleanAttrs['height'] = konvaNode.height() * scaleY;
      cleanAttrs['scaleX'] = 1;
      cleanAttrs['scaleY'] = 1;
    }
  }

  const serialized: SerializedNode = {
    id: node.id,
    type,
    attrs: cleanAttrs,
    zIndex: konvaNode.zIndex(),
  };

  if (isMediaNodeType(type)) {
    const src = attrs['src'] as string | undefined;
    if (src) {
      let blobId = blobIdMap.get(src);
      if (!blobId) {
        blobId = generateBlobId();
        blobIdMap.set(src, blobId);
      }
      serialized.blobId = blobId;
    }
  }

  const parentFrameId = frameContentMap.get(node.id);
  if (parentFrameId) serialized.parentFrameId = parentFrameId;

  return serialized;
}

function serializeFrameNode(
  frame: FrameNode,
  allNodes: Map<string, BaseNode>,
  blobIdMap: Map<string, string>,
  frameContentMap: Map<string, string>,
): SerializedNode {
  const konvaNode = frame.getKonvaNode();
  const attrs = konvaNode.getAttrs() as Record<string, unknown>;
  const cleanAttrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function' || value instanceof HTMLElement || key === 'container') {
      continue;
    }
    cleanAttrs[key] = value;
  }

  const rect = frame.getRect();
  cleanAttrs['width'] = rect.width();
  cleanAttrs['height'] = rect.height();
  cleanAttrs['background'] = rect.fill();

  const serialized: SerializedNode = {
    id: frame.id,
    type: 'frame',
    attrs: cleanAttrs,
    zIndex: konvaNode.zIndex(),
  };

  const contentGroup = frame.getContentGroup();
  const children: SerializedNode[] = [];
  const groupContentMap = new Map<string, string>();

  for (const child of contentGroup.getChildren()) {
    let found = false;
    for (const [, node] of allNodes) {
      if (node.getKonvaNode() === child) {
        frameContentMap.set(node.id, frame.id);
        // Check if child is a group and serialize recursively
        if (isGroupNode(node)) {
          children.push(
            serializeGroupNode(node, allNodes, blobIdMap, frameContentMap, groupContentMap),
          );
        } else {
          children.push(serializeNode(node, blobIdMap, frameContentMap));
        }
        found = true;
        break;
      }
    }
    // If child Konva node not found in allNodes, it might be a raw Konva.Group
    // This can happen when nodes are grouped inside a frame
    if (!found && child.getClassName() === 'Group') {
      const serializedGroup = serializeKonvaGroup(
        child as unknown as Konva.Group,
        allNodes,
        blobIdMap,
        frameContentMap,
      );
      if (serializedGroup) {
        children.push(serializedGroup);
      }
    }
  }

  if (children.length > 0) serialized.children = children;
  return serialized;
}

/**
 * Serialize a raw Konva.Group that may not have a corresponding BaseNode
 */
function serializeKonvaGroup(
  konvaGroup: Konva.Group,
  allNodes: Map<string, BaseNode>,
  blobIdMap: Map<string, string>,
  frameContentMap: Map<string, string>,
): SerializedNode | null {
  const attrs = konvaGroup.getAttrs() as Record<string, unknown>;

  const cleanAttrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function' || value instanceof HTMLElement || key === 'container') {
      continue;
    }
    cleanAttrs[key] = value;
  }

  const id =
    (attrs['id'] as string | undefined) ??
    `group_${String(Date.now())}_${Math.random().toString(36).substring(2, 11)}`;

  const serialized: SerializedNode = {
    id,
    type: 'group',
    attrs: cleanAttrs,
    zIndex: konvaGroup.zIndex(),
  };

  const children: SerializedNode[] = [];
  const groupContentMap = new Map<string, string>();

  for (const child of konvaGroup.getChildren()) {
    let found = false;
    for (const [, node] of allNodes) {
      if (node.getKonvaNode() === child) {
        groupContentMap.set(node.id, id);
        if (isGroupNode(node)) {
          children.push(
            serializeGroupNode(node, allNodes, blobIdMap, frameContentMap, groupContentMap),
          );
        } else {
          children.push(serializeNode(node, blobIdMap, frameContentMap));
        }
        found = true;
        break;
      }
    }
    // Recursively handle nested raw groups
    if (!found && child.getClassName() === 'Group') {
      const nestedGroup = serializeKonvaGroup(
        child as unknown as Konva.Group,
        allNodes,
        blobIdMap,
        frameContentMap,
      );
      if (nestedGroup) {
        children.push(nestedGroup);
      }
    }
  }

  if (children.length > 0) serialized.children = children;
  return serialized;
}

function serializeGroupNode(
  group: BaseNode,
  allNodes: Map<string, BaseNode>,
  blobIdMap: Map<string, string>,
  frameContentMap: Map<string, string>,
  groupContentMap: Map<string, string>,
): SerializedNode {
  const konvaNode = group.getKonvaNode() as unknown as Konva.Group;
  const attrs = konvaNode.getAttrs() as Record<string, unknown>;

  const cleanAttrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function' || value instanceof HTMLElement || key === 'container') {
      continue;
    }
    cleanAttrs[key] = value;
  }

  const serialized: SerializedNode = {
    id: group.id,
    type: 'group',
    attrs: cleanAttrs,
    zIndex: konvaNode.zIndex(),
  };

  const children: SerializedNode[] = [];

  for (const child of konvaNode.getChildren()) {
    for (const [, node] of allNodes) {
      if (node.getKonvaNode() === child) {
        groupContentMap.set(node.id, group.id);
        // Recursively serialize - child could be another group
        if (isGroupNode(node)) {
          children.push(
            serializeGroupNode(node, allNodes, blobIdMap, frameContentMap, groupContentMap),
          );
        } else if (isFrameNode(node)) {
          children.push(
            serializeFrameNode(node as unknown as FrameNode, allNodes, blobIdMap, frameContentMap),
          );
        } else {
          children.push(serializeNode(node, blobIdMap, frameContentMap));
        }
        break;
      }
    }
  }

  if (children.length > 0) serialized.children = children;
  return serialized;
}

function createNode(
  core: CoreEngine,
  serialized: SerializedNode,
  blobUrls: Map<string, string>,
): BaseNode | null {
  const { type, attrs, blobId } = serialized;

  let resolvedSrc = attrs['src'] as string | undefined;
  if (blobId && blobUrls.has(blobId)) {
    resolvedSrc = blobUrls.get(blobId);
  }

  const options: Record<string, unknown> = { ...attrs, id: serialized.id };
  if (resolvedSrc) options['src'] = resolvedSrc;

  try {
    switch (type) {
      case 'text':
        return core.nodes.addText(
          options as Parameters<typeof core.nodes.addText>[0],
        ) as unknown as BaseNode;
      case 'image':
        return core.nodes.addImage(
          options as Parameters<typeof core.nodes.addImage>[0],
        ) as unknown as BaseNode;
      case 'video':
        return core.nodes.addVideo(
          options as Parameters<typeof core.nodes.addVideo>[0],
        ) as unknown as BaseNode;
      case 'gif':
        return core.nodes.addGif(
          options as Parameters<typeof core.nodes.addGif>[0],
        ) as unknown as BaseNode;
      case 'svg':
        return core.nodes.addSvg(
          options as Parameters<typeof core.nodes.addSvg>[0],
        ) as unknown as BaseNode;
      case 'circle':
        return core.nodes.addCircle(
          options as Parameters<typeof core.nodes.addCircle>[0],
        ) as unknown as BaseNode;
      case 'ellipse':
        return core.nodes.addEllipse(
          options as Parameters<typeof core.nodes.addEllipse>[0],
        ) as unknown as BaseNode;
      case 'arc':
        return core.nodes.addArc(
          options as Parameters<typeof core.nodes.addArc>[0],
        ) as unknown as BaseNode;
      case 'star':
        return core.nodes.addStar(
          options as Parameters<typeof core.nodes.addStar>[0],
        ) as unknown as BaseNode;
      case 'arrow':
        return core.nodes.addArrow(
          options as Parameters<typeof core.nodes.addArrow>[0],
        ) as unknown as BaseNode;
      case 'ring':
        return core.nodes.addRing(
          options as Parameters<typeof core.nodes.addRing>[0],
        ) as unknown as BaseNode;
      case 'regularPolygon':
        return core.nodes.addRegularPolygon(
          options as Parameters<typeof core.nodes.addRegularPolygon>[0],
        ) as unknown as BaseNode;
      case 'group':
        return core.nodes.addGroup(
          options as Parameters<typeof core.nodes.addGroup>[0],
        ) as unknown as BaseNode;
      case 'frame':
        return core.nodes.addFrame(
          options as unknown as Parameters<typeof core.nodes.addFrame>[0],
        ) as unknown as BaseNode;
      case 'shape':
      default:
        return core.nodes.addShape(
          options as Parameters<typeof core.nodes.addShape>[0],
        ) as unknown as BaseNode;
    }
  } catch (error) {
    globalThis.console.error(`Failed to create node of type ${type}:`, error);
    return null;
  }
}

export interface SerializeOptions {
  /** Pre-existing mapping of blob URLs to blob IDs (from captured blobs) */
  blobUrlToId?: Map<string, string>;
}

export function serializeCanvas(
  core: CoreEngine,
  options: SerializeOptions = {},
): SerializedCanvas {
  const nodes = core.nodes.list();
  // Use provided mapping or create new one
  const blobIdMap = options.blobUrlToId ? new Map(options.blobUrlToId) : new Map<string, string>();
  const frameContentMap = new Map<string, string>();
  const groupContentMap = new Map<string, string>();
  const serializedNodes: SerializedNode[] = [];

  const nodeMap = new Map<string, BaseNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // First pass: identify frame children
  for (const node of nodes) {
    if (isFrameNode(node)) {
      const frame = node as unknown as FrameNode;
      const contentGroup = frame.getContentGroup();
      for (const child of contentGroup.getChildren()) {
        for (const [id, n] of nodeMap) {
          if (n.getKonvaNode() === child) {
            frameContentMap.set(id, frame.id);
            break;
          }
        }
      }
    }
  }

  // Second pass: identify group children
  for (const node of nodes) {
    if (isGroupNode(node)) {
      const konvaGroup = node.getKonvaNode() as unknown as Konva.Group;
      for (const child of konvaGroup.getChildren()) {
        for (const [id, n] of nodeMap) {
          if (n.getKonvaNode() === child) {
            groupContentMap.set(id, node.id);
            break;
          }
        }
      }
    }
  }

  // Third pass: serialize top-level nodes only
  for (const node of nodes) {
    // Skip if this node is a child of a frame or group
    if (frameContentMap.has(node.id) || groupContentMap.has(node.id)) continue;

    if (isFrameNode(node)) {
      serializedNodes.push(
        serializeFrameNode(node as unknown as FrameNode, nodeMap, blobIdMap, frameContentMap),
      );
    } else if (isGroupNode(node)) {
      serializedNodes.push(
        serializeGroupNode(node, nodeMap, blobIdMap, frameContentMap, groupContentMap),
      );
    } else {
      serializedNodes.push(serializeNode(node, blobIdMap, frameContentMap));
    }
  }

  const world = core.nodes.world;
  const camera: SerializedCamera = { x: world.x(), y: world.y(), scale: world.scaleX() };
  const blobIds = Array.from(blobIdMap.values());

  return { version: 1, timestamp: Date.now(), nodes: serializedNodes, camera, blobIds };
}

export async function extractBlobs(core: CoreEngine): Promise<Map<string, ExtractedBlob>> {
  const nodes = core.nodes.list();
  const blobs = new Map<string, ExtractedBlob>();
  const processedUrls = new Map<string, string>();

  for (const node of nodes) {
    const type = getNodeType(node);
    if (!isMediaNodeType(type)) continue;

    const konvaNode = node.getKonvaNode();
    const src = konvaNode.getAttr('src') as string | undefined;

    if (!src || processedUrls.has(src)) continue;

    const blob = await urlToBlob(src);
    if (blob) {
      const blobId = generateBlobId();
      processedUrls.set(src, blobId);
      blobs.set(blobId, { id: blobId, blob, originalUrl: src });
    }
  }

  return blobs;
}

export function deserializeCanvas(
  core: CoreEngine,
  state: SerializedCanvas,
  options: DeserializeOptions = {},
): void {
  const { blobUrls = new Map<string, string>(), clearExisting = true } = options;

  if (clearExisting) {
    const existingNodes = core.nodes.list();
    for (const node of [...existingNodes]) {
      core.nodes.remove(node);
    }
  }

  const createdNodes = new Map<string, BaseNode>();
  const nodeZIndexMap = new Map<string, number>();

  // First pass: create all nodes and store their zIndex
  for (const serialized of state.nodes) {
    const node = createNode(core, serialized, blobUrls);
    if (node) {
      createdNodes.set(serialized.id, node);
      nodeZIndexMap.set(serialized.id, serialized.zIndex);
    }
  }

  // Helper function to recursively create children for groups/frames
  const createChildrenRecursively = (
    parentSerialized: SerializedNode,
    parentKonvaNode: Konva.Group,
  ): void => {
    if (!parentSerialized.children) return;

    // Sort children by zIndex before adding
    const sortedChildren = [...parentSerialized.children].sort((a, b) => a.zIndex - b.zIndex);

    for (const childSerialized of sortedChildren) {
      const childNode = createNode(core, childSerialized, blobUrls);
      if (childNode) {
        const konvaChild = childNode.getKonvaNode() as unknown as Konva.Node;
        // Store relative position before moving
        const relX = (childSerialized.attrs['x'] as number | undefined) ?? 0;
        const relY = (childSerialized.attrs['y'] as number | undefined) ?? 0;

        // Remove from world (createNode adds to world) and add to parent
        konvaChild.remove();
        parentKonvaNode.add(konvaChild as unknown as Konva.Group);

        // Restore relative position within parent
        konvaChild.x(relX);
        konvaChild.y(relY);

        createdNodes.set(childSerialized.id, childNode);

        // If this child is also a group, recursively create its children
        if (childSerialized.type === 'group' && childSerialized.children) {
          createChildrenRecursively(childSerialized, konvaChild as unknown as Konva.Group);
        }
      }
    }
  };

  // Second pass: handle frame children
  for (const serialized of state.nodes) {
    if (serialized.type === 'frame' && serialized.children) {
      const frame = createdNodes.get(serialized.id);
      if (frame && isFrameNode(frame)) {
        const frameNode = frame as unknown as FrameNode;
        const contentGroup = frameNode.getContentGroup();
        createChildrenRecursively(serialized, contentGroup);
      }
    }
  }

  // Third pass: handle group children
  for (const serialized of state.nodes) {
    if (serialized.type === 'group' && serialized.children) {
      const group = createdNodes.get(serialized.id);
      if (group) {
        const konvaGroup = group.getKonvaNode() as unknown as Konva.Group;
        createChildrenRecursively(serialized, konvaGroup);
      }
    }
  }

  // Fourth pass: restore zIndex order for top-level nodes
  const sortedNodes = [...state.nodes]
    .filter((s) => !s.parentFrameId && s.type !== 'frame')
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const serialized of sortedNodes) {
    const node = createdNodes.get(serialized.id);
    if (node) {
      node.getKonvaNode().moveToTop();
    }
  }

  // Restore frame zIndex order
  const sortedFrames = [...state.nodes]
    .filter((s) => s.type === 'frame')
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const serialized of sortedFrames) {
    const node = createdNodes.get(serialized.id);
    if (node) {
      node.getKonvaNode().moveToTop();
    }
  }

  core.camera.setZoom(state.camera.scale);
  core.nodes.world.position({ x: state.camera.x, y: state.camera.y });
  core.nodes.layer.batchDraw();
}

export async function exportCanvasToJSON(core: CoreEngine): Promise<string> {
  const state = serializeCanvas(core);
  const blobs = await extractBlobs(core);

  const embeddedBlobs: Record<string, { data: string; mimeType: string; originalUrl: string }> = {};

  for (const [id, extracted] of blobs) {
    const base64 = await blobToBase64(extracted.blob);
    embeddedBlobs[id] = {
      data: base64,
      mimeType: extracted.blob.type,
      originalUrl: extracted.originalUrl,
    };
  }

  return JSON.stringify({ ...state, embeddedBlobs }, null, 2);
}

export function importCanvasFromJSON(
  core: CoreEngine,
  json: string,
  options: Omit<DeserializeOptions, 'blobUrls'> = {},
): void {
  const data = JSON.parse(json) as SerializedCanvas & {
    embeddedBlobs?: Record<string, { data: string; mimeType: string; originalUrl: string }>;
  };

  const blobUrls = new Map<string, string>();

  if (data.embeddedBlobs) {
    for (const [id, embedded] of Object.entries(data.embeddedBlobs)) {
      const blob = base64ToBlob(embedded.data, embedded.mimeType);
      const objectUrl = URL.createObjectURL(blob);
      blobUrls.set(id, objectUrl);
    }
  }

  deserializeCanvas(core, data, { ...options, blobUrls });
}

export function createBlobUrlMap(
  state: SerializedCanvas,
  storedBlobs: Map<string, Blob>,
): Map<string, string> {
  const blobUrls = new Map<string, string>();
  for (const blobId of state.blobIds) {
    const blob = storedBlobs.get(blobId);
    if (blob) {
      blobUrls.set(blobId, URL.createObjectURL(blob));
    }
  }
  return blobUrls;
}

export function revokeBlobUrls(blobUrls: Map<string, string>): void {
  for (const url of blobUrls.values()) {
    URL.revokeObjectURL(url);
  }
  blobUrls.clear();
}
