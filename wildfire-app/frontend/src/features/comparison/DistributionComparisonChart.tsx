import { FC, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { RiskDistribution } from '@/features/model-results';
import { chartRiskColor } from "@/lib/riskPalette";
import { RISK_LEVELS } from "@/features/model-results/viewer-config";

interface DistributionComparisonChartProps {
  baseline: RiskDistribution;
  comparison: RiskDistribution;
  baselineLabel?: string;
  comparisonLabel?: string;
  dark?: boolean;
}

const LEVELS: Array<{ key: keyof RiskDistribution; label: string; color: string }> = RISK_LEVELS.map((lvl) => ({
  key: lvl.metricKey as keyof RiskDistribution,
  label: lvl.label,
  get color() { return chartRiskColor(lvl.value); },
}));

export const DistributionComparisonChart: FC<DistributionComparisonChartProps> = ({
  baseline,
  comparison,
  baselineLabel = 'Baseline',
  comparisonLabel = 'Comparison',
}) => {
  const option = useMemo<EChartsOption>(() => {
    return {
      grid: { left: 8, right: 24, top: 34, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v) => `${Number(v).toFixed(1)}%`,
      },
      legend: {
        top: 0,
        textStyle: { fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
        icon: 'roundRect',
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
      },
      yAxis: {
        type: 'category',
        // bottom-up order
        data: [comparisonLabel, baselineLabel],
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 11, fontWeight: 600, color: '#64748b' },
      },
      series: LEVELS.map((level) => ({
        name: level.label,
        type: 'bar' as const,
        stack: 'share',
        barWidth: 36,
        data: [
          Number(comparison[level.key].toFixed(2)),
          Number(baseline[level.key].toFixed(2)),
        ],
        itemStyle: { color: level.color },
        emphasis: { focus: 'series' as const },
        label: {
          show: true,
          formatter: (params: { value?: unknown }) => {
            const value = Number(params.value);
            return value >= 6 ? `${value.toFixed(0)}%` : '';
          },
          color: '#fff',
          fontSize: 10,
          fontWeight: 'bold' as const,
        },
      })),
    };
  }, [baseline, comparison, baselineLabel, comparisonLabel]);

  return (
    <ReactECharts
      option={option}
      style={{ height: 200, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
};
