import React from 'react';
import type { Coordinates } from '../types/weatherForecast';
import { useFertilizerWeatherAdvisory } from '../hooks/useFertilizerWeatherAdvisory';
import styles from '../styles/FertilizerWeatherAdvisory.module.css';

const IconAlertTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

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
        <div className={styles.messageRow}>
          <span className={styles.icon} aria-hidden="true">
            <IconAlertTriangle />
          </span>
          <div>
            <span className={styles.warningTitle}>
              Heavy rainfall is expected within the next 48 hours.
            </span>
            Applying fertilizer now is not recommended because nutrients may be
            washed away, reducing effectiveness and increasing environmental
            impact.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.advisory} ${styles.suitable}`} role="status">
      <div className={styles.messageRow}>
        <span className={styles.icon} aria-hidden="true">
          <IconCheckCircle />
        </span>
        <span>Weather conditions appear suitable for fertilizer application.</span>
      </div>
    </div>
  );
}
