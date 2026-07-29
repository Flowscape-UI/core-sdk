import Link from '@docusaurus/Link';
import UiBadge from '@site/src/components/UiBadge';
import styles from '@site/src/components/ShapeNodesGrid/styles.module.css';

type InputTopicItem = {
  to: string;
  name: string;
  description: string;
};

const inputTopics: InputTopicItem[] = [
  {
    to: '/advanced/input-system/input',
    name: 'Input',
    description: 'Static input state API: keyboard, mouse, wheel, and runtime input configuration.',
  },
  {
    to: '/advanced/input-system/controllers/overview',
    name: 'Controllers',
    description: 'Controller architecture: overview, world/overlay built-ins, and custom controller patterns.',
  },
];

export default function InputSystemTopicsGrid() {
  return (
    <div className={styles.grid}>
      {inputTopics.map((topic, index) => (
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
