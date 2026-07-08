import { FC } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n";

interface ViewerStatusBannersProps {
  mapReady: boolean;
  loading: boolean;
  error: string | null;
  tileErrors: number;
  layerPending: boolean;
  hasResults: boolean;
}

// Floating status messages: map init, errors, tile failures, publishing, empty run.
export const ViewerStatusBanners: FC<ViewerStatusBannersProps> = ({
  mapReady,
  loading,
  error,
  tileErrors,
  layerPending,
  hasResults,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {!mapReady && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[2000] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("modelResults.map.initializing", "Initializing map…")}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] max-w-xl bg-destructive text-destructive-foreground rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {tileErrors > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-lg shadow-lg px-4 py-2 text-xs">
          {t("modelResults.errors.tileLoad", "Some tiles failed to load from GeoServer ({{count}})", {
            count: tileErrors,
          })}
        </div>
      )}

      {layerPending && mapReady && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-card border border-border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs text-foreground">
            {t("modelResults.layer.publishing", "Publishing layer to GeoServer…")}
          </span>
        </div>
      )}

      {!loading && !error && !hasResults && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] max-w-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-lg shadow-lg p-4">
          <p className="text-sm font-medium">
            {t("modelResults.empty.title", "No result for this model yet.")}
          </p>
          <p className="text-xs mt-1">
            {t(
              "modelResults.empty.hint",
              "The simulation output will appear here once processing finishes."
            )}
          </p>
        </div>
      )}
    </>
  );
};
