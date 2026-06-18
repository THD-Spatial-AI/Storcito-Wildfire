import React, { useRef, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Zap, Eye, AlertTriangle, Settings2, Droplets, Wind, MapPin, Thermometer, Search, Loader2, SunDim } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@spatialhub/ui';
import { cn } from '@/lib/utils';
import { useDataDisplayStore } from '@/features/settings/store/data-display';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n';
import { useWeatherData, useWeatherSearch } from '@/features/weather/hooks';

const getUvLevelKey = (uv: number): { key: string; color: string; bgColor: string } => {
  if (uv <= 2) return { key: 'low', color: 'text-green-600', bgColor: 'bg-green-100' };
  if (uv <= 5) return { key: 'moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  if (uv <= 7) return { key: 'high', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  if (uv <= 10) return { key: 'veryHigh', color: 'text-red-600', bgColor: 'bg-red-100' };
  return { key: 'extreme', color: 'text-purple-600', bgColor: 'bg-purple-100' };
};

const getWeatherIcon = (code: number, size: string = 'w-5 h-5') => {
  const iconClass = cn(size, 'transition-transform duration-200');
  const mutedColor = 'text-gray-500 dark:text-gray-300';
  if (code === 0 || code === 1) return <Sun className={cn(iconClass, 'text-yellow-500')} />;
  if (code === 2 || code === 3) return <Cloud className={cn(iconClass, mutedColor)} />;
  if (code >= 51 && code <= 67) return <CloudRain className={cn(iconClass, 'text-blue-500')} />;
  if (code >= 71 && code <= 86) return <CloudSnow className={cn(iconClass, 'text-blue-300')} />;
  if (code >= 95 && code <= 99) return <Zap className={cn(iconClass, 'text-purple-500')} />;
  if (code === 45 || code === 48) return <Eye className={cn(iconClass, mutedColor)} />;
  return <Cloud className={cn(iconClass, mutedColor)} />;
};

interface WeatherDropdownProps { showSettingsIcon?: boolean; }
interface DetailRowProps { icon: React.ReactNode; label: string; value: React.ReactNode; tooltip: React.ReactNode; }

const DetailRow = ({ icon, label, value, tooltip }: DetailRowProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
        <div className="flex items-center gap-2">{icon}<span className="text-sm text-muted-foreground">{label}</span></div>
        <span className="text-sm font-medium text-foreground">{value}</span>
      </div>
    </TooltipTrigger>
    <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700 shadow-lg">{tooltip}</TooltipContent>
  </Tooltip>
);

const WeatherDropdown: React.FC<WeatherDropdownProps> = ({ showSettingsIcon = true }) => {
  const { t } = useTranslation();
  const { data: currentWeather, loading, error, refresh, location } = useWeatherData();
  const { query, setQuery, results, selecting, onSelect } = useWeatherSearch();
  const { temperatureUnit } = useDataDisplayStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const getUvLevel = (uv: number): { label: string; color: string; bgColor: string; description: string } => {
    const { key, color, bgColor } = getUvLevelKey(uv);
    return { label: t(`weather.uvLevels.${key}`), color, bgColor, description: t(`weather.uvDescriptions.${key}`) };
  };
  const formatTemperature = (celsius: number) => temperatureUnit === 'fahrenheit' ? `${Math.round((celsius * 9/5) + 32)}°` : `${Math.round(celsius)}°`;
  const getTemperatureBoth = (celsius: number) => ({ celsius: Math.round(celsius), fahrenheit: Math.round((celsius * 9/5) + 32) });
  const handleMouseEnter = () => setIsDropdownOpen(true);
  const handleMouseLeave = () => {
    if (document.activeElement !== searchInputRef.current) {
      setIsDropdownOpen(false);
      setQuery('');
    }
  };
  const handleClick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); refresh(); };
  const handleSettingsClick = (e: React.MouseEvent) => { e.stopPropagation(); navigate('/app/settings/weather'); };
  const handleLocationSelect = (result: Parameters<typeof onSelect>[0]) => {
    onSelect(result);
    setIsDropdownOpen(false);
  };

  if (loading) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground border-t-foreground animate-spin" />
      <span className="text-xs text-muted-foreground">Loading...</span>
    </div>
  );

  if (error) return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-destructive/30 shadow-sm hover:border-destructive/50 transition-all duration-200 cursor-pointer">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="text-xs text-destructive">{t('weather.retry')}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{error}. {t('weather.clickToRetry')}</TooltipContent>
    </Tooltip>
  );

  if (currentWeather) {
    const temps = getTemperatureBoth(currentWeather.temperature);
    const uvLevel = currentWeather.uv_index == null ? null : getUvLevel(currentWeather.uv_index);

    return (
      <section className="relative" ref={dropdownRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} aria-label="Weather information">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={handleClick} aria-label="Weather information - click to refresh" className={cn('relative flex items-center gap-2.5 px-3 py-1.5 rounded-md', 'bg-card', 'border border-border shadow-sm', 'hover:bg-muted hover:shadow-md', 'transition-all duration-300 ease-out cursor-pointer', 'overflow-hidden')}>
                <div className="relative z-10">{getWeatherIcon(currentWeather.weather_code, 'w-5 h-5')}</div>
                <span className="relative z-10 text-base font-semibold text-foreground tracking-tight">{formatTemperature(currentWeather.temperature)}</span>
                <div className="hidden sm:block w-px h-4 bg-border" />
                <div className="hidden sm:flex items-center gap-1 relative z-10"><MapPin className="w-3 h-3 text-muted-foreground" /><span className="text-xs text-muted-foreground max-w-[80px] truncate">{location.name}</span></div>
              </button>
            </TooltipTrigger>
            <TooltipContent>{t('weather.clickToRefresh')}</TooltipContent>
          </Tooltip>
          {showSettingsIcon && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" onClick={handleSettingsClick} className={cn('p-1.5 rounded-md', 'bg-card border border-border', 'text-muted-foreground hover:text-foreground', 'hover:bg-muted', 'transition-all duration-200', 'cursor-pointer')} aria-label="Weather settings">
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Weather settings</TooltipContent>
            </Tooltip>
          )}
        </div>

        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-md shadow-xl p-4 min-w-[220px] z-50">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              {getWeatherIcon(currentWeather.weather_code, 'w-7 h-7')}
              <div><p className="text-sm font-medium text-foreground">{currentWeather.description}</p><p className="text-xs text-muted-foreground">{location.name}</p></div>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-3">
              <DetailRow icon={<Thermometer className="w-4 h-4 text-orange-500" />} label={t('weather.temperature')} value={`${temps.celsius}°C / ${temps.fahrenheit}°F`} tooltip={<p className="text-xs">{t('weather.temperatureTooltip')}</p>} />
              <DetailRow icon={<Wind className="w-4 h-4 text-cyan-500" />} label={t('weather.windSpeed')} value={`${currentWeather.wind_speed ?? '--'} km/h`} tooltip={<p className="text-xs">{currentWeather.wind_speed ?? '--'} km/h ({Math.round((currentWeather.wind_speed ?? 0) * 0.621)} mph)</p>} />
              <DetailRow icon={<Droplets className="w-4 h-4 text-sky-500" />} label={t('weather.humidity')} value={`${currentWeather.humidity ?? '--'}%`} tooltip={<p className="text-xs">{t('weather.humidityTooltip')}</p>} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
                    <div className="flex items-center gap-2"><SunDim className={cn('w-4 h-4', uvLevel == null ? 'text-gray-400 dark:text-gray-300' : uvLevel.color)} /><span className="text-sm text-muted-foreground">{t('weather.uvIndex')}</span></div>
                    {uvLevel == null ? <span className="text-sm text-muted-foreground">--</span> : <div className="flex items-center gap-2"><span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', uvLevel.bgColor, uvLevel.color)}>{uvLevel.label}</span><span className="text-sm font-medium text-foreground">{Math.round(currentWeather.uv_index ?? 0)}</span></div>}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-gray-900 text-white border-gray-700 shadow-lg"><p className="text-xs">{currentWeather.uv_index == null ? 'UV data not available (nighttime)' : uvLevel?.description}</p></TooltipContent>
              </Tooltip>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input ref={searchInputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setIsDropdownOpen(true)} placeholder={t('weather.searchLocation')} className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-md bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring" />
                {selecting && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
              </div>
              {results.length > 0 && <div className="mt-2 max-h-[150px] overflow-y-auto">{results.map((result, index) => (
                <button key={`${result.id}-${index}`} onClick={() => handleLocationSelect(result)} className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-muted rounded-md transition-colors">
                  <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" /><p className="flex-1 text-xs font-medium text-foreground truncate">{result.name}</p>
                </button>
              ))}</div>}
            </div>

            <div className="w-full mt-3 pt-3 border-t border-border text-xs text-muted-foreground text-center space-y-1">
              <p>{t('weather.clickToRefresh')}</p>
              <p>{t('weather.dataBy')}{' '}<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">Open-Meteo.com</a></p>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border shadow-sm hover:bg-muted transition-all duration-200 cursor-pointer">
          <Cloud className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t('weather.loadWeather')}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{t('weather.clickToLoad', { location: location.name })}</TooltipContent>
    </Tooltip>
  );
};

export default WeatherDropdown;
