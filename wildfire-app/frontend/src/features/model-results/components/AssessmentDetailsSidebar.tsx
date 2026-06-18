import { useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { CalendarDays, MapPin } from 'lucide-react';

import type { Model } from '../../model-dashboard/services/modelService';
import { useRiskMetrics } from '../hooks/useRiskMetrics';
import { RiskMetricsCard } from './RiskMetricsCard';

interface AssessmentResultSummary {
  id: number;
  geoserver_status?: string;
}

interface AssessmentDetailsSidebarProps {
  model: Model;
  results?: AssessmentResultSummary[];
}

const STATUS_TONE: Record<string, string> = {
  completed: 'bg-emerald-500',
  configured: 'bg-emerald-500',
  running: 'bg-blue-500 animate-pulse',
  pending: 'bg-amber-400',
  processing: 'bg-amber-400 animate-pulse',
  failed: 'bg-red-500',
};

const STATUS_PILL: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  configured: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  running: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  processing: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  failed: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const AssessmentDetailsSidebar = ({
  model,
  results = [],
}: AssessmentDetailsSidebarProps) => {
  const { t } = useTranslation();
  const { metrics, isLoading, error, ready } = useRiskMetrics(model.id);

  const durationDays = useMemo(() => {
    if (!model.from_date || !model.to_date) return null;
    const from = new Date(model.from_date).getTime();
    const to = new Date(model.to_date).getTime();
    if (Number.isNaN(from) || Number.isNaN(to)) return null;
    return Math.max(1, Math.ceil((to - from) / (1000 * 60 * 60 * 24)));
  }, [model.from_date, model.to_date]);

  const location = useMemo(() => {
    const parts = [model.region, model.country].filter(Boolean) as string[];
    // Dedupe: the region string often already contains the country
    // (e.g. "Monforte de Lemos, Galicia, Spain") — avoid "Spain, Spain".
    const seen = new Set<string>();
    const out: string[] = [];
    for (const part of parts) {
      const norm = part.trim().toLowerCase();
      if (!seen.has(norm) && !out.some((p) => p.toLowerCase().includes(norm))) {
        seen.add(norm);
        out.push(part.trim());
      }
    }
    return out.join(', ');
  }, [model.region, model.country]);
  const statusKey = (model.status ?? '').toLowerCase();

  return (
    <aside className="relative h-full w-80 border-l border-border bg-background flex flex-col">
      {/* Title */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_TONE[statusKey] ?? 'bg-muted-foreground/50'}`}
          />
          <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">
            {model.title}
          </h3>
        </div>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          {model.status && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                STATUS_PILL[statusKey] ?? 'bg-muted text-muted-foreground'
              }`}
            >
              {capitalize(model.status)}
            </span>
          )}
          {model.workspace?.name && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground truncate max-w-[160px]">
              {model.workspace.name}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Description */}
        {model.description && (
          <section className="bg-card border border-border rounded-2xl p-3.5 shadow-sm">
            <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-1.5">
              {t('modelResults.details.description', 'Description')}
            </p>
            <p className="text-xs text-foreground/80 leading-relaxed break-words">
              {model.description}
            </p>
          </section>
        )}

        {/* Location + Period */}
        <section className="bg-card border border-border rounded-2xl divide-y divide-border shadow-sm">
          {location && (
            <div className="flex items-start gap-3 px-3.5 py-3">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                  {t('modelResults.details.location', 'Location')}
                </p>
                <p className="text-xs text-foreground mt-0.5 break-words">{location}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 px-3.5 py-3">
            <CalendarDays className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                {t('modelResults.details.period', 'Assessment period')}
              </p>
              <p className="text-xs text-foreground mt-0.5">
                {formatDate(model.from_date)} → {formatDate(model.to_date)}
              </p>
              {durationDays !== null && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {durationDays} {t('modelResults.details.days', 'days')}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Risk summary (hero + stats + distribution) */}
        <RiskMetricsCard metrics={metrics} isLoading={isLoading} error={error} ready={ready} />

        {/* Footer meta */}
        <div className="text-[10px] text-muted-foreground/80 px-1 pb-1 flex items-center justify-between">
          <span>#{model.id}</span>
          <span>
            {t('modelResults.details.updated', 'Updated')} {formatDate(model.updated_at)}
          </span>
        </div>

        {/* Indicator when there are no results yet */}
        {results.length === 0 && ready === false && (
          <p className="text-[11px] text-muted-foreground text-center pt-1">
            {t('modelResults.details.awaiting', 'Waiting for result…')}
          </p>
        )}
      </div>
    </aside>
  );
};
