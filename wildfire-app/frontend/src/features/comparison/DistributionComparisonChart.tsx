import { FC, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { RiskDistribution } from '@/features/model-results/hooks/useRiskMetrics';

interface DistributionComparisonChartProps {
  baseline: RiskDistribution;
  comparison: RiskDistribution;
  baselineLabel?: string;
  comparisonLabel?: string;
  dark?: boolean;
}

const LEVELS: Array<{ key: keyof RiskDistribution; label: string; color: string }> = [
  { key: 'veryLow', label: 'Very Low', color: '#2563eb' },
  { key: 'low', label: 'Low', color: '#16a34a' },
  { key: 'moderate', label: 'Moderate', color: '#eab308' },
  { key: 'high', label: 'High', color: '#ea580c' },
  { key: 'veryHigh', label: 'Very High', color: '#dc2626' },
];

export const DistributionComparisonChart: FC<DistributionComparisonChartProps> = ({
  baseline,
  comparison,
  baselineLabel = 'Baseline',
  comparisonLabel = 'Comparison',
}) => {
  const option = useMemo<EChartsOption>(() => {
    const categories = LEVELS.map((l) => l.label);
    const baselineValues = LEVELS.map((l) => Number(baseline[l.key].toFixed(2)));
    const comparisonValues = LEVELS.map((l) => Number(comparison[l.key].toFixed(2)));
    const levelColors = LEVELS.map((l) => l.color);

    return {
      grid: { left: 48, right: 16, top: 36, bottom: 28, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v) => `${Number(v).toFixed(1)}%`,
      },
      legend: {
        data: [baselineLabel, comparisonLabel],
        top: 0,
        textStyle: { fontSize: 11 },
        itemWidth: 14,
        itemHeight: 10,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { fontSize: 11 },
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          formatter: '{value}%',
        },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        max: (value) => Math.min(100, Math.ceil(value.max / 10) * 10 + 5),
      },
      series: [
        {
          name: baselineLabel,
          type: 'bar',
          data: baselineValues.map((v, i) => ({
            value: v,
            itemStyle: { color: levelColors[i], opacity: 0.55, borderRadius: [4, 4, 0, 0] },
          })),
          barGap: '10%',
          barCategoryGap: '30%',
        },
        {
          name: comparisonLabel,
          type: 'bar',
          data: comparisonValues.map((v, i) => ({
            value: v,
            itemStyle: { color: levelColors[i], borderRadius: [4, 4, 0, 0] },
          })),
        },
      ],
    };
  }, [baseline, comparison, baselineLabel, comparisonLabel]);

  return (
    <ReactECharts
      option={option}
      style={{ height: 280, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
};
