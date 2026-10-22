export const parseDate = (date: string | Date): Date => {
	if (date instanceof Date) return date;
	if (typeof date === 'string') {
		return new Date(date);
	}
	return new Date();
};

export const formatDate = (date: string | Date): string => {
	const dateObj = parseDate(date);
	return dateObj.toLocaleDateString('en-GB');
};

export const formatDateTime = (date: string | Date): string => {
	const dateObj = parseDate(date);
	return dateObj.toLocaleString("en-GB", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
};

/** Short date, optional year. */
export const formatShortDateTime = (date: string | Date): string => {
	const dateObj = parseDate(date);
	const sameYear = dateObj.getFullYear() === new Date().getFullYear();
	return dateObj.toLocaleString("en-GB", {
		day: "numeric",
		month: "short",
		...(sameYear ? {} : { year: "numeric" as const }),
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
};

export const formatDateRange = (from: string | Date, to: string | Date): string => {
	const start = parseDate(from);
	const end = parseDate(to);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
	const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", opts);
	const full = { day: "numeric", month: "short", year: "numeric" } as const;
	if (start.toDateString() === end.toDateString()) return fmt(end, full);
	if (start.getFullYear() !== end.getFullYear()) return `${fmt(start, full)} – ${fmt(end, full)}`;
	if (start.getMonth() !== end.getMonth()) {
		return `${fmt(start, { day: "numeric", month: "short" })} – ${fmt(end, full)}`;
	}
	return `${start.getDate()}–${fmt(end, full)}`;
};

/**
 * Format date with full details (used in notifications, feedback, etc.)
 * Format: "09 Jan 2025, 14:30"
 */
export const formatDateTime24h = (date: string | Date): string => {
	const dateObj = parseDate(date);
	return dateObj.toLocaleString('en-GB', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
};

const formatDateShort = (date: string | Date): string => {
	const dateObj = parseDate(date);
	return dateObj.toLocaleDateString("en-GB", {
		month: "short",
		day: "numeric",
		year: "2-digit",
	});
};

export const formatTimeAgo = (date: string | Date): string => {
	if (!date) {
		return 'Unknown';
	}

	const dateObj = parseDate(date);
	
	// Handle invalid dates
	const timestamp = dateObj.getTime();
	if (Number.isNaN(timestamp)) {
		return 'Unknown';
	}
	
	const now = Date.now();
	
	// Calculate difference in milliseconds
	const diffInMs = now - timestamp;
	
	// Handle future dates
	if (diffInMs < 0) {
		return "Just now";
	}
	
	const diffInSeconds = Math.floor(diffInMs / 1000);
	const diffInMinutes = Math.floor(diffInSeconds / 60);
	
	// Very recent (less than 60 seconds)
	if (diffInSeconds < 60) {
		return "Just now";
	}
	
	if (diffInMinutes === 1) return "1 min ago";
	if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
	
	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours === 1) return "1 hour ago";
	if (diffInHours < 24) return `${diffInHours} hours ago`;
	
	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays === 1) return "1 day ago";
	if (diffInDays < 7) return `${diffInDays} days ago`;
	
	if (diffInDays < 30) {
		const weeks = Math.floor(diffInDays / 7);
		return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
	}
	
	return formatDateShort(dateObj);
};
