import { useCallback, useEffect, useState } from "react";

import { settingsService } from "@/features/settings";
import { LAYERS, LAYER_COUNT } from "@/features/configurator/region-selector/components/layers";

const isTruthySetting = (value: unknown) =>
    value === true || value === "true" || value === 1 || value === "1";

export interface WizardStepsApi {
    step: number;
    completed: Set<number>;
    hasStarted: boolean;
    introPreferenceLoading: boolean;
    dismissIntroCard: boolean;
    isSavingIntroPreference: boolean;
    goNext: () => void;
    goBack: () => void;
    jumpTo: (id: number) => void;
    start: () => void;
    setDismissIntroCard: (checked: boolean) => void;
    setStep: (id: number) => void;
}

/** Shared step state. */
export const useWizardSteps = (editMode: boolean): WizardStepsApi => {
    const [step, setStepState] = useState(1);
    const [completed, setCompleted] = useState<Set<number>>(() =>
        editMode ? new Set(LAYERS.map((layer) => layer.id)) : new Set(),
    );
    const [hasStarted, setHasStarted] = useState(editMode);
    const [introPreferenceLoading, setIntroPreferenceLoading] = useState(!editMode);
    const [dismissIntroCard, setDismissIntroCardState] = useState(false);
    const [isSavingIntroPreference, setIsSavingIntroPreference] = useState(false);

    useEffect(() => {
        if (editMode) return;
        let cancelled = false;

        (async () => {
            try {
                const data = (await settingsService.getAllSettings()) as Record<string, unknown>;
                if (cancelled) return;
                if (isTruthySetting(data.model_intro_card_dismissed)) {
                    setDismissIntroCardState(true);
                    setHasStarted(true);
                }
            } catch {
                /* Keep intro visible. */
            } finally {
                if (!cancelled) setIntroPreferenceLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [editMode]);

    const goNext = useCallback(() => {
        setCompleted((prev) => new Set(prev).add(step));
        setStepState((current) => Math.min(LAYER_COUNT, current + 1));
    }, [step]);

    const goBack = useCallback(() => setStepState((current) => Math.max(1, current - 1)), []);

    const jumpTo = useCallback(
        (id: number) => {
            if (id === step) return;
            if (editMode || id < step || completed.has(id)) setStepState(id);
        },
        [completed, editMode, step],
    );

    const setStep = useCallback((id: number) => {
        setStepState(Math.min(Math.max(id, 1), LAYER_COUNT));
        setHasStarted(true);
    }, []);

    const setDismissIntroCard = useCallback((checked: boolean) => {
        setDismissIntroCardState(checked);
        setIsSavingIntroPreference(true);
        void settingsService.setModelIntroCardDismissed(checked).finally(() => {
            setIsSavingIntroPreference(false);
        });
    }, []);

    const start = useCallback(() => {
        if (dismissIntroCard) void settingsService.setModelIntroCardDismissed(true);
        setHasStarted(true);
    }, [dismissIntroCard]);

    return {
        step,
        completed,
        hasStarted,
        introPreferenceLoading,
        dismissIntroCard,
        isSavingIntroPreference,
        goNext,
        goBack,
        jumpTo,
        start,
        setDismissIntroCard,
        setStep,
    };
};
