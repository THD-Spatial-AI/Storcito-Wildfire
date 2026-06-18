"use client";
import styles from "./loading-dots.module.css";

import React, { ComponentProps } from "react";
import { cn } from "../../../utils";

type LoadingDotsProps = ComponentProps<"div">;

const DOT_CLASS = "bg-sidebar";

export const LoadingDots: React.FC<LoadingDotsProps> = ({ className, ref: _ref, ...props }) => {
	return (
		<div {...(props as React.HTMLAttributes<HTMLDivElement>)} className={cn(styles.loading)}>
			<span className={cn(DOT_CLASS, className)} />
			<span className={cn(DOT_CLASS, className)} />
			<span className={cn(DOT_CLASS, className)} />
		</div>
	);
};
