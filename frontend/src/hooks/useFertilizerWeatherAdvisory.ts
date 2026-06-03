import { useEffect, useRef, useState } from 'react';
import type { Coordinates } from '../types/weatherForecast';
import { fetch48HourRainfallAnalysis } from '../utils/weatherForecastApi';

interface FertilizerWeatherAdvisoryState {
  loading: boolean;
  error: string | null;
  heavyRainExpected: boolean | null;
  totalRainfallMm: number | null;
}

const initialState: FertilizerWeatherAdvisoryState = {
  loading: false,
  error: null,
  heavyRainExpected: null,
  totalRainfallMm: null,
};

export function useFertilizerWeatherAdvisory(
  coordinates: Coordinates | null
): FertilizerWeatherAdvisoryState {
  const [state, setState] = useState<FertilizerWeatherAdvisoryState>(initialState);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!coordinates) {
      setState(initialState);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const abortController = new AbortController();

    setState({
      loading: true,
      error: null,
      heavyRainExpected: null,
      totalRainfallMm: null,
    });

    fetch48HourRainfallAnalysis(
      coordinates.latitude,
      coordinates.longitude,
      abortController.signal
    )
      .then((analysis) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setState({
          loading: false,
          error: null,
          heavyRainExpected: analysis.heavyRainExpected,
          totalRainfallMm: analysis.totalRainfallMm,
        });
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load weather forecast.';
        setState({
          loading: false,
          error: message,
          heavyRainExpected: null,
          totalRainfallMm: null,
        });
      });

    return () => {
      abortController.abort();
    };
  }, [coordinates?.latitude, coordinates?.longitude]);

  return state;
}
