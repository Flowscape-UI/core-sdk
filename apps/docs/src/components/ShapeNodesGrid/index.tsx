import Link from '@docusaurus/Link';
import UiBadge from '@site/src/components/UiBadge';
import styles from './styles.module.css';

type ShapeNodeItem = {
  to: string;
  name: string;
  description: string;
};

const shapeNodes: ShapeNodeItem[] = [
  {
    to: '/nodes/base-node',
    name: 'Base',
    description: 'Foundation node contract with shared transforms, sizing and lifecycle behavior.',
  },
  {
    to: '/nodes/rect-node',
    name: 'Rect',
    description: 'Rectangle shape for panels, cards, containers and primitive block elements.',
  },
  {
    to: '/nodes/ellipse-node',
    name: 'Ellipse',
    description: 'Ellipse and circle-like shape for highlights, badges and rounded primitives.',
  },
  {
    to: '/nodes/group-node',
    name: 'Group',
    description: 'Container node for grouping multiple nodes into one transformable unit.',
  },
  {
    to: '/nodes/line-node',
    name: 'Line',
    description: 'Line segment node for connectors, dividers and directional links.',
  },
  {
    to: '/nodes/path-node',
    name: 'Path',
    description: 'Custom vector path node for complex curves and freeform vector geometry.',
  },
  {
    to: '/nodes/polygon-node',
    name: 'Polygon',
    description: 'Multi-point polygon node for custom geometric shapes and editable outlines.',
  },
  {
    to: '/nodes/text-node',
    name: 'Text',
    description: 'Text node for labels, titles and inline content inside editor scenes.',
  },
  {
    to: '/nodes/frame-node',
    name: 'Frame',
    description: 'Frame-like container for editor compositions and bounded scene regions.',
  },
  {
    to: '/nodes/image-node',
    name: 'Image',
    description: 'Image node for raster assets, previews and media-rich layouts.',
  },
  {
    to: '/nodes/video-node',
    name: 'Video',
    description: 'Video node for timeline or media workflows in interactive editor contexts.',
  },
];

export default function ShapeNodesGrid() {
  return (
    <div className={styles.grid}>
      {shapeNodes.map((node, index) => (
        <Link key={node.name} className={styles.card} to={node.to}>
          <div className={styles.cardRail} />
          <div className={styles.cardInner}>
            <div className={styles.cardMeta}>
              <UiBadge as="span" className={styles.badge}>
                {node.name}
              </UiBadge>
              <span className={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <p className={styles.description}>{node.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
