import type { ElementType, ReactNode } from "react";
import clsx from "clsx";
import styles from "./styles.module.css";

type UiBadgeProps<T extends ElementType = "span"> = {
	as?: T;
	children: ReactNode;
	className?: string;
};

export default function UiBadge<T extends ElementType = "span">({
	as,
	children,
	className,
}: UiBadgeProps<T>) {
	const Component = (as ?? "span") as ElementType;
	return (
		<Component className={clsx(styles.badge, className)}>
			{children}
		</Component>
	);
}
