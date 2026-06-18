import type { FC, ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { LayerShell } from "./shared/LayerShell";
import type { ConfiguratorContext } from "./types";

const Row: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
    <div className="min-w-0 rounded-md border border-border bg-background px-2.5 py-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate font-medium text-foreground">{value || "—"}</span>
    </div>
);

export const Layer6SaveCalculate: FC<{ ctx: ConfiguratorContext }> = ({ ctx }) => {
    const { state, optionalLayers, allPolygonsCount, areaStats } = ctx;
    const activeMods = Object.entries(optionalLayers)
        .filter(([, v]) => v)
        .map(([k]) => k.replace(/_/g, " "));

    return (
        <LayerShell purpose="Review the model setup before saving. The calculation will use the selected dates, area and data source choices.">
            <div data-tour="save-run-summary" className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-foreground">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Everything looks good? Hit <span className="font-semibold">Create model</span> below.
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <Row label="Model name" value={state.modelName} />
                    <Row label="From" value={state.fromDate} />
                    <Row label="To" value={state.toDate} />
                    <Row label="Mode" value={state.calculationMode} />
                    <Row label="Daily run" value="16:00-17:00" />
                    <Row label="Buffer" value={`${state.bufferDistance} m`} />
                    <Row label="Area" value={areaStats?.area ?? (allPolygonsCount > 0 ? "drawn" : "not drawn")} />
                    <Row label="Risk components" value={activeMods.length ? activeMods.join(", ") : "core only (veg + infra)"} />
                </div>
            </div>
        </LayerShell>
    );
};
