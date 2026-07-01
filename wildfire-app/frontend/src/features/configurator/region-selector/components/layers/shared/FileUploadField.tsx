import type { FC } from "react";
import { AlertCircle, FileCheck2, Info, Loader2, X, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@spatialhub/ui";
import { cn } from "@/lib/utils";

interface FileUploadFieldProps {
    label: string;
    accept: string;
    hint: string;
    info: string;
    icon: LucideIcon;
    fileName?: string;
    error?: string;
    processing?: boolean;
    processingLabel?: string;
    onSelect: (file: File | null) => void;
}

export const FileUploadField: FC<FileUploadFieldProps> = ({
    label,
    accept,
    hint,
    info,
    icon: Icon,
    fileName,
    error,
    processing,
    processingLabel = "Processing…",
    onSelect,
}) => (
    <div className={cn("rounded-lg border px-3 py-2.5", error ? "border-red-500/50 bg-red-500/5" : "border-border bg-card")}>
        <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground">
                <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                    {label}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" aria-label={`About ${label}`} className="text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
                                <Info className="h-3 w-3" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px] text-xs">{info}</TooltipContent>
                    </Tooltip>
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                    {processing ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> {processingLabel}
                        </span>
                    ) : fileName ? (
                        <span className="inline-flex items-center gap-1 text-foreground">
                            <FileCheck2 className="h-3 w-3 text-emerald-500" /> {fileName}
                        </span>
                    ) : (
                        hint
                    )}
                </div>
            </div>
            {fileName ? (
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    aria-label={`Remove ${label}`}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            ) : (
                <label className="shrink-0 cursor-pointer rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted">
                    Choose
                    <input
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => {
                            onSelect(e.target.files?.[0] ?? null);
                            e.target.value = "";
                        }}
                    />
                </label>
            )}
        </div>
        {error && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" /> {error}
            </p>
        )}
    </div>
);
