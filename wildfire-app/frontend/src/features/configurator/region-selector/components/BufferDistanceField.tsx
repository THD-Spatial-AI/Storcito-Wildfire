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
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background dark:bg-gray-700 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <div
                    className="flex-1 min-w-[5rem] select-none text-center px-3 py-1 rounded-md border border-border bg-background dark:bg-gray-700 text-xs font-semibold text-foreground"
                    aria-live="polite"
                >
                    {value} m
                </div>
                <button
                    type="button"
                    onClick={increment}
                    aria-label={t("simulation.bufferDistance.increase")}
                    disabled={atMax}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-background dark:bg-gray-700 text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
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
