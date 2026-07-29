import Link from '@docusaurus/Link';
import UiBadge from '@site/src/components/UiBadge';
import styles from '@site/src/components/ShapeNodesGrid/styles.module.css';

type AdvancedNodesTopic = {
  to: string;
  name: string;
  description: string;
};

const topics: AdvancedNodesTopic[] = [
  {
    to: '/advanced/nodes/what-is-obb',
    name: 'What Is OBB',
    description: 'Oriented bounds: rotated box in world space, built from node world corners.',
  },
  {
    to: '/advanced/nodes/what-is-aabb',
    name: 'What Is AABB',
    description: 'Axis-aligned bounds: fast spatial box for selection, culling, and queries.',
  },
  {
    to: '/advanced/nodes/what-is-pivot',
    name: 'What Is Pivot',
    description: 'Transform anchor: point used as the center for rotation and scale behavior.',
  },
];

export default function AdvancedNodesTopicsGrid() {
  return (
    <div className={styles.grid}>
      {topics.map((topic, index) => (
        <Link key={topic.name} className={styles.card} to={topic.to}>
          <div className={styles.cardRail} />
          <div className={styles.cardInner}>
            <div className={styles.cardMeta}>
              <UiBadge as="span" className={styles.badge}>
                {topic.name}
              </UiBadge>
              <span className={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <p className={styles.description}>{topic.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
