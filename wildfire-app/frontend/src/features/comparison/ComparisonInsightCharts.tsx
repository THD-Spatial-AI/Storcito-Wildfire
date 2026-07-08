import { FC, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { ArrowRight, MoveDownRight, MoveUpRight } from 'lucide-react';
import { useTranslation } from '@/i18n';

import type { RiskMapBounds, RiskMapSample, RiskMapSamples } from './useRiskMapSamples';

interface ComparisonInsightChartsProps {
  baselineMap?: RiskMapSamples | null;
  comparisonMap?: RiskMapSamples | null;
  baselineAreaKm2?: number | null;
  comparisonAreaKm2?: number | null;
  isMapLoading?: boolean;
  mapError?: string | null;
  baselineLabel?: string;
  comparisonLabel?: string;
}

type RiskLevel = Exclude<RiskMapSample['level'], 'unknown'>;

const ORDERED_LEVELS: Array<{ level: RiskLevel; label: string; color: string }> = [
  { level: 'very_low', label: 'Very Low', color: '#2563eb' },
  { level: 'low', label: 'Low', color: '#16a34a' },
  { level: 'moderate', label: 'Moderate', color: '#eab308' },
  { level: 'high', label: 'High', color: '#ea580c' },
  { level: 'very_high', label: 'Very High', color: '#dc2626' },
];

const levelIndex = (level: RiskMapSample['level']): number =>
  ORDERED_LEVELS.findIndex((l) => l.level === level);

const CELLS_KEY = 'simulationComparison.cells';
const BASELINE_COLOR = '#3b82f6';
const COMPARISON_COLOR = '#8b5cf6';
const DENSITY_BINS = 32;

// Continuous-score bins map to classes by rounding, so class k covers [k-0.5, k+0.5).
const CLASS_BANDS: Array<{ from: number; to: number; color: string }> = ORDERED_LEVELS.map(
  (level, i) => ({
    from: i === 0 ? 1 : i + 0.5,
    to: i === ORDERED_LEVELS.length - 1 ? 5 : i + 1.5,
    color: level.color,
  }),
);

// Risk-score frequency distribution, as % of valid sampled cells per bin.
const computeDensity = (
  samples: RiskMapSamples | null | undefined,
): Array<[number, number]> | null => {
  if (!samples?.samples.length) return null;
  const counts = new Array<number>(DENSITY_BINS).fill(0);
  const width = 4 / DENSITY_BINS;
  let valid = 0;
  samples.samples.forEach((s) => {
    if (levelIndex(s.level) < 0) return;
    const clamped = Math.min(5, Math.max(1, s.value));
    const bin = Math.min(DENSITY_BINS - 1, Math.floor((clamped - 1) / width));
    counts[bin] += 1;
    valid += 1;
  });
  if (!valid) return null;
  return counts.map((c, i) => [
    Number((1 + (i + 0.5) * width).toFixed(3)),
    Number(((c / valid) * 100).toFixed(2)),
  ]);
};

const computeClassShares = (samples: RiskMapSamples | null | undefined): number[] | null => {
  if (!samples?.samples.length) return null;
  const counts = ORDERED_LEVELS.map(() => 0);
  let valid = 0;
  samples.samples.forEach((s) => {
    const idx = levelIndex(s.level);
    if (idx < 0) return;
    counts[idx] += 1;
    valid += 1;
  });
  if (!valid) return null;
  return counts.map((c) => c / valid);
};

const formatAreaValue = (km2: number): string =>
  km2 >= 1 ? `${km2.toFixed(1)} km²` : `${(km2 * 100).toFixed(1)} ha`;

interface TransitionAnalysis {
  matrix: number[][];
  matched: number;
  unchanged: number;
  increased: number;
  decreased: number;
}

interface TransitionEntry {
  from: number;
  to: number;
  count: number;
  percent: number;
}

// Change analysis needs both models sampled on (almost) the same grid.
const boundsAlign = (a: RiskMapBounds, b: RiskMapBounds): boolean => {
  const tol = Math.max(a.maxx - a.minx, a.maxy - a.miny, 1e-9) * 0.02;
  return (
    Math.abs(a.minx - b.minx) < tol &&
    Math.abs(a.miny - b.miny) < tol &&
    Math.abs(a.maxx - b.maxx) < tol &&
    Math.abs(a.maxy - b.maxy) < tol
  );
};

const computeTransitions = (
  baseline: RiskMapSamples | null | undefined,
  comparison: RiskMapSamples | null | undefined,
): TransitionAnalysis | null => {
  if (!baseline?.samples.length || !comparison?.samples.length) return null;
  if (baseline.grid_size !== comparison.grid_size) return null;
  if (!boundsAlign(baseline.bounds, comparison.bounds)) return null;

  const baseCells = new Map<string, number>();
  baseline.samples.forEach((s) => {
    const idx = levelIndex(s.level);
    if (idx >= 0) baseCells.set(`${s.row}:${s.column}`, idx);
  });

  const matrix = ORDERED_LEVELS.map(() => ORDERED_LEVELS.map(() => 0));
  let matched = 0;
  let unchanged = 0;
  let increased = 0;
  let decreased = 0;

  comparison.samples.forEach((s) => {
    const to = levelIndex(s.level);
    if (to < 0) return;
    const from = baseCells.get(`${s.row}:${s.column}`);
    if (from === undefined) return;
    matrix[from][to] += 1;
    matched += 1;
    if (to === from) unchanged += 1;
    else if (to > from) increased += 1;
    else decreased += 1;
  });

  if (!matched) return null;
  return { matrix, matched, unchanged, increased, decreased };
};

const formatLevel = (level: RiskMapSample['level']): string =>
  ORDERED_LEVELS.find((l) => l.level === level)?.label ?? 'Unknown';

const ChartPlaceholder: FC<{ text: string }> = ({ text }) => (
  <div className="flex h-[316px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
    {text}
  </div>
);

const ClassChip: FC<{ levelIdx: number }> = ({ levelIdx }) => {
  const level = ORDERED_LEVELS[levelIdx];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: level.color }} />
      {level.label}
    </span>
  );
};

const ChangeStat: FC<{ dotClass: string; percent: number; label: string }> = ({
  dotClass,
  percent,
  label,
}) => (
  <div className="flex items-center gap-2">
    <span className={`h-2 w-2 rounded-full ${dotClass}`} />
    <span className="text-xs font-bold text-foreground">{percent.toFixed(1)}%</span>
    <span className="text-[11px] text-muted-foreground">{label}</span>
  </div>
);

export const ComparisonInsightCharts: FC<ComparisonInsightChartsProps> = ({
  baselineMap,
  comparisonMap,
  baselineAreaKm2 = null,
  comparisonAreaKm2 = null,
  isMapLoading = false,
  mapError = null,
  baselineLabel = 'Baseline',
  comparisonLabel = 'Comparison',
}) => {
  const { t } = useTranslation();
  const hasMapData = Boolean(comparisonMap?.samples.length);

  const transitions = useMemo(
    () => computeTransitions(baselineMap, comparisonMap),
    [baselineMap, comparisonMap],
  );

  const topTransitions = useMemo<TransitionEntry[]>(() => {
    if (!transitions) return [];
    const entries: TransitionEntry[] = [];
    transitions.matrix.forEach((row, from) => {
      row.forEach((count, to) => {
        if (from === to || count === 0) return;
        entries.push({ from, to, count, percent: (count / transitions.matched) * 100 });
      });
    });
    return entries.sort((a, b) => b.count - a.count).slice(0, 6);
  }, [transitions]);

  const sankeyOption = useMemo<EChartsOption | null>(() => {
    if (!transitions) return null;

    const nodes: Array<Record<string, unknown>> = [];
    const links: Array<Record<string, unknown>> = [];

    ORDERED_LEVELS.forEach((level, i) => {
      const outTotal = transitions.matrix[i].reduce((sum, v) => sum + v, 0);
      if (outTotal > 0) {
        nodes.push({
          name: `b:${level.level}`,
          itemStyle: { color: level.color, borderColor: level.color },
        });
      }
      const inTotal = transitions.matrix.reduce((sum, row) => sum + row[i], 0);
      if (inTotal > 0) {
        nodes.push({
          name: `c:${level.level}`,
          itemStyle: { color: level.color, borderColor: level.color },
          label: { position: 'left' },
        });
      }
    });

    transitions.matrix.forEach((row, from) => {
      row.forEach((count, to) => {
        if (count === 0) return;
        links.push({
          source: `b:${ORDERED_LEVELS[from].level}`,
          target: `c:${ORDERED_LEVELS[to].level}`,
          value: Number(((count / transitions.matched) * 100).toFixed(2)),
          cellCount: count,
        });
      });
    });

    const nodeLabel = (rawName: string): string => {
      const level = rawName.slice(2) as RiskLevel;
      return formatLevel(level);
    };

    return {
      tooltip: {
        trigger: 'item',
        borderWidth: 0,
        padding: 10,
        formatter: (raw: unknown) => {
          const params = raw as {
            dataType?: string;
            name?: string;
            value?: number;
            data?: { source?: string; target?: string; cellCount?: number };
          };
          if (params.dataType === 'edge' && params.data?.source && params.data.target) {
            return [
              `<strong>${nodeLabel(params.data.source)} → ${nodeLabel(params.data.target)}</strong>`,
              `${Number(params.value).toFixed(1)}% ${t('simulationComparison.ofArea', 'of the area')}`,
              `${(params.data.cellCount ?? 0).toLocaleString()} ${t(CELLS_KEY, 'cells')}`,
            ].join('<br/>');
          }
          return `<strong>${nodeLabel(params.name ?? '')}</strong>`;
        },
      },
      series: [
        {
          type: 'sankey',
          left: 12,
          right: 12,
          top: 28,
          bottom: 8,
          nodeWidth: 14,
          nodeGap: 14,
          nodeAlign: 'justify',
          draggable: false,
          emphasis: { focus: 'adjacency' },
          data: nodes,
          links,
          label: {
            position: 'right',
            fontSize: 11,
            color: '#64748b',
            formatter: (params: unknown) =>
              nodeLabel((params as { name?: string }).name ?? ''),
          },
          lineStyle: { color: 'gradient', opacity: 0.35, curveness: 0.55 },
        },
      ],
    };
  }, [t, transitions]);

  const densityOption = useMemo<EChartsOption | null>(() => {
    const baselineDensity = computeDensity(baselineMap);
    const comparisonDensity = computeDensity(comparisonMap);
    if (!baselineDensity && !comparisonDensity) return null;

    const curves: Array<{ name: string; color: string; data: Array<[number, number]> }> = [];
    if (baselineDensity) curves.push({ name: baselineLabel, color: BASELINE_COLOR, data: baselineDensity });
    if (comparisonDensity) curves.push({ name: comparisonLabel, color: COMPARISON_COLOR, data: comparisonDensity });

    return {
      grid: { left: 8, right: 16, top: 34, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => `${Number(v).toFixed(1)}%`,
      },
      legend: { top: 0, textStyle: { fontSize: 11 }, itemWidth: 14, itemHeight: 3 },
      xAxis: {
        type: 'value',
        min: 1,
        max: 5,
        interval: 1,
        axisLabel: { fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      series: curves.map((curve, i) => ({
        name: curve.name,
        type: 'line' as const,
        smooth: true,
        symbol: 'none',
        data: curve.data,
        lineStyle: { width: 2.5, color: curve.color },
        itemStyle: { color: curve.color },
        areaStyle: { color: curve.color, opacity: 0.12 },
        // Class-coloured background bands, attached once to the first series.
        markArea:
          i === 0
            ? {
                silent: true,
                data: CLASS_BANDS.map((band) => [
                  { xAxis: band.from, itemStyle: { color: band.color, opacity: 0.07 } },
                  { xAxis: band.to },
                ]),
              }
            : undefined,
      })),
    };
  }, [baselineLabel, baselineMap, comparisonLabel, comparisonMap]);

  const areaOption = useMemo<EChartsOption | null>(() => {
    const baselineShares = computeClassShares(baselineMap);
    const comparisonShares = computeClassShares(comparisonMap);
    if (!baselineShares && !comparisonShares) return null;

    // Absolute km² when both totals are known; % shares otherwise.
    const absolute =
      (baselineShares === null || baselineAreaKm2 !== null) &&
      (comparisonShares === null || comparisonAreaKm2 !== null);

    const toValues = (shares: number[] | null, totalKm2: number | null): number[] | null => {
      if (!shares) return null;
      return shares.map((share) =>
        absolute ? Number((share * (totalKm2 ?? 0)).toFixed(3)) : Number((share * 100).toFixed(2)),
      );
    };

    const seriesDefs = [
      { name: baselineLabel, color: BASELINE_COLOR, values: toValues(baselineShares, baselineAreaKm2) },
      { name: comparisonLabel, color: COMPARISON_COLOR, values: toValues(comparisonShares, comparisonAreaKm2) },
    ].filter((s): s is { name: string; color: string; values: number[] } => s.values !== null);

    const formatValue = (v: number): string =>
      absolute ? formatAreaValue(v) : `${v.toFixed(1)}%`;

    return {
      grid: { left: 8, right: 56, top: 34, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v) => formatValue(Number(v)),
      },
      legend: { top: 0, textStyle: { fontSize: 11 }, itemWidth: 12, itemHeight: 12, icon: 'roundRect' },
      xAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, formatter: absolute ? '{value} km²' : '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category',
        // Categories render bottom-up; reverse so Very Low sits on top.
        data: [...ORDERED_LEVELS].reverse().map((l) => l.label),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          fontSize: 11,
          formatter: (name: string) => {
            const level = ORDERED_LEVELS.find((l) => l.label === name);
            return level ? `{dot${ORDERED_LEVELS.indexOf(level)}|●} ${name}` : name;
          },
          rich: Object.fromEntries(
            ORDERED_LEVELS.map((l, i) => [`dot${i}`, { color: l.color, fontSize: 12 }]),
          ),
        },
      },
      series: seriesDefs.map((s) => ({
        name: s.name,
        type: 'bar' as const,
        data: [...s.values].reverse(),
        barMaxWidth: 14,
        itemStyle: { color: s.color, borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: 'right' as const,
          fontSize: 9,
          color: '#64748b',
          formatter: (params: { value?: unknown }) => {
            const v = Number(params.value);
            return v > 0 ? formatValue(v) : '';
          },
        },
      })),
    };
  }, [baselineAreaKm2, baselineLabel, baselineMap, comparisonAreaKm2, comparisonLabel, comparisonMap]);

  const totalCells = comparisonMap?.total_samples ?? 0;
  const validCells = comparisonMap?.valid_samples ?? 0;
  const coverage = totalCells > 0 ? (validCells / totalCells) * 100 : null;

  return (
    <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {t('simulationComparison.changeAnalysis', 'Risk Change Analysis')}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {t(
              'simulationComparison.changeAnalysisSub',
              'How risk shifted between the baseline and the comparison model, cell by cell on the sampled grid.',
            )}
          </p>
        </div>
        {coverage !== null && (
          <div className="rounded-full border border-border bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            {validCells.toLocaleString()} / {totalCells.toLocaleString()}{' '}
            {t('simulationComparison.validCells', 'valid cells')} · {coverage.toFixed(1)}%
          </div>
        )}
      </header>

      {!hasMapData ? (
        <ChartPlaceholder
          text={
            isMapLoading
              ? t('simulationComparison.loadingMapSamples', 'Loading geographic raster samples…')
              : mapError || t('simulationComparison.noMapSamples', 'Geographic map samples are not available yet.')
          }
        />
      ) : (
        <div className="space-y-4">

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            {densityOption && (
              <div className="xl:col-span-3 rounded-lg border border-border bg-muted/20 p-3">
                <div className="mb-1">
                  <div className="text-xs font-semibold text-foreground">
                    {t('simulationComparison.scoreDistribution', 'Risk Score Distribution')}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t(
                      'simulationComparison.scoreDistributionSub',
                      'Frequency of the continuous risk score across sampled cells. A curve shifted to the right means a more severe model; the coloured bands mark the risk classes.',
                    )}
                  </div>
                </div>
                <ReactECharts
                  option={densityOption}
                  style={{ height: 260, width: '100%' }}
                  opts={{ renderer: 'svg' }}
                  notMerge
                />
              </div>
            )}

            {areaOption && (
              <div className={`${densityOption ? 'xl:col-span-2' : 'xl:col-span-5'} rounded-lg border border-border bg-muted/20 p-3`}>
                <div className="mb-1">
                  <div className="text-xs font-semibold text-foreground">
                    {t('simulationComparison.areaByClass', 'Area by Risk Class')}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t(
                      'simulationComparison.areaByClassSub',
                      'Area assigned to each risk class — comparable even when the two models cover differently sized areas.',
                    )}
                  </div>
                </div>
                <ReactECharts
                  option={areaOption}
                  style={{ height: 260, width: '100%' }}
                  opts={{ renderer: 'svg' }}
                  notMerge
                />
              </div>
            )}
          </div>

          {transitions && sankeyOption ? (
            <>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2">
                <ChangeStat
                  dotClass="bg-slate-400"
                  percent={(transitions.unchanged / transitions.matched) * 100}
                  label={t('simulationComparison.unchangedShare', 'kept the same class')}
                />
                <ChangeStat
                  dotClass="bg-red-500"
                  percent={(transitions.increased / transitions.matched) * 100}
                  label={t('simulationComparison.increasedShare', 'moved to higher risk')}
                />
                <ChangeStat
                  dotClass="bg-emerald-500"
                  percent={(transitions.decreased / transitions.matched) * 100}
                  label={t('simulationComparison.decreasedShare', 'moved to lower risk')}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                <div className="xl:col-span-3 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {t('simulationComparison.riskFlow', 'Risk Flow')}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t(
                          'simulationComparison.riskFlowSub',
                          'Bands show the share of the area moving from a baseline class (left) to a comparison class (right).',
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <span className="text-blue-600 dark:text-blue-400">{baselineLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="text-violet-600 dark:text-violet-400">{comparisonLabel}</span>
                    </div>
                  </div>
                  <ReactECharts
                    option={sankeyOption}
                    style={{ height: 320, width: '100%' }}
                    opts={{ renderer: 'svg' }}
                    notMerge
                  />
                </div>

                <div className="xl:col-span-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs font-semibold text-foreground">
                    {t('simulationComparison.topTransitions', 'Biggest Changes')}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t(
                      'simulationComparison.topTransitionsSub',
                      'Largest class-to-class shifts by share of the area.',
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    {topTransitions.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-6 text-center">
                        {t(
                          'simulationComparison.noTransitions',
                          'No class changes detected — both models assign the same risk class everywhere.',
                        )}
                      </p>
                    ) : (
                      topTransitions.map((entry) => {
                        const worsened = entry.to > entry.from;
                        return (
                          <div
                            key={`${entry.from}-${entry.to}`}
                            className="flex items-center justify-between gap-2 rounded-md bg-card border border-border px-2.5 py-2"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {worsened ? (
                                <MoveUpRight className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              ) : (
                                <MoveDownRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              )}
                              <ClassChip levelIdx={entry.from} />
                              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <ClassChip levelIdx={entry.to} />
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs font-bold text-foreground">
                                {entry.percent.toFixed(1)}%
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {entry.count.toLocaleString()}{' '}
                                {t(CELLS_KEY, 'cells')}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t(
                  'simulationComparison.differentAreas',
                  'The two models cover different areas or grids, so a cell-by-cell change analysis is not possible. Use the side-by-side maps above and the distribution below instead.',
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
