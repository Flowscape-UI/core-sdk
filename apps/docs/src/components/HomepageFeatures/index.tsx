import type { ReactNode } from "react";
import styles from "./styles.module.css";
import UiBadge from "@site/src/components/UiBadge";

type FeatureItem = {
	eyebrow: string;
	title: string;
	description: string;
	points: string[];
};

const featureList: FeatureItem[] = [
	{
		eyebrow: "Engine architecture",
		title: "Built for real editor systems",
		description:
			"Flowscape is designed for products like visual builders, whiteboards, design tools and infinite canvas apps - not just isolated canvas demos.",
		points: [
			"Scene-based architecture",
			"Infinite canvas mindset",
			"Editor-oriented foundations",
		],
	},
	{
		eyebrow: "Developer experience",
		title: "Clean API, scalable internals",
		description:
			"The goal is to give developers a simpler high-level API while keeping the engine architecture extensible enough for complex tools, plugins and custom rendering workflows.",
		points: [
			"TypeScript-first API",
			"Plugin system direction",
			"Custom node and renderer workflows",
		],
	},
	{
		eyebrow: "Product vision",
		title: "Framework-agnostic by design",
		description:
			"Flowscape is being shaped as an engine core that can power different kinds of applications without locking the project to one frontend framework or one rendering future.",
		points: [
			"Framework-agnostic approach",
			"Fits builders and editors",
			"Designed to evolve with the engine",
		],
	},
];

type FeatureCardProps = FeatureItem & {
	index: number;
};

function FeatureCard({
	eyebrow,
	title,
	description,
	points,
	index,
}: FeatureCardProps) {
	return (
		<article className={styles.card}>
			<div className={styles.cardRail} />
			<div className={styles.cardGlow} />
			<div className={styles.cardInner}>
				<div className={styles.cardMeta}>
					<div className={styles.eyebrow}>{eyebrow}</div>
					<div className={styles.cardIndex}>
						{String(index).padStart(2, "0")}
					</div>
				</div>
				<h3 className={styles.cardTitle}>{title}</h3>
				<p className={styles.cardDescription}>{description}</p>

				<ul className={styles.pointList}>
					{points.map((point) => (
						<li key={point} className={styles.pointItem}>
							<span className={styles.pointDot} />
							<span>{point}</span>
						</li>
					))}
				</ul>
			</div>
		</article>
	);
}

export default function HomepageFeatures(): ReactNode {
	return (
		<section className={styles.features}>
			<div className={styles.container}>
				<div className={styles.header}>
					<UiBadge as="div" className={styles.sectionBadge}>
						Why Flowscape
					</UiBadge>
					<h2 className={styles.title}>
						A 2D engine shaped for{" "}
						<span className={styles.titleAccent}>
							modern editor products
						</span>
					</h2>
					<p className={styles.subtitle}>
						Flowscape is not positioned as a generic canvas helper.
						It is being built as a foundation for tools that need
						scene structure, rendering flexibility and a
						product-level infinite canvas experience.
					</p>
				</div>

				<div className={styles.grid}>
					{featureList.map((feature, index) => (
						<FeatureCard
							key={feature.title}
							index={index + 1}
							{...feature}
						/>
					))}
				</div>
			</div>
		</section>
	);
}
