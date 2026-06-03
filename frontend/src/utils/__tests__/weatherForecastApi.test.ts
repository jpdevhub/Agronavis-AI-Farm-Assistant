import {
  analyze48HourForecast,
  getRainfallMm,
  isHeavyRainPeriod,
} from '../weatherForecastApi';
import type { OpenWeatherForecastItem } from '../../types/weatherForecast';

function makeItem(
  dt: number,
  rain3h?: number,
  weather: OpenWeatherForecastItem['weather'] = [{ id: 500, main: 'Rain', description: 'light rain', icon: '10n' }]
): OpenWeatherForecastItem {
  return {
    dt,
    main: { temp: 20, humidity: 70 },
    weather,
    rain: rain3h !== undefined ? { '3h': rain3h } : undefined,
  };
}

describe('weatherForecastApi', () => {
  const nowSec = 1_700_000_000;

  describe('getRainfallMm', () => {
    it('returns 0 when rain data is missing', () => {
      expect(getRainfallMm(makeItem(nowSec))).toBe(0);
    });

    it('returns 3h rainfall when present', () => {
      expect(getRainfallMm(makeItem(nowSec, 4.5))).toBe(4.5);
    });
  });

  describe('isHeavyRainPeriod', () => {
    it('detects heavy rain condition ids', () => {
      expect(
        isHeavyRainPeriod(
          makeItem(nowSec, 1, [
            { id: 502, main: 'Rain', description: 'heavy intensity rain', icon: '10n' },
          ])
        )
      ).toBe(true);
    });

    it('detects heavy in description', () => {
      expect(
        isHeavyRainPeriod(
          makeItem(nowSec, 1, [
            { id: 501, main: 'Rain', description: 'heavy shower rain', icon: '10n' },
          ])
        )
      ).toBe(true);
    });

    it('returns false for light rain', () => {
      expect(isHeavyRainPeriod(makeItem(nowSec, 1))).toBe(false);
    });
  });

  describe('analyze48HourForecast', () => {
    it('flags heavy rain when total exceeds 20mm in 48 hours', () => {
      const list = [
        makeItem(nowSec + 3600, 8),
        makeItem(nowSec + 7200, 8),
        makeItem(nowSec + 10800, 8),
      ];
      const result = analyze48HourForecast(list, nowSec);
      expect(result.heavyRainExpected).toBe(true);
      expect(result.totalRainfallMm).toBe(24);
    });

    it('flags heavy rain when any period is heavy rain', () => {
      const list = [
        makeItem(nowSec + 3600, 2),
        makeItem(nowSec + 7200, 2, [
          { id: 503, main: 'Rain', description: 'very heavy rain', icon: '10n' },
        ]),
      ];
      const result = analyze48HourForecast(list, nowSec);
      expect(result.heavyRainExpected).toBe(true);
    });

    it('reports suitable conditions below threshold without heavy periods', () => {
      const list = [
        makeItem(nowSec + 3600, 3),
        makeItem(nowSec + 7200, 4),
      ];
      const result = analyze48HourForecast(list, nowSec);
      expect(result.heavyRainExpected).toBe(false);
      expect(result.totalRainfallMm).toBe(7);
    });

    it('ignores forecast periods outside the 48-hour window', () => {
      const list = [
        makeItem(nowSec + 3600, 30),
        makeItem(nowSec + 200_000, 30),
      ];
      const result = analyze48HourForecast(list, nowSec);
      expect(result.totalRainfallMm).toBe(30);
      expect(result.heavyRainExpected).toBe(true);
    });
  });
});
