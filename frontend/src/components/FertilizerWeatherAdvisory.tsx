import React from 'react';
import type { Coordinates } from '../types/weatherForecast';
import { useFertilizerWeatherAdvisory } from '../hooks/useFertilizerWeatherAdvisory';
import styles from '../styles/FertilizerWeatherAdvisory.module.css';

interface FertilizerWeatherAdvisoryProps {
  coordinates: Coordinates | null;
}

export function FertilizerWeatherAdvisory({
  coordinates,
}: FertilizerWeatherAdvisoryProps) {
  const { loading, error, heavyRainExpected } =
    useFertilizerWeatherAdvisory(coordinates);

  if (!coordinates) {
    return (
      <div className={`${styles.advisory} ${styles.unavailable}`}>
        Set your farm location to receive weather-based fertilizer guidance.
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${styles.advisory} ${styles.loading}`} role="status">
        <div className={styles.spinner} aria-hidden="true" />
        <span>Checking 48-hour rainfall forecast...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.advisory} ${styles.error}`} role="alert">
        Weather advisory unavailable: {error}
      </div>
    );
  }

  if (heavyRainExpected) {
    return (
      <div className={`${styles.advisory} ${styles.warning}`} role="alert">
        <span className={styles.warningTitle}>
          ⚠️ Heavy rainfall is expected within the next 48 hours.
        </span>
        Applying fertilizer now is not recommended because nutrients may be
        washed away, reducing effectiveness and increasing environmental
        impact.
      </div>
    );
  }

  return (
    <div className={`${styles.advisory} ${styles.suitable}`} role="status">
      ✅ Weather conditions appear suitable for fertilizer application.
    </div>
  );
}
