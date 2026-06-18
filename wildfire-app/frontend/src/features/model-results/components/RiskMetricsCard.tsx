import { useTranslation } from '@/i18n';
import { Flame, Loader2 } from 'lucide-react';

import type { RiskLevel, RiskMetrics } from '../hooks/useRiskMetrics';
import { RiskDistributionDonut } from './RiskDistributionDonut';

interface RiskMetricsCardProps {
  metrics: RiskMetrics;
  isLoading: boolean;
  error: string | null;
  ready: boolean;
}

// Each risk level gets a coordinated palette: a strong hex for the donut
// slice, a Tailwind background tone for the hero card, a text tone, and a
// dot color for the legend. Keeping them together means the hero, donut,
// and legend never drift out of sync.
const LEVEL_THEME: Record<
  RiskLevel,
  { label: string; heroBg: string; heroText: string; heroRing: string; dot: string; bar: string }
> = {
  very_low: {
    label: 'Very Low',
    heroBg: 'from-blue-500/10 to-blue-500/5',
    heroText: 'text-blue-700 dark:text-blue-300',
    heroRing: 'ring-blue-500/20',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
  },
  low: {
    label: 'Low',
    heroBg: 'from-emerald-500/10 to-emerald-500/5',
    heroText: 'text-emerald-700 dark:text-emerald-300',
    heroRing: 'ring-emerald-500/20',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  moderate: {
    label: 'Moderate',
    heroBg: 'from-amber-500/10 to-amber-500/5',
    heroText: 'text-amber-700 dark:text-amber-300',
    heroRing: 'ring-amber-500/20',
    dot: 'bg-amber-400',
    bar: 'bg-amber-400',
  },
  high: {
    label: 'High',
    heroBg: 'from-orange-500/15 to-orange-500/5',
    heroText: 'text-orange-700 dark:text-orange-300',
    heroRing: 'ring-orange-500/25',
    dot: 'bg-orange-500',
    bar: 'bg-orange-500',
  },
  very_high: {
    label: 'Very High',
    heroBg: 'from-red-500/15 to-red-500/5',
    heroText: 'text-red-700 dark:text-red-300',
    heroRing: 'ring-red-500/25',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
  },
};

const formatArea = (hectares: number | null, km2: number | null): string => {
  if (km2 !== null && km2 >= 1) return `${km2.toFixed(2)} km²`;
  if (hectares !== null) return `${hectares.toFixed(1)} ha`;
  return '—';
};

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
    {children}
  </section>
);

export const RiskMetricsCard: React.FC<RiskMetricsCardProps> = ({
  metrics,
  isLoading,
  error,
  ready,
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Wrap>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </Wrap>
    );
  }

  if (error) {
    return (
      <Wrap>
        <p className="text-xs text-red-600 dark:text-red-400 p-4">{error}</p>
      </Wrap>
    );
  }

  if (!ready) {
    return (
      <Wrap>
        <p className="text-xs text-muted-foreground p-4 leading-relaxed">
          {t(
            'modelResults.risk.notReady',
            'Metrics will be available once the layer is configured in GeoServer.',
          )}
        </p>
      </Wrap>
    );
  }

  const theme = metrics.overallRiskLevel ? LEVEL_THEME[metrics.overallRiskLevel] : null;
  const dist = metrics.riskDistribution;

  const buckets = dist
    ? ([
        { key: 'veryLow', label: 'Very Low', value: dist.veryLow, dot: 'bg-blue-500' },
        { key: 'low', label: 'Low', value: dist.low, dot: 'bg-emerald-500' },
        { key: 'moderate', label: 'Moderate', value: dist.moderate, dot: 'bg-amber-400' },
        { key: 'high', label: 'High', value: dist.high, dot: 'bg-orange-500' },
        { key: 'veryHigh', label: 'Very High', value: dist.veryHigh, dot: 'bg-red-500' },
      ] as const)
    : [];

  return (
    <Wrap>
      {theme && (
        <div
          className={`bg-gradient-to-br ${theme.heroBg} px-4 py-4 ring-1 ring-inset ${theme.heroRing}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                {t('modelResults.risk.overall', 'Overall Risk')}
              </p>
              <p className={`mt-0.5 text-lg font-semibold leading-tight ${theme.heroText}`}>
                {theme.label}
              </p>
            </div>
            {metrics.overallRiskScore !== null && (
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                  {t('modelResults.risk.meanScore', 'Mean score')}
                </p>
                <p className={`mt-0.5 text-lg font-semibold leading-tight ${theme.heroText}`}>
                  {metrics.overallRiskScore.toFixed(2)}
                  <span className="text-muted-foreground font-normal text-xs ml-0.5">/ 5</span>
                </p>
              </div>
            )}
          </div>

          {/* 0..5 severity track, with a marker at the mean score so users
              can see at a glance where on the scale the assessment landed. */}
          {metrics.overallRiskScore !== null && (
            <div className="mt-3">
              <div className="relative h-1.5 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-emerald-500 via-amber-400 via-orange-500 to-red-500">
                <span
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow ring-2 ring-foreground/30"
                  style={{
                    left: `calc(${Math.min(100, Math.max(0, (metrics.overallRiskScore / 5) * 100))}% - 5px)`,
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground tabular-nums tracking-wide">
                <span>0</span>
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>
          )}
        </div>
      )}

      {(metrics.affectedAreaKm2 !== null || metrics.totalAreaKm2 !== null) && (
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          {(metrics.affectedAreaKm2 !== null || metrics.affectedAreaHectares !== null) && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                {t('modelResults.risk.highRiskArea', 'High + Very High area')}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                {formatArea(metrics.affectedAreaHectares, metrics.affectedAreaKm2)}
              </p>
              {metrics.affectedFraction !== null && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {(metrics.affectedFraction * 100).toFixed(1)}%{' '}
                  {t('modelResults.risk.ofArea', 'of area')}
                </p>
              )}
            </div>
          )}
          {metrics.totalAreaKm2 !== null && (
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                {t('modelResults.risk.totalArea', 'Analyzed area')}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {metrics.totalAreaKm2.toFixed(2)} km²
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t('modelResults.risk.analyzedSurface', 'Valid (non-nodata) pixels')}
              </p>
            </div>
          )}
        </div>
      )}

      {dist && (
        <div className="px-4 py-4">
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-2">
            {t('modelResults.risk.distribution', 'Risk distribution')}
          </p>

          <RiskDistributionDonut distribution={dist} height={150} />

          <ul className="mt-3 space-y-1.5">
            {buckets.map((b) => {
              const isEmpty = b.value <= 0;
              return (
                <li key={b.key} className={`flex items-center gap-2 ${isEmpty ? 'opacity-40' : ''}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.dot}`} />
                  <span className="text-[11px] text-muted-foreground flex-1 truncate">{b.label}</span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">
                    {b.value.toFixed(1)}%
                  </span>
                </li>
              );
            })}
          </ul>

          {metrics.sampleCount !== null && metrics.sampleCount > 0 && (
            <p className="mt-3 text-[10px] text-muted-foreground">
              {t('modelResults.risk.sampleNote', 'Based on {{count}} sampled pixels', {
                count: metrics.sampleCount,
              })}
            </p>
          )}
        </div>
      )}
    </Wrap>
  );
};
