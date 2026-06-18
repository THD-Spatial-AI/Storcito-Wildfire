import { FC, useMemo } from 'react';
import * as echarts from 'echarts';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTranslation } from '@/i18n';

import type { RiskMapSample, RiskMapSamples } from './useRiskMapSamples';

interface ComparisonInsightChartsProps {
  baselineMap?: RiskMapSamples | null;
  comparisonMap?: RiskMapSamples | null;
  isMapLoading?: boolean;
  mapError?: string | null;
  comparisonLabel?: string;
}

interface RiskCellData {
  name: string;
  value: number;
  level: RiskMapSample['level'];
  row: number;
  column: number;
}

interface RiskMapStats {
  meanScore: number | null;
  dominantLevel: RiskMapSample['level'];
  dominantPercent: number;
  highPlusPercent: number;
  highPlusCount: number;
  validCount: number;
  highestScore: number | null;
}

const RISK_LEVELS: Array<{
  value: number;
  label: string;
  level: RiskMapSample['level'];
  color: string;
}> = [
  { value: 1, label: 'Very Low', level: 'very_low', color: '#2563eb' },
  { value: 2, label: 'Low', level: 'low', color: '#16a34a' },
  { value: 3, label: 'Moderate', level: 'moderate', color: '#eab308' },
  { value: 4, label: 'High', level: 'high', color: '#ea580c' },
  { value: 5, label: 'Very High', level: 'very_high', color: '#dc2626' },
];

const LEVEL_LABEL: Record<RiskMapSample['level'], string> = {
  very_low: 'Very Low',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  very_high: 'Very High',
  unknown: 'Unknown',
};

const asFormatterParam = (value: unknown): { data?: unknown; value?: unknown; name?: unknown } =>
  typeof value === 'object' && value !== null
    ? (value as { data?: unknown; value?: unknown; name?: unknown })
    : {};

const cellName = (sample: Pick<RiskMapSample, 'row' | 'column'>): string =>
  `r${sample.row}-c${sample.column}`;

const buildCellFeatureCollection = (samples: RiskMapSamples): GeoJSON.FeatureCollection => {
  const { minx, miny, maxx, maxy } = samples.bounds;
  const gridSize = Math.max(1, samples.grid_size);
  const cellWidth = (maxx - minx) / gridSize;
  const cellHeight = (maxy - miny) / gridSize;

  const features: GeoJSON.Feature[] = samples.samples.map((sample) => {
    const west = minx + sample.column * cellWidth;
    const east = west + cellWidth;
    const south = miny + sample.row * cellHeight;
    const north = south + cellHeight;
    const name = cellName(sample);

    return {
      type: 'Feature',
      properties: {
        name,
        value: Math.round(sample.value),
        level: sample.level,
        row: sample.row,
        column: sample.column,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
            [west, south],
          ],
        ],
      },
    };
  });

  return { type: 'FeatureCollection', features };
};

const formatDelta = (value: number): string => {
  if (Math.abs(value) < 0.05) return '0.0';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
};

const formatLevel = (level: RiskMapSample['level']): string => LEVEL_LABEL[level] ?? 'Unknown';

const ChartPlaceholder: FC<{ text: string }> = ({ text }) => (
  <div className="flex h-[316px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
    {text}
  </div>
);

const getRiskStats = (samples: RiskMapSamples | null | undefined): RiskMapStats | null => {
  if (!samples?.samples.length) return null;

  const counts = new Map<RiskMapSample['level'], number>();
  let scoreSum = 0;
  let highestScore = 0;

  samples.samples.forEach((sample) => {
    counts.set(sample.level, (counts.get(sample.level) ?? 0) + 1);
    scoreSum += sample.value;
    highestScore = Math.max(highestScore, sample.value);
  });

  const validCount = samples.samples.length;
  const dominant = Array.from(counts.entries()).reduce(
    (best, item) => (item[1] > best[1] ? item : best),
    ['unknown', 0] as [RiskMapSample['level'], number],
  );
  const highPlusCount = (counts.get('high') ?? 0) + (counts.get('very_high') ?? 0);

  return {
    meanScore: scoreSum / validCount,
    dominantLevel: dominant[0],
    dominantPercent: (dominant[1] / validCount) * 100,
    highPlusPercent: (highPlusCount / validCount) * 100,
    highPlusCount,
    validCount,
    highestScore,
  };
};

const SummaryTile: FC<{
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}> = ({ label, value, detail, tone = 'default' }) => {
  const toneClass =
    tone === 'bad'
      ? 'border-red-200 bg-red-50/60 text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-200'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50/70 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200'
        : tone === 'good'
          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200'
          : 'border-border bg-muted/25 text-foreground';

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-sm font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] opacity-75">{detail}</div>
    </div>
  );
};

const RiskLegend: FC = () => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
    {RISK_LEVELS.map((level) => (
      <span key={level.level} className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: level.color }} />
        {level.label}
      </span>
    ))}
  </div>
);

const HeatmapGradientLegend: FC = () => (
  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
    <span>Very Low</span>
    <span
      className="h-2.5 w-32 rounded-full border border-border"
      style={{
        background:
          'linear-gradient(90deg, #2563eb 0%, #16a34a 25%, #eab308 50%, #ea580c 75%, #dc2626 100%)',
      }}
    />
    <span>Very High</span>
  </div>
);

export const ComparisonInsightCharts: FC<ComparisonInsightChartsProps> = ({
  baselineMap,
  comparisonMap,
  isMapLoading = false,
  mapError = null,
  comparisonLabel = 'Comparison',
}) => {
  const { t } = useTranslation();
  const hasMapData = Boolean(comparisonMap?.samples.length);

  const mapName = useMemo(() => {
    if (!comparisonMap) return 'risk-comparison-empty';
    return `risk-comparison-${comparisonMap.result_id}-${comparisonMap.grid_size}-${comparisonMap.valid_samples}`;
  }, [comparisonMap]);

  const geoJson = useMemo(() => {
    if (!comparisonMap) return null;
    return buildCellFeatureCollection(comparisonMap);
  }, [comparisonMap]);

  const registeredMapName = useMemo(() => {
    if (!geoJson?.features.length) return null;
    echarts.registerMap(mapName, geoJson as unknown as Parameters<typeof echarts.registerMap>[1]);
    return mapName;
  }, [geoJson, mapName]);

  const baselineStats = useMemo(() => getRiskStats(baselineMap), [baselineMap]);
  const comparisonStats = useMemo(() => getRiskStats(comparisonMap), [comparisonMap]);

  const heatmapOption = useMemo<EChartsOption>(() => {
    if (!registeredMapName || !comparisonMap) return {};

    // Smooth view: the SAME sampled cells as the choropleth, but coloured on a
    // continuous ramp with no borders so neighbouring values blend into a
    // surface. This is faithful to the data — unlike an ECharts density heatmap,
    // which accumulates overlapping points and wrongly saturates everything red.
    const data: RiskCellData[] = comparisonMap.samples.map((sample) => ({
      name: cellName(sample),
      value: Number(sample.value.toFixed(2)),
      level: sample.level,
      row: sample.row,
      column: sample.column,
    }));

    return {
      tooltip: {
        trigger: 'item',
        borderWidth: 0,
        padding: 10,
        formatter: (raw: unknown) => {
          const point = asFormatterParam(raw).data as RiskCellData | undefined;
          if (!point) return '';
          return [
            `<strong>${formatLevel(point.level)}</strong>`,
            `${comparisonLabel}: ${point.value.toFixed(1)} / 5`,
            `Sample cell: ${point.row + 1}, ${point.column + 1}`,
          ].join('<br/>');
        },
      },
      visualMap: {
        show: false,
        type: 'continuous',
        min: 1,
        max: 5,
        inRange: {
          color: RISK_LEVELS.map((level) => level.color),
        },
      },
      series: [
        {
          name: t('simulationComparison.riskIntensityHeatmap', 'Risk intensity'),
          type: 'map',
          map: registeredMapName,
          nameProperty: 'name',
          layoutCenter: ['50%', '49%'],
          layoutSize: '80%',
          roam: false,
          selectedMode: false,
          data,
          itemStyle: {
            borderWidth: 0,
          },
          emphasis: {
            label: { show: false },
            itemStyle: {
              borderColor: '#0f172a',
              borderWidth: 0.8,
            },
          },
        },
      ],
    };
  }, [comparisonLabel, comparisonMap, registeredMapName, t]);

  const choroplethOption = useMemo<EChartsOption>(() => {
    if (!registeredMapName || !comparisonMap) return {};

    const data: RiskCellData[] = comparisonMap.samples.map((sample) => ({
      name: cellName(sample),
      value: Math.round(sample.value),
      level: sample.level,
      row: sample.row,
      column: sample.column,
    }));

    return {
      tooltip: {
        trigger: 'item',
        borderWidth: 0,
        padding: 10,
        formatter: (raw: unknown) => {
          const params = asFormatterParam(raw);
          const point = params.data as RiskCellData | undefined;
          if (!point) return '';
          return [
            `<strong>${formatLevel(point.level)}</strong>`,
            `${comparisonLabel}: ${point.value.toFixed(0)} / 5`,
            `Cell: ${point.row + 1}, ${point.column + 1}`,
          ].join('<br/>');
        },
      },
      visualMap: {
        show: false,
        type: 'piecewise',
        left: 8,
        bottom: 6,
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#475569', fontSize: 10 },
        pieces: RISK_LEVELS.map((level) => ({
          value: level.value,
          label: level.label,
          color: level.color,
        })),
      },
      series: [
        {
          name: t('simulationComparison.filledRiskMap', 'Filled risk map'),
          type: 'map',
          map: registeredMapName,
          nameProperty: 'name',
          layoutCenter: ['50%', '49%'],
          layoutSize: '80%',
          roam: false,
          selectedMode: false,
          data,
          itemStyle: {
            borderColor: 'rgba(255,255,255,0.7)',
            borderWidth: 0.35,
          },
          emphasis: {
            label: { show: false },
            itemStyle: {
              borderColor: '#0f172a',
              borderWidth: 0.8,
              shadowBlur: 8,
              shadowColor: 'rgba(15,23,42,0.24)',
            },
          },
        },
      ],
    };
  }, [comparisonLabel, comparisonMap, registeredMapName, t]);

  const totalCells = comparisonMap?.total_samples ?? 0;
  const validCells = comparisonMap?.valid_samples ?? 0;
  const coverage = totalCells > 0 ? (validCells / totalCells) * 100 : null;
  const meanDelta =
    baselineStats?.meanScore !== null &&
    baselineStats?.meanScore !== undefined &&
    comparisonStats?.meanScore !== null &&
    comparisonStats?.meanScore !== undefined
      ? comparisonStats.meanScore - baselineStats.meanScore
      : null;
  const highPlusDelta =
    baselineStats && comparisonStats
      ? comparisonStats.highPlusPercent - baselineStats.highPlusPercent
      : null;

  return (
    <section className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {t('simulationComparison.insightCharts', 'Risk Map Charts')}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {t(
              'simulationComparison.insightChartsSub',
              'These maps summarize the sampled raster cells from the comparison model. Use them to see risk concentration and exact class areas.',
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
          {comparisonStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <SummaryTile
                label={t('simulationComparison.sampleMean', 'Sample mean')}
                value={`${comparisonStats.meanScore?.toFixed(2) ?? '—'} / 5`}
                detail={
                  meanDelta === null
                    ? t('simulationComparison.comparisonOnly', 'Comparison model')
                    : `${formatDelta(meanDelta)} ${t('simulationComparison.fromBaseline', 'from baseline')}`
                }
                tone={meanDelta !== null && meanDelta > 0.05 ? 'bad' : meanDelta !== null && meanDelta < -0.05 ? 'good' : 'default'}
              />
              <SummaryTile
                label={t('simulationComparison.dominantClass', 'Dominant class')}
                value={formatLevel(comparisonStats.dominantLevel)}
                detail={`${comparisonStats.dominantPercent.toFixed(1)}% ${t('simulationComparison.validCellsShare', 'of valid cells')}`}
                tone={comparisonStats.dominantLevel === 'high' || comparisonStats.dominantLevel === 'very_high' ? 'bad' : comparisonStats.dominantLevel === 'moderate' ? 'warn' : 'good'}
              />
              <SummaryTile
                label={t('simulationComparison.highVeryHigh', 'High + Very High')}
                value={`${comparisonStats.highPlusPercent.toFixed(1)}%`}
                detail={
                  highPlusDelta === null
                    ? `${comparisonStats.highPlusCount.toLocaleString()} ${t('simulationComparison.cells', 'cells')}`
                    : `${formatDelta(highPlusDelta)} pp ${t('simulationComparison.fromBaseline', 'from baseline')}`
                }
                tone={comparisonStats.highPlusPercent >= 15 ? 'bad' : comparisonStats.highPlusPercent > 0 ? 'warn' : 'good'}
              />
              <SummaryTile
                label={t('simulationComparison.samplingGrid', 'Sampling grid')}
                value={`${comparisonMap?.grid_size ?? '—'} × ${comparisonMap?.grid_size ?? '—'}`}
                detail={`${validCells.toLocaleString()} ${t('simulationComparison.validCells', 'valid cells')}`}
              />
            </div>
          )}

          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs text-muted-foreground">
                {t(
                  'simulationComparison.sampleMapNote',
                  'This is a sampled raster view, not the street map. The filled cells show the same risk classes used by the Fire Risk layer.',
                )}
              </p>
              <RiskLegend />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  {t('simulationComparison.geoHeatmap', 'Geo Heatmap')}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t(
                    'simulationComparison.geoHeatmapSub',
                    'Smooth view of where risk is concentrated. Red means the strongest sampled risk.',
                  )}
                </div>
              </div>
              <HeatmapGradientLegend />
            </div>
            <ReactECharts
              option={heatmapOption}
              style={{ height: 330, width: '100%' }}
              opts={{ renderer: 'svg' }}
              notMerge
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  {t('simulationComparison.choroplethMap', 'Filled Risk Cells')}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {t(
                    'simulationComparison.choroplethMapSub',
                    'Exact sampled cells by risk class. Use this when the smooth heatmap hides cell boundaries.',
                  )}
                </div>
              </div>
              <RiskLegend />
            </div>
            <ReactECharts
              option={choroplethOption}
              style={{ height: 330, width: '100%' }}
              opts={{ renderer: 'svg' }}
              notMerge
            />
          </div>
          </div>
        </div>
      )}
    </section>
  );
};
