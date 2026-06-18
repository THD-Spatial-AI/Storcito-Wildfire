export interface Group {
	id: number;
	name: string;
	ids: number[];
	[key: string]: string | number | number[];
}

export interface WorkspaceMember {
	user_id: number | string;
	email?: string;
}

export interface ModelDashboardProps {
	type?: string;
}

export type CompletionInfo = { startTime: string; endTime: string; totalSeconds: number };
