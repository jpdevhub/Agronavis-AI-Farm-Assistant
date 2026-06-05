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
  const [iconPath, setIconPath] = useState('/weather-icons/clear-day.svg');
  const iconMap: Record<string, string> = {
    // Clear
    '01d': '/weather-icons/clear-day.svg',
    '01n': '/weather-icons/clear-night.svg',

    // Few clouds
    '02d': '/weather-icons/partly-cloudy-day.svg',
    '02n': '/weather-icons/partly-cloudy-night.svg',

    // Scattered clouds
    '03d': '/weather-icons/cloudy.svg',
    '03n': '/weather-icons/cloudy.svg',

    // Broken clouds
    '04d': '/weather-icons/overcast.svg',
    '04n': '/weather-icons/overcast.svg',

    // Shower rain
    '09d': '/weather-icons/drizzle.svg',
    '09n': '/weather-icons/drizzle.svg',

    // Rain
    '10d': '/weather-icons/rain.svg',
    '10n': '/weather-icons/rain.svg',

    // Thunderstorm
    '11d': '/weather-icons/thunderstorms-rain.svg',
    '11n': '/weather-icons/thunderstorms-rain.svg',

    // Snow
    '13d': '/weather-icons/snow.svg',
    '13n': '/weather-icons/snow.svg',

    // Mist / Fog
    '50d': '/weather-icons/cloudy.svg',
    '50n': '/weather-icons/cloudy.svg',
  };
  useEffect(() => {
    if (!WEATHER_API_KEY) return;

    async function fetchWeather() {
      try {
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}`
        );
        const iconCode = response.data?.weather?.[0]?.icon;
        setIconPath(
        iconMap[iconCode] || '/weather-icons/clear-day.svg'
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
        src={iconPath}
        alt="Weather"
        width={36}
        height={36}
      />
    </div>
  );
}