/** Step layout split. */

/** Area-step panel width. */
export const MAP_STEP_PANEL_WIDTH = 360;

/** Map share. */
const SIDEBAR_MAP_RATIO = 0.5;

/** Panel width. */
export const SIDEBAR_PANEL_WIDTH_CSS = `${(1 - SIDEBAR_MAP_RATIO) * 100}%`;

/** Visible map width. */
export const sidebarMapWidth = (mapWidth: number): number =>
    Math.round(mapWidth * SIDEBAR_MAP_RATIO);
