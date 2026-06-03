import type {
  Coordinates,
  FertilizerWeatherAnalysis,
  OpenWeatherForecastItem,
  OpenWeatherForecastResponse,
} from '../types/weatherForecast';

const FORECAST_API_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const FORECAST_HOURS = 48;
const HEAVY_RAIN_MM_THRESHOLD = 20;
const CACHE_TTL_MS = 10 * 60 * 1000;

const HEAVY_RAIN_CONDITION_IDS = new Set([502, 503, 504, 522, 531]);

const forecastCache = new Map<
  string,
  { expiresAt: number; analysis: FertilizerWeatherAnalysis }
>();

function getWeatherApiKey(): string {
  const key = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  if (!key || key === 'your_default_weather_api_key') {
    throw new Error('Weather API key is not configured.');
  }
  return key;
}

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export function getRainfallMm(item: OpenWeatherForecastItem): number {
  const rainfall = item.rain?.['3h'];
  return typeof rainfall === 'number' ? rainfall : 0;
}

export function isHeavyRainPeriod(item: OpenWeatherForecastItem): boolean {
  return item.weather.some((condition) => {
    if (HEAVY_RAIN_CONDITION_IDS.has(condition.id)) {
      return true;
    }
    return condition.description.toLowerCase().includes('heavy');
  });
}

export function analyze48HourForecast(
  list: OpenWeatherForecastItem[],
  nowSec = Math.floor(Date.now() / 1000)
): FertilizerWeatherAnalysis {
  const endSec = nowSec + FORECAST_HOURS * 3600;
  const periods = list.filter(
    (item) => item.dt >= nowSec && item.dt <= endSec
  );

  let totalRainfallMm = 0;
  let hasHeavyRainPeriod = false;

  for (const item of periods) {
    totalRainfallMm += getRainfallMm(item);
    if (isHeavyRainPeriod(item)) {
      hasHeavyRainPeriod = true;
    }
  }

  return {
    totalRainfallMm: Math.round(totalRainfallMm * 10) / 10,
    heavyRainExpected:
      totalRainfallMm > HEAVY_RAIN_MM_THRESHOLD || hasHeavyRainPeriod,
    periodCount: periods.length,
  };
}

export async function fetch48HourRainfallAnalysis(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<FertilizerWeatherAnalysis> {
  const key = cacheKey(latitude, longitude);
  const cached = forecastCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.analysis;
  }

  const apiKey = getWeatherApiKey();
  const url = new URL(FORECAST_API_URL);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('units', 'metric');
  url.searchParams.set('appid', apiKey);

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error('Unable to retrieve weather forecast data.');
  }

  const data = (await response.json()) as OpenWeatherForecastResponse;

  if (!data.list?.length) {
    throw new Error('Weather forecast data is unavailable.');
  }

  const analysis = analyze48HourForecast(data.list);
  forecastCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    analysis,
  });

  return analysis;
}

export async function fetch48HourRainfallAnalysisForFarm(
  coordinates: Coordinates,
  signal?: AbortSignal
): Promise<FertilizerWeatherAnalysis> {
  return fetch48HourRainfallAnalysis(
    coordinates.latitude,
    coordinates.longitude,
    signal
  );
}
