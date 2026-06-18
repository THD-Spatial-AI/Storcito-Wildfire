import React, { useEffect, useState } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@spatialhub/ui";
import { settingsService } from "@/features/settings/services/settings";

const isTruthySetting = (value: unknown) => value === true || value === "true" || value === 1 || value === "1";

const ModelCreationPreferences: React.FC = () => {
    const [isDismissed, setIsDismissed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const settings = await settingsService.getAllSettings();
                if (!cancelled) {
                    setIsDismissed(isTruthySetting((settings as Record<string, unknown>).model_intro_card_dismissed));
                }
            } catch {
                if (!cancelled) setMessage("Unable to load this preference.");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const showIntroAgain = async () => {
        setIsSaving(true);
        setMessage(null);
        const success = await settingsService.setModelIntroCardDismissed(false);
        setIsSaving(false);

        if (success) {
            setIsDismissed(false);
            setMessage("The intro card will show the next time you create a new model.");
        } else {
            setMessage("Could not update the intro card preference.");
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-border bg-background px-2.5 py-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground">Model intro card</div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        Controls the setup card shown before the guided model creation steps.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] font-medium text-foreground">
                        {isLoading ? "Checking preference..." : isDismissed ? "Intro is hidden" : "Intro is enabled"}
                    </div>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                        {isDismissed
                            ? "Enable it again when users need the setup summary before creating a model."
                            : "The setup summary will appear before new model creation."}
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={showIntroAgain}
                    disabled={isLoading || isSaving || !isDismissed}
                    className="h-8 shrink-0 cursor-pointer text-xs"
                >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Show again
                </Button>
            </div>

            {message && <p className="text-[10px] leading-snug text-muted-foreground">{message}</p>}
        </div>
    );
};

export default ModelCreationPreferences;
