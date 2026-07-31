import Link from "@docusaurus/Link";
import UiBadge from "@site/src/components/UiBadge";
import styles from "@site/src/components/ShapeNodesGrid/styles.module.css";

type CoreTopicItem = {
	to: string;
	name: string;
	description: string;
};

const coreTopics: CoreTopicItem[] = [
	{
		to: "/advanced/core/interfaces",
		name: "Interfaces",
		description:
			"Base lifecycle and execution contracts used across core engine systems.",
	},
	{
		to: "/advanced/core/types",
		name: "Types",
		description:
			"Core type aliases and shared type primitives used by managers and modules.",
	},
	{
		to: "/advanced/core/events",
		name: "Events",
		description:
			"Event flow patterns, emitter contracts, and event-driven architecture rules.",
	},
	{
		to: "/advanced/core/enableable",
		name: "Enableable",
		description:
			"Enable/disable state contracts for modules, tools, and runtime systems.",
	},
	{
		to: "/advanced/core/transform",
		name: "Transform",
		description:
			"Position, scale, rotation, and matrix composition model in core math flow.",
	},
	{
		to: "/advanced/core/math",
		name: "Math",
		description:
			"Geometry helpers, numeric utilities, and precision considerations in core.",
	},
	{
		to: "/advanced/core/camera",
		name: "Camera",
		description:
			"World/screen mapping, zoom, pan, limits, and camera state synchronization.",
	},
];

export default function CoreTopicsGrid() {
	return (
		<div className={styles.grid}>
			{coreTopics.map((topic, index) => (
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
