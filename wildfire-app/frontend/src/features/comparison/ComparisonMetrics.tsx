import { type ElementType, type FC, type ReactNode } from 'react';
import { useTranslation } from '@/i18n';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleGauge,
  Flame,
  Layers as LayersIcon,
  MapPin,
  Minus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import type { Model } from '@/features/model-dashboard/services/modelService';
import {
  useRiskMetrics,
  type RiskDistribution,
  type RiskLevel,
  type RiskMetrics,
} from '@/features/model-results/hooks/useRiskMetrics';
import { RiskMetricsCard } from '@/features/model-results/components/RiskMetricsCard';
import { ComparisonInsightCharts } from './ComparisonInsightCharts';
import { DistributionComparisonChart } from './DistributionComparisonChart';
import { useRiskMapSamples } from './useRiskMapSamples';

interface ComparisonMetricsProps {
  model1: Model;
  model2: Model;
}

const LEVEL_SCORE: Record<RiskLevel, number> = {
  very_low: 1,
  low: 2,
  moderate: 3,
  high: 4,
  very_high: 5,
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  very_low: 'Very Low',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  very_high: 'Very High',
};

const DISTRIBUTION_LEVELS: Array<{
  key: keyof RiskDistribution;
  label: string;
  level: RiskLevel;
  score: number;
}> = [
  { key: 'veryLow', label: 'Very Low', level: 'very_low', score: 1 },
  { key: 'low', label: 'Low', level: 'low', score: 2 },
  { key: 'moderate', label: 'Moderate', level: 'moderate', score: 3 },
  { key: 'high', label: 'High', level: 'high', score: 4 },
  { key: 'veryHigh', label: 'Very High', level: 'very_high', score: 5 },
];

type DominantRiskClass = (typeof DISTRIBUTION_LEVELS)[number] & {
  value: number;
};

const formatArea = (km2: number | null): string =>
  km2 === null ? '—' : km2 >= 1 ? `${km2.toFixed(2)} km²` : `${(km2 * 100).toFixed(2)} ha`;

const formatDate = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleDateString() : '—';

const formatScore = (score: number | null): string =>
  score !== null ? `${score.toFixed(2)} / 5` : '—';

const formatPercent = (value: number | null): string =>
  value !== null ? `${value.toFixed(1)}%` : '—';

const formatCount = (value: number | null): string =>
  value !== null ? value.toLocaleString() : '—';

interface DeltaPillProps {
  delta: number | null;
  suffix?: string;
  invert?: boolean;
  digits?: number;
}

const DeltaPill: FC<DeltaPillProps> = ({ delta, suffix = '', invert = false, digits = 2 }) => {
  if (delta === null || Number.isNaN(delta)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (Math.abs(delta) < 1e-6) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
        <Minus className="w-3 h-3" />
        0{suffix}
      </span>
    );
  }
  const isUp = delta > 0;
  const isBad = invert ? isUp : !isUp;
  const classes = isBad
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${classes}`}
    >
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isUp ? '+' : ''}
      {delta.toFixed(digits)}
      {suffix}
    </span>
  );
};

const MetaRow: FC<{
  icon: ElementType;
  label: string;
  left: ReactNode;
  right: ReactNode;
}> = ({ icon: Icon, label, left, right }) => (
  <div className="grid grid-cols-[minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(140px,1.2fr)] items-center gap-3 py-2.5 border-b border-border last:border-b-0">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </div>
    <div className="text-sm text-foreground truncate">{left}</div>
    <div className="text-sm text-foreground truncate">{right}</div>
  </div>
);

const DeltaCell: FC<{
  label: string;
  baseline: ReactNode;
  comparison: ReactNode;
  deltaPill: ReactNode;
}> = ({ label, baseline, comparison, deltaPill }) => (
  <div className="rounded-lg border border-border bg-muted/30 p-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">
        {label}
      </span>
      {deltaPill}
    </div>
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">Baseline</span>
        <span className="text-xs font-medium text-foreground truncate">{baseline}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">Comparison</span>
        <span className="text-xs font-semibold text-foreground truncate">{comparison}</span>
      </div>
    </div>
  </div>
);

const SummaryMetric: FC<{
  icon: ElementType;
  label: string;
  value: ReactNode;
  detail: ReactNode;
}> = ({ icon: Icon, label, value, detail }) => (
  <div className="rounded-lg border border-border bg-muted/25 px-3 py-3">
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      <Icon className="w-3.5 h-3.5" />
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
  </div>
);

const ExplanationRow: FC<{
  tone: 'good' | 'bad' | 'neutral';
  label: string;
  text: string;
}> = ({ tone, label, text }) => {
  const dotClass =
    tone === 'good' ? 'bg-emerald-500' : tone === 'bad' ? 'bg-red-500' : 'bg-amber-500';

  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 w-2 h-2 rounded-full ${dotClass}`} />
      <div>
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground"> {text}</span>
      </div>
    </div>
  );
};

const computeDeltas = (a: RiskMetrics, b: RiskMetrics) => {
  const pair = (x: number | null, y: number | null) => (x !== null && y !== null ? y - x : null);
  return {
    scoreDelta: pair(a.overallRiskScore, b.overallRiskScore),
    areaDelta: pair(a.affectedAreaKm2, b.affectedAreaKm2),
    zonesDelta: pair(a.highRiskZones, b.highRiskZones),
    levelDelta: pair(
      a.overallRiskLevel ? LEVEL_SCORE[a.overallRiskLevel] : null,
      b.overallRiskLevel ? LEVEL_SCORE[b.overallRiskLevel] : null,
    ),
  };
};

const getHighRiskShare = (metrics: RiskMetrics): number | null => {
  if (!metrics.riskDistribution) return null;
  return metrics.riskDistribution.high + metrics.riskDistribution.veryHigh;
};

const getDominantRiskClass = (metrics: RiskMetrics): DominantRiskClass | null => {
  const distribution = metrics.riskDistribution;
  if (!distribution) return null;

  const total = DISTRIBUTION_LEVELS.reduce((sum, level) => sum + distribution[level.key], 0);
  if (total <= 0) return null;

  return DISTRIBUTION_LEVELS.reduce<DominantRiskClass>(
    (best, level) => {
      const value = distribution[level.key];
      return value > best.value ? { ...level, value } : best;
    },
    { ...DISTRIBUTION_LEVELS[0], value: distribution[DISTRIBUTION_LEVELS[0].key] },
  );
};

const getSummaryTone = (
  scoreDelta: number | null,
  highRiskShareDelta: number | null,
): 'better' | 'worse' | 'stable' => {
  if (scoreDelta !== null && Math.abs(scoreDelta) >= 0.05) {
    return scoreDelta > 0 ? 'worse' : 'better';
  }

  if (highRiskShareDelta !== null && Math.abs(highRiskShareDelta) >= 0.5) {
    return highRiskShareDelta > 0 ? 'worse' : 'better';
  }

  return 'stable';
};

export const ComparisonMetrics: FC<ComparisonMetricsProps> = ({ model1, model2 }) => {
  const { t } = useTranslation();
  const a = useRiskMetrics(model1.id);
  const b = useRiskMetrics(model2.id);
  const aMapSamples = useRiskMapSamples(model1.id);
  const bMapSamples = useRiskMapSamples(model2.id);

  const bothReady = a.ready && b.ready;
  const deltas = bothReady ? computeDeltas(a.metrics, b.metrics) : null;
  const baselineDominant = bothReady ? getDominantRiskClass(a.metrics) : null;
  const comparisonDominant = bothReady ? getDominantRiskClass(b.metrics) : null;
  const baselineHighRiskShare = bothReady ? getHighRiskShare(a.metrics) : null;
  const comparisonHighRiskShare = bothReady ? getHighRiskShare(b.metrics) : null;
  const highRiskShareDelta =
    baselineHighRiskShare !== null && comparisonHighRiskShare !== null
      ? comparisonHighRiskShare - baselineHighRiskShare
      : null;
  const sampleDelta =
    bothReady && a.metrics.sampleCount !== null && b.metrics.sampleCount !== null
      ? b.metrics.sampleCount - a.metrics.sampleCount
      : null;
  const summaryTone = deltas ? getSummaryTone(deltas.scoreDelta, highRiskShareDelta) : 'stable';
  const SummaryIcon =
    summaryTone === 'worse' ? TrendingUp : summaryTone === 'better' ? TrendingDown : ShieldCheck;
  const summaryToneClasses =
    summaryTone === 'worse'
      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900'
      : summaryTone === 'better'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900'
        : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700';
  const summaryTitle =
    summaryTone === 'worse'
      ? t('simulationComparison.summaryWorse', 'Risk increased')
      : summaryTone === 'better'
        ? t('simulationComparison.summaryBetter', 'Risk reduced')
        : t('simulationComparison.summaryStable', 'Risk is broadly stable');

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <header className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
            <BarChart3 className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {t('simulationComparison.configuration', 'Configuration')}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t('simulationComparison.configurationSub', 'Model metadata side-by-side')}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(140px,1.2fr)] items-center gap-3 pb-2 border-b border-border">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('simulationComparison.field', 'Field')}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            {t('simulationComparison.baseline', 'Baseline')}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
            {t('simulationComparison.comparison', 'Comparison')}
          </span>
        </div>

        <MetaRow icon={LayersIcon} label={t('modelResults.details.title', 'Title')} left={model1.title} right={model2.title} />
        <MetaRow icon={MapPin} label={t('modelResults.details.region', 'Region')} left={model1.region || '—'} right={model2.region || '—'} />
        <MetaRow icon={MapPin} label={t('modelResults.details.country', 'Country')} left={model1.country || '—'} right={model2.country || '—'} />
        <MetaRow icon={CalendarDays} label={t('modelResults.details.from', 'From')} left={formatDate(model1.from_date)} right={formatDate(model2.from_date)} />
        <MetaRow icon={CalendarDays} label={t('modelResults.details.to', 'To')} left={formatDate(model1.to_date)} right={formatDate(model2.to_date)} />
      </section>

      {(a.isLoading || b.isLoading) && !bothReady && (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t('simulationComparison.loadingMetrics', 'Loading risk metrics…')}
        </div>
      )}

      {bothReady && deltas && (
        <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
            <div className="flex items-start gap-3 min-w-0">
              <span
                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${summaryToneClasses}`}
              >
                <SummaryIcon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground tracking-tight">
                  {t('simulationComparison.summaryTitle', 'Comparison Summary')}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {t(
                    'simulationComparison.summarySub',
                    'Key changes between the baseline and comparison model.',
                  )}
                </p>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${summaryToneClasses}`}>
              <SummaryIcon className="w-3.5 h-3.5" />
              {summaryTitle}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <SummaryMetric
              icon={CircleGauge}
              label={t('modelResults.risk.meanScore', 'Mean Risk Score')}
              value={
                <span>
                  {formatScore(a.metrics.overallRiskScore)}
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  {formatScore(b.metrics.overallRiskScore)}
                </span>
              }
              detail={<DeltaPill delta={deltas.scoreDelta} invert />}
            />
            <SummaryMetric
              icon={Flame}
              label={t('modelResults.risk.highPlusArea', 'High + Very High area')}
              value={
                <span>
                  {formatArea(a.metrics.affectedAreaKm2)}
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  {formatArea(b.metrics.affectedAreaKm2)}
                </span>
              }
              detail={<DeltaPill delta={deltas.areaDelta} suffix=" km²" invert />}
            />
            <SummaryMetric
              icon={AlertTriangle}
              label={t('simulationComparison.criticalShare', 'High + Very High share')}
              value={
                <span>
                  {formatPercent(baselineHighRiskShare)}
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  {formatPercent(comparisonHighRiskShare)}
                </span>
              }
              detail={<DeltaPill delta={highRiskShareDelta} suffix="%" digits={1} invert />}
            />
            <SummaryMetric
              icon={BarChart3}
              label={t('simulationComparison.sampleCoverage', 'Sample coverage')}
              value={
                <span>
                  {formatCount(a.metrics.sampleCount)}
                  <span className="mx-1.5 text-muted-foreground">→</span>
                  {formatCount(b.metrics.sampleCount)}
                </span>
              }
              detail={
                sampleDelta === null ? (
                  '—'
                ) : (
                  <DeltaPill delta={sampleDelta} digits={0} suffix=" px" />
                )
              }
            />
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/25 border border-border px-3 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('simulationComparison.dominantClass', 'Dominant risk class')}
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">
                {baselineDominant && comparisonDominant ? (
                  <>
                    {baselineDominant.label}
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    {comparisonDominant.label}
                  </>
                ) : (
                  '—'
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {baselineDominant && comparisonDominant
                  ? t(
                      'simulationComparison.dominantClassSub',
                      'Largest share of valid pixels: {{baseline}}% in baseline, {{comparison}}% in comparison.',
                      {
                        baseline: baselineDominant.value.toFixed(1),
                        comparison: comparisonDominant.value.toFixed(1),
                      },
                    )
                  : t('simulationComparison.dominantClassUnavailable', 'Distribution data is not available.')}
              </p>
            </div>

            <div className="rounded-lg bg-muted/25 border border-border px-3 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('simulationComparison.analyzedArea', 'Analyzed area')}
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">
                {formatArea(a.metrics.totalAreaKm2)}
                <span className="mx-1.5 text-muted-foreground">→</span>
                {formatArea(b.metrics.totalAreaKm2)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  'simulationComparison.analyzedAreaSub',
                  'Area is calculated from valid non-nodata pixels, so it can differ between model outputs.',
                )}
              </p>
            </div>

            <div className="rounded-lg bg-muted/25 border border-border px-3 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('simulationComparison.readingDirection', 'Interpretation')}
              </div>
              <div className="mt-2 space-y-1.5">
                <ExplanationRow
                  tone="bad"
                  label={t('simulationComparison.badDeltaLabel', 'More High/Very High')}
                  text={t('simulationComparison.badDeltaText', 'means the comparison model is more severe.')}
                />
                <ExplanationRow
                  tone="good"
                  label={t('simulationComparison.goodDeltaLabel', 'More Very Low/Low')}
                  text={t('simulationComparison.goodDeltaText', 'usually means risk shifted toward safer classes.')}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {bothReady && (
        <ComparisonInsightCharts
          baselineMap={aMapSamples.data}
          comparisonMap={bMapSamples.data}
          isMapLoading={aMapSamples.isLoading || bMapSamples.isLoading}
          mapError={aMapSamples.error || bMapSamples.error}
          comparisonLabel={t('simulationComparison.comparison', 'Comparison')}
        />
      )}

      {bothReady && deltas && (
        <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <header className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {t('simulationComparison.deltaTitle', 'Risk Delta')}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {t('simulationComparison.deltaSub', 'Change from baseline to comparison')}
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <DeltaCell
              label={t('modelResults.risk.overall', 'Overall Risk')}
              baseline={a.metrics.overallRiskLevel ? LEVEL_LABEL[a.metrics.overallRiskLevel] : '—'}
              comparison={b.metrics.overallRiskLevel ? LEVEL_LABEL[b.metrics.overallRiskLevel] : '—'}
              deltaPill={<DeltaPill delta={deltas.levelDelta} digits={0} invert />}
            />
            <DeltaCell
              label={t('modelResults.risk.meanScore', 'Mean Risk Score')}
              baseline={formatScore(a.metrics.overallRiskScore)}
              comparison={formatScore(b.metrics.overallRiskScore)}
              deltaPill={<DeltaPill delta={deltas.scoreDelta} invert />}
            />
            <DeltaCell
              label={t('modelResults.risk.highPlusArea', 'High + Very High area')}
              baseline={formatArea(a.metrics.affectedAreaKm2)}
              comparison={formatArea(b.metrics.affectedAreaKm2)}
              deltaPill={<DeltaPill delta={deltas.areaDelta} suffix=" km²" invert />}
            />
            <DeltaCell
              label={t('modelResults.risk.highPlusPixels', 'High + Very High pixels')}
              baseline={formatCount(a.metrics.highRiskZones)}
              comparison={formatCount(b.metrics.highRiskZones)}
              deltaPill={<DeltaPill delta={deltas.zonesDelta} digits={0} invert />}
            />
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('simulationComparison.baseline', 'Baseline')}
            </span>
            <span className="text-xs text-foreground truncate">{model1.title}</span>
          </div>
          <RiskMetricsCard metrics={a.metrics} isLoading={a.isLoading} error={a.error} ready={a.ready} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('simulationComparison.comparison', 'Comparison')}
            </span>
            <span className="text-xs text-foreground truncate">{model2.title}</span>
          </div>
          <RiskMetricsCard metrics={b.metrics} isLoading={b.isLoading} error={b.error} ready={b.ready} />
        </div>
      </div>

      {bothReady && a.metrics.riskDistribution && b.metrics.riskDistribution && (
        <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <header className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300">
              <BarChart3 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {t('simulationComparison.distribution', 'Distribution Comparison')}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  'simulationComparison.distributionSub',
                  'Share of pixels per risk level. Lighter bar = baseline, solid = comparison.',
                )}
              </p>
            </div>
          </header>

          <DistributionComparisonChart
            baseline={a.metrics.riskDistribution}
            comparison={b.metrics.riskDistribution}
            baselineLabel={t('simulationComparison.baseline', 'Baseline')}
            comparisonLabel={t('simulationComparison.comparison', 'Comparison')}
          />

          <div className="mt-4 space-y-2">
            {(
              [
                { key: 'veryLow', label: 'Very Low' },
                { key: 'low', label: 'Low' },
                { key: 'moderate', label: 'Moderate' },
                { key: 'high', label: 'High' },
                { key: 'veryHigh', label: 'Very High' },
              ] as const
            ).map(({ key, label }) => {
              const av = a.metrics.riskDistribution![key];
              const bv = b.metrics.riskDistribution![key];
              const delta = bv - av;
              const invertForLevel = key === 'high' || key === 'veryHigh';
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md bg-muted/30"
                >
                  <span className="text-xs font-medium text-foreground w-24">{label}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {av.toFixed(1)}%
                      </span>
                      <span className="mx-1.5 text-muted-foreground/50">→</span>
                      <span className="text-violet-600 dark:text-violet-400 font-medium">
                        {bv.toFixed(1)}%
                      </span>
                    </span>
                    <DeltaPill delta={delta} suffix="%" digits={1} invert={invertForLevel} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
