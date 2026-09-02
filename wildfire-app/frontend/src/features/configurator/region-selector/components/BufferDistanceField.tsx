import { useCallback, type FC } from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslation } from "@/i18n";

import {
    BUFFER_MAX,
    BUFFER_MIN,
    stepBuffer,
} from "@/features/configurator/constants/buffer-distance";

interface BufferDistanceFieldProps {
    value: number;
    onChange: (value: number) => void;
}

export const BufferDistanceField: FC<BufferDistanceFieldProps> = ({ value, onChange }) => {
    const { t } = useTranslation();

    const decrement = useCallback(() => onChange(stepBuffer(value, -1)), [value, onChange]);
    const increment = useCallback(() => onChange(stepBuffer(value, 1)), [value, onChange]);

    const atMin = value <= BUFFER_MIN;
    const atMax = value >= BUFFER_MAX;

    return (
        <fieldset className="relative border-0 p-0 m-0" data-tour="buffer-distance">
            <legend className="block text-xs font-medium text-foreground mb-1">
                {t("simulation.bufferDistance.label")}
            </legend>
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={decrement}
                    aria-label={t("simulation.bufferDistance.decrease")}
                    disabled={atMin}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background text-foreground transition-all duration-150 hover:bg-muted active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <div
                    className="flex-1 min-w-[5rem] select-none text-center px-3 py-1 rounded-md border border-border bg-background text-xs font-semibold tabular-nums text-foreground transition-colors duration-150"
                    aria-live="polite"
                >
                    {value} m
                </div>
                <button
                    type="button"
                    onClick={increment}
                    aria-label={t("simulation.bufferDistance.increase")}
                    disabled={atMax}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background text-foreground transition-all duration-150 hover:bg-muted active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                {t("simulation.bufferDistance.hint")}
            </div>
        </fieldset>
    );
};
