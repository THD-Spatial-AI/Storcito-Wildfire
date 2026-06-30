import { useTranslation } from '@/i18n';
import { CloudRain, Compass, Droplets, Thermometer, Wind } from 'lucide-react';

import type { Model } from '../../model-dashboard/services/modelService';
import { useRiskMetrics } from '../hooks/useRiskMetrics';
import { RiskMetricsCard } from './RiskMetricsCard';

interface AssessmentResultSummary {
  id: number;
  geoserver_status?: string;
  metadata?: {
    weather_summary?: WeatherSummary | null;
  } | null;
}

interface AssessmentDetailsSidebarProps {
  model: Model;
  results?: AssessmentResultSummary[];
}

interface WeatherSummary {
  date?: string | null;
  time?: string | null;
  method?: string | null;
  sample_count?: number | null;
  temperature_c?: number | null;
  relative_humidity_pct?: number | null;
  wind_speed_mps?: number | null;
  wind_speed_kmh?: number | null;
  wind_direction_deg?: number | null;
  precipitation_mm?: number | null;
  ffmc?: number | null;
  dmc?: number | null;
  dc?: number | null;
  source?: string | null;
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

const formatNumber = (value: number | null | undefined, digits = 1) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
};

const formatWeatherTime = (value?: string | null) => {
  if (!value) return '—';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${hour}:${minute}`;
};

const windCardinal = (degrees: number | null | undefined) => {
  if (typeof degrees !== 'number' || !Number.isFinite(degrees)) return '';
  const labels = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return labels[Math.round(degrees / 22.5) % labels.length];
};

const formatWindDirection = (degrees: number | null | undefined) => {
  if (typeof degrees !== 'number' || !Number.isFinite(degrees)) return '—';
  return `${degrees.toFixed(0)}° ${windCardinal(degrees)}`;
};

export const AssessmentDetailsSidebar = ({
  model,
  results = [],
}: AssessmentDetailsSidebarProps) => {
  const { t } = useTranslation();
  const { metrics, isLoading, error, ready } = useRiskMetrics(model.id);
  const weatherSummary = results[0]?.metadata?.weather_summary ?? null;

  const statusKey = (model.status ?? '').toLowerCase();

  return (
    <aside className="relative h-full w-full border-l border-border bg-background flex flex-col">
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

        {/* Location + Assessment Period are already shown in the top toolbar. */}

        {weatherSummary && (
          <section className="bg-card border border-border rounded-lg p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                  {t('modelResults.details.fireWeather', 'Fire weather')}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatWeatherTime(weatherSummary.time)}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground text-right">
                {weatherSummary.method === 'aoi_grid_mean'
                  ? t('modelResults.details.aoiMean', 'AOI mean')
                  : t('modelResults.details.gridSample', 'Grid sample')}
                {typeof weatherSummary.sample_count === 'number' ? ` · ${weatherSummary.sample_count}` : ''}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Wind className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{t('modelResults.details.windSpeed', 'Wind speed')}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {formatNumber(weatherSummary.wind_speed_kmh)} km/h
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Compass className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{t('modelResults.details.windDirection', 'Wind direction')}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {formatWindDirection(weatherSummary.wind_direction_deg)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Thermometer className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{t('modelResults.details.temperature', 'Temperature')}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {formatNumber(weatherSummary.temperature_c)}°C
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Droplets className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{t('modelResults.details.humidity', 'Humidity')}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {formatNumber(weatherSummary.relative_humidity_pct)}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <CloudRain className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{t('modelResults.details.precipitation', 'Precipitation')}</span>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {formatNumber(weatherSummary.precipitation_mm)} mm
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-2">
                {t('modelResults.details.moistureCodes', 'Fuel moisture codes')}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">FFMC</p>
                  <p className="text-xs font-semibold text-foreground">{formatNumber(weatherSummary.ffmc)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">DMC</p>
                  <p className="text-xs font-semibold text-foreground">{formatNumber(weatherSummary.dmc)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">DC</p>
                  <p className="text-xs font-semibold text-foreground">{formatNumber(weatherSummary.dc)}</p>
                </div>
              </div>
            </div>
          </section>
        )}

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
