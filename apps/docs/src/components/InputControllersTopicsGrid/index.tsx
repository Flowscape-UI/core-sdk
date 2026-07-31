import Link from "@docusaurus/Link";
import UiBadge from "@site/src/components/UiBadge";
import styles from "@site/src/components/ShapeNodesGrid/styles.module.css";

type ControllerTopicItem = {
	to: string;
	name: string;
	description: string;
};

const controllerTopics: ControllerTopicItem[] = [
	{
		to: "/advanced/input-system/controllers/layer-world-ic",
		name: "Layer World IC",
		description:
			"Built-in world input controller for camera pan/zoom and world-space interaction.",
	},
	{
		to: "/advanced/input-system/controllers/layer-overlay-ic",
		name: "Layer Overlay IC",
		description:
			"Built-in overlay input controller for handles, ownership, and overlay tool interaction.",
	},
	{
		to: "/advanced/input-system/controllers/custom-controller",
		name: "Custom Controller",
		description:
			"How to implement and register your own controller for product-specific interaction logic.",
	},
];

export default function InputControllersTopicsGrid() {
	return (
		<div className={styles.grid}>
			{controllerTopics.map((topic, index) => (
				<Link key={topic.name} className={styles.card} to={topic.to}>
					<div className={styles.cardRail} />
					<div className={styles.cardInner}>
						<div className={styles.cardMeta}>
							<UiBadge as="span" className={styles.badge}>
								{topic.name}
							</UiBadge>
							<span className={styles.cardIndex}>
								{String(index + 1).padStart(2, "0")}
							</span>
						</div>
						<p className={styles.description}>
							{topic.description}
						</p>
					</div>
				</Link>
			))}
		</div>
	);
}
