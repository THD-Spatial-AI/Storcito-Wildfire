import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@spatialhub/ui';
import { cn } from '@/lib/utils';

interface FilterOption {
	value: string;
	label: string;
	icon?: React.ReactNode;
}

interface FilterDropdownProps {
	options: FilterOption[];
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	icon?: React.ReactNode;
	className?: string;
	disabled?: boolean;
}

/** Sentinel for empty. */
const EMPTY_VALUE = '__empty__';
const toSelectValue = (value: string) => (value === '' ? EMPTY_VALUE : value);
const fromSelectValue = (value: string) => (value === EMPTY_VALUE ? '' : value);

/** Value-picker dropdown. */
export const FilterDropdown: React.FC<FilterDropdownProps> = ({
	options,
	value,
	onChange,
	placeholder = 'Select...',
	icon,
	className = '',
	disabled = false,
}) => (
	<Select
		value={toSelectValue(value)}
		onValueChange={(v) => onChange(fromSelectValue(v))}
		disabled={disabled}
	>
		<SelectTrigger className={cn('h-10 min-w-[140px] w-auto gap-2 bg-card shadow-sm', className)}>
			{icon && (
				<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
					{icon}
				</span>
			)}
			<SelectValue placeholder={placeholder} />
		</SelectTrigger>
		<SelectContent>
			{options.map((option) => (
				<SelectItem key={toSelectValue(option.value)} value={toSelectValue(option.value)}>
					<span className="flex items-center gap-2">
						{option.icon && (
							<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
								{option.icon}
							</span>
						)}
						{option.label}
					</span>
				</SelectItem>
			))}
		</SelectContent>
	</Select>
);
