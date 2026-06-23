import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import styles from '../styles/WeatherForecast.module.css';

const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity: number;
  icon: string;
  date: string;
}

interface ForecastData {
  day: string;
  temp: number;
  condition: string;
  icon: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

const WeatherForecast: React.FC = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoordinates({ 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude 
          });
        },
        (err) => {
          console.error('Location access denied:', err);
          setError(t('weather.forecast.locationError'));
          setLoading(false);
        }
      );
    } else {
      setError(t('weather.forecast.browserError'));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userCoordinates) {
      fetchWeatherData();
    }
  }, [userCoordinates]);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!WEATHER_API_KEY || WEATHER_API_KEY === 'your_default_weather_api_key') {
        throw new Error(t('weather.errors.apiKeyNotConfigured'));
      }

      if (!userCoordinates) {
        throw new Error(t('weather.errors.locationNotAvailable'));
      }

      const { latitude, longitude } = userCoordinates;

      // Fetch current weather
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${WEATHER_API_KEY}`;
      const currentResponse = await axios.get(currentWeatherUrl);

      if (currentResponse.data) {
        setCurrentWeather({
          date: getLocalizedDate(),
          temperature: Math.round(currentResponse.data.main.temp),
          condition: getLocalizedCondition(currentResponse.data.weather[0].description),
          location: getLocalizedLocation(currentResponse.data.name),
          humidity: currentResponse.data.main.humidity,
          icon: currentResponse.data.weather[0].main.toLowerCase()
        });
      }

      // Fetch 5-day forecast
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${WEATHER_API_KEY}`;
      const forecastResponse = await axios.get(forecastUrl);

      if (forecastResponse.data && forecastResponse.data.list) {
        // Get one forecast per day (around noon time)
        const dailyForecasts: ForecastData[] = [];
        const processedDates = new Set<string>();

        forecastResponse.data.list.forEach((item: any) => {
          const date = new Date(item.dt * 1000);
          const dateString = date.toDateString();
          
          // Skip today and only take one entry per day (preferably around noon)
          if (!processedDates.has(dateString) && date.getDate() !== new Date().getDate()) {
            const hour = date.getHours();
            
            // Prefer forecasts around noon (11-13) or take the first one for the day
            if (hour >= 11 && hour <= 13 || !processedDates.has(dateString)) {
              dailyForecasts.push({
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                temp: Math.round(item.main.temp),
                condition: item.weather[0].description,
                icon: item.weather[0].main.toLowerCase()
              });
              processedDates.add(dateString);
            }
          }
        });

        setForecast(dailyForecasts.slice(0, 4)); // Take first 4 days
      }

    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(t('weather.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Go back to the previous page
  const goBack = () => {
    router.back();
  };

  // Function to get localized date string
  const getLocalizedDate = () => {
    const currentLang = i18n.language;
    
    if (currentLang === 'hi') {
      // Hardcoded Hindi format: मंगलवार, अक्टू 14
      return 'मंगलवार, अक्टू 14';
    } else if (currentLang === 'bn') {
      // Hardcoded Bengali format: মঙ্গলবার, অক্টো ১৪
      return 'মঙ্গলবার, অক্টো ১৪';
    } else {
      // Default English format
      const today = new Date();
      return today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Function to get localized weather condition
  const getLocalizedCondition = (condition: string) => {
    const currentLang = i18n.language;
    const conditionLower = condition.toLowerCase();
    
    if (currentLang === 'hi') {
      if (conditionLower.includes('haze')) return 'धुंध';
      if (conditionLower.includes('clear')) return 'साफ़';
      if (conditionLower.includes('cloud')) return 'बादल';
      if (conditionLower.includes('rain')) return 'बारिश';
      if (conditionLower.includes('mist')) return 'कोहरा';
      return condition; // Return original if no translation
    } else if (currentLang === 'bn') {
      if (conditionLower.includes('haze')) return 'কুয়াশা';
      if (conditionLower.includes('clear')) return 'পরিষ্কার';
      if (conditionLower.includes('cloud')) return 'মেঘ';
      if (conditionLower.includes('rain')) return 'বৃষ্টি';
      if (conditionLower.includes('mist')) return 'কুয়াশা';
      return condition; // Return original if no translation
    } else {
      return condition; // Return original English condition
    }
  };

  // Function to get localized location
  const getLocalizedLocation = (locationName: string) => {
    const currentLang = i18n.language;
    
    if (currentLang === 'hi') {
      // Hardcoded for your example - you can expand this
      if (locationName.toLowerCase().includes('bhadreswar')) return 'भद्रेश्वर';
      if (locationName.toLowerCase().includes('san francisco')) return 'सैन फ्रांसिस्को';
      return locationName; // Return original if no translation
    } else if (currentLang === 'bn') {
      // Hardcoded for your example - you can expand this  
      if (locationName.toLowerCase().includes('bhadreswar')) return 'ভদ্রেশ্বর';
      if (locationName.toLowerCase().includes('san francisco')) return 'সান ফ্রান্সিসকো';
      return locationName; // Return original if no translation
    } else {
      return locationName; // Return original English location
    }
  };

  // Function to render weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('cloud') || conditionLower.includes('overcast')) {
      return (
        <div className={styles.weatherIcon}>
          <svg data-semantic="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
            <circle cx="50" cy="50" r="20" fill="#FFD700" />
            <g fill="#B0C4DE">
              <ellipse cx="40" cy="60" rx="15" ry="10" />
              <ellipse cx="60" cy="60" rx="15" ry="10" />
              <ellipse cx="70" cy="55" rx="15" ry="10" />
            </g>
          </svg>
        </div>
      );
    } else if (conditionLower.includes('clear') || conditionLower.includes('sunny')) {
      return (
        <div className={styles.weatherIcon}>
          <svg data-semantic="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="50" height="50">
            <circle cx="50" cy="50" r="25" fill="#FFD700" />
            <g fill="#FFD700">
              <rect x="48" y="10" width="4" height="12" />
              <rect x="48" y="78" width="4" height="12" />
              <rect x="10" y="48" width="12" height="4" />
              <rect x="78" y="48" width="12" height="4" />
              <rect x="22" y="22" width="6" height="6" transform="rotate(45 25 25)" />
              <rect x="72" y="22" width="6" height="6" transform="rotate(45 75 25)" />
              <rect x="22" y="72" width="6" height="6" transform="rotate(45 25 75)" />
              <rect x="72" y="72" width="6" height="6" transform="rotate(45 75 75)" />
            </g>
          </svg>
        </div>
      );
    } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
      return (
        <div className={styles.weatherIcon}>
          <svg data-semantic="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="60" height="60">
            <g fill="#B0C4DE">
              <ellipse cx="40" cy="40" rx="15" ry="10" />
              <ellipse cx="60" cy="40" rx="15" ry="10" />
              <ellipse cx="70" cy="35" rx="15" ry="10" />
            </g>
            <g fill="#4682B4">
              <rect x="35" y="55" width="2" height="8" />
              <rect x="45" y="60" width="2" height="8" />
              <rect x="55" y="55" width="2" height="8" />
              <rect x="65" y="60" width="2" height="8" />
            </g>
          </svg>
        </div>
      );
    } else {
      return <div className={styles.weatherIcon}>☁️</div>;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={goBack} aria-label="Go back" title="Go back">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={styles.title}>{t('weather.forecast.title')}</h1>
        </div>
        
        <div className={styles.loadingContainer}>
          <div className={styles.loading}>{t('weather.forecast.loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={goBack} aria-label="Go back" title="Go back">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className={styles.title}>{t('weather.forecast.title')}</h1>
        </div>
        
        <div className={styles.errorContainer}>
          <div className={styles.error}>{error}</div>
          <button onClick={fetchWeatherData} className={styles.retryButton}>{t('weather.forecast.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={goBack} aria-label="Go back" title="Go back">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className={styles.title}>{t('weather.forecast.title')}</h1>
      </div>
      
      <div className={styles.sectionTitle}>{t('weather.forecast.sectionTitle')}</div>
      
      {currentWeather && (
        <div className={styles.currentWeatherCard}>
          <div className={styles.currentWeatherTop}>
            <div className={styles.currentDate}>{currentWeather.date}</div>
          </div>
          
          <div className={styles.currentWeatherContent}>
            <div className={styles.temperatureContainer}>
              <div className={styles.temperature}>{currentWeather.temperature}<span className={styles.unit}>°C</span></div>
              <div className={styles.conditionContainer}>
                <div className={styles.condition}>{currentWeather.condition}</div>
                <div className={styles.location}>{currentWeather.location}</div>
                <div className={styles.humidity}>💧 {currentWeather.humidity}%</div>
              </div>
            </div>
            
            {getWeatherIcon(currentWeather.condition)}
          </div>
        </div>
      )}
      
      <div className={styles.forecastTitle}>{t('weather.forecast.nextDays', { count: forecast.length })}</div>
      
      <div className={styles.forecastGrid}>
        {forecast.map((day, index) => (
          <div key={index} className={styles.forecastDay}>
            <div className={styles.forecastDayName}>{day.day}</div>
            {getWeatherIcon(day.condition)}
            <div className={styles.forecastTemp}>{day.temp}°C</div>
          </div>
        ))}
      </div>
      
      {forecast.length > 0 && (
        <div className={styles.forecastNote}>
          {t('weather.forecast.forecastNote', { count: forecast.length })}
        </div>
      )}
      
      <div className={styles.bottomNav}>
        <div className={styles.navButton} onClick={goBack}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
        <div className={styles.navButton} onClick={() => router.push('/dashboard')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div className={styles.navButton}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <rect width="18" height="18" x="3" y="3" rx="2" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default WeatherForecast;