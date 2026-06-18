"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "../utils";

function AlertDialog({ ...props }: Readonly<React.ComponentProps<typeof AlertDialogPrimitive.Root>>) {
	return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({ ...props }: Readonly<React.ComponentProps<typeof AlertDialogPrimitive.Trigger>>) {
	return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: Readonly<React.ComponentProps<typeof AlertDialogPrimitive.Portal>>) {
	return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
	return (
		<AlertDialogPrimitive.Overlay
			data-slot="alert-dialog-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm",
				className
			)}
			{...props}
		/>
	);
}

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
	return (
		<AlertDialogPortal>
			<AlertDialogOverlay />
			<AlertDialogPrimitive.Content
				data-slot="alert-dialog-content"
				className={cn(
					"bg-background dark:bg-card text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-[2%] data-[state=open]:slide-in-from-top-[2%] fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100%-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-2xl border border-border p-6 shadow-2xl duration-200 sm:max-w-md",
					className
				)}
				{...props}
			/>
		</AlertDialogPortal>
	);
}

interface AlertDialogHeader extends React.ComponentProps<"div"> {
	readonly icon?: React.ElementType;
}

function AlertDialogHeader({ children, className, icon: Icon, ref: _ref, ...props }: Readonly<AlertDialogHeader>) {
	return (
		<div data-slot="alert-dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
			{Icon && (
				<div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
					<Icon className="h-6 w-6 text-muted-foreground" />
				</div>
			)}
			{children}
		</div>
	);
}

function AlertDialogFooter({ className, ref: _ref, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="alert-dialog-footer" className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)} {...(props as React.HTMLAttributes<HTMLDivElement>)} />;
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
	return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn("text-lg font-semibold text-foreground", className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
	return (
		<AlertDialogPrimitive.Description
			data-slot="alert-dialog-description"
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
	return <AlertDialogPrimitive.Action data-slot="alert-dialog-action" className={className} {...props} />;
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
	return <AlertDialogPrimitive.Cancel data-slot="alert-dialog-cancel" className={className} {...props} />;
}

export {
	AlertDialog,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogAction,
	AlertDialogCancel,
};
