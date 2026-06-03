import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

interface WeatherStatusBadgeProps {
  lat: number;
  lng: number;
}

export default function WeatherStatusBadge({
  lat,
  lng,
}: WeatherStatusBadgeProps) {
  const [iconUrl, setIconUrl] = useState('');

  useEffect(() => {
    if (!WEATHER_API_KEY) return;

    async function fetchWeather() {
      try {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}`
        );

        const iconCode = response.data?.weather?.[0]?.icon;
        setIconUrl(
        `https://openweathermap.org/img/wn/${iconCode}@2x.png`
        );
      } catch (error) {
        console.error('Weather badge error:', error);
      }
    }

    fetchWeather();
  }, [lat, lng]);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '10px',
        padding: '8px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img
        src={iconUrl}
        alt="Current Weather"
        width={32}
        height={32}
        />
    </div>
  );
}