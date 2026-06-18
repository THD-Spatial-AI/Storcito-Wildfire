import { FC, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

import type { RiskDistribution } from '../hooks/useRiskMetrics';

interface RiskDistributionDonutProps {
  distribution: RiskDistribution;
  height?: number;
}

const LEVELS: Array<{ key: keyof RiskDistribution; label: string; color: string }> = [
  { key: 'veryLow', label: 'Very Low', color: '#2563eb' },
  { key: 'low', label: 'Low', color: '#16a34a' },
  { key: 'moderate', label: 'Moderate', color: '#eab308' },
  { key: 'high', label: 'High', color: '#ea580c' },
  { key: 'veryHigh', label: 'Very High', color: '#dc2626' },
];

export const RiskDistributionDonut: FC<RiskDistributionDonutProps> = ({
  distribution,
  height = 180,
}) => {
  const option = useMemo<EChartsOption>(() => {
    const data = LEVELS
      .map((l) => ({
        name: l.label,
        value: Number(distribution[l.key].toFixed(2)),
        itemStyle: { color: l.color },
      }))
      .filter((d) => d.value > 0);

    return {
      tooltip: {
        trigger: 'item',
        valueFormatter: (v) => `${Number(v).toFixed(1)}%`,
      },
      legend: { show: false },
      series: [
        {
          name: 'Risk Distribution',
          type: 'pie',
          radius: ['55%', '80%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          padAngle: 2,
          itemStyle: { borderRadius: 4, borderColor: 'transparent', borderWidth: 2 },
          label: { show: false },
          labelLine: { show: false },
          data,
        },
      ],
    };
  }, [distribution]);

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  );
};
