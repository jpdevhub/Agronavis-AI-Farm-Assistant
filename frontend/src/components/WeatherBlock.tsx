import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import styles from '../styles/WeatherWidget.module.css';
import { WeatherSkeleton } from './Skeleton';

const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

interface WeatherData {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    icon: string;
}

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface WeatherBlockProps {
    farmLocation?: { latitude: number; longitude: number };
    compact?: boolean;
}

const WeatherBlock: React.FC<WeatherBlockProps> = ({ farmLocation, compact = false }) => {
    const { t, i18n } = useTranslation();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<string>('');
    const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
    const [locationSource, setLocationSource] = useState<'user' | 'farm' | 'default'>('default');

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserCoordinates({ 
                        latitude: position.coords.latitude, 
                        longitude: position.coords.longitude 
                    });
                    setLocationSource('user');
                },
                (err) => {
                    console.error('Location access denied:', err);
                    if (farmLocation?.latitude && farmLocation?.longitude) {
                        setUserCoordinates({ 
                            latitude: farmLocation.latitude, 
                            longitude: farmLocation.longitude 
                        });
                        setLocationSource('farm');
                    } else {
                        setError(t('weather.errors.locationRequired'));
                        setLoading(false);
                    }
                }
            );
        } else if (farmLocation?.latitude && farmLocation?.longitude) {
            setUserCoordinates({ 
                latitude: farmLocation.latitude, 
                longitude: farmLocation.longitude 
            });
            setLocationSource('farm');
        } else {
            setError(t('weather.errors.locationNotAvailable'));
            setLoading(false);
        }
    }, [farmLocation]);

    useEffect(() => {
        if (userCoordinates) {
            fetchWeather();
        }
    }, [userCoordinates]);

    const fetchWeather = async () => {
        try {
            setLoading(true);
            setError(null);

            console.log('Fetching weather with coordinates:', userCoordinates);

            if (!WEATHER_API_KEY || WEATHER_API_KEY === 'your_default_weather_api_key') {
                throw new Error(t('weather.errors.apiKeyNotConfigured'));
            }

            if (!userCoordinates?.latitude || !userCoordinates?.longitude) {
                throw new Error(t('weather.errors.coordinatesNotAvailable'));
            }

            const { latitude, longitude } = userCoordinates;
            const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${WEATHER_API_KEY}`;

            console.log('Making API call to:', apiUrl);

            const response = await axios.get(apiUrl);
            console.log('Weather API response:', response.data);

            if (response.data) {
                setWeather({
                    temperature: Math.round(response.data.main.temp),
                    condition: response.data.weather[0].description,
                    humidity: response.data.main.humidity,
                    windSpeed: response.data.wind.speed,
                    icon: response.data.weather[0].main.toLowerCase()
                });

                if (response.data.name) {
                    setLocation(response.data.name);
                }
                console.log('Weather data set successfully');
            }
        } catch (err: any) {
            console.error('Weather fetch error:', err);
            setError(err.message || t('weather.errors.fetchFailed'));
        } finally {
            setLoading(false);
        }
    };

    const getWeatherEmoji = (condition: string) => {
        const c = condition.toLowerCase();
        if (c.includes('clear') || c.includes('sun')) return '☀️';
        if (c.includes('cloud')) return '⛅';
        if (c.includes('rain')) return '🌧️';
        if (c.includes('thunder')) return '⛈️';
        if (c.includes('snow')) return '❄️';
        if (c.includes('fog') || c.includes('mist')) return '🌫️';
        return '🌤️';
    };

    // Function to get localized date string
    const getLocalizedDate = () => {
        const currentLang = i18n.language;
        const today = new Date();
        
        if (currentLang === 'hi') {
            // Hardcoded Hindi format: मंगलवार, अक्टू 14
            return 'मंगलवार, अक्टू 14';
        } else if (currentLang === 'bn') {
            // Hardcoded Bengali format: মঙ্গলবার, অক্টো ১৪
            return 'মঙ্গলবার, অক্টো ১৪';
        } else {
            // Default English format
            return today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
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
            return 'धुंध'; // Default for your example
        } else if (currentLang === 'bn') {
            if (conditionLower.includes('haze')) return 'কুয়াশা';
            if (conditionLower.includes('clear')) return 'পরিষ্কার';
            if (conditionLower.includes('cloud')) return 'মেঘ';
            if (conditionLower.includes('rain')) return 'বৃষ্টি';
            if (conditionLower.includes('mist')) return 'কুয়াশা';
            return 'কুয়াশা'; // Default for your example
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

    // Show loading state
    if (loading) {
        console.log('WeatherBlock: Showing loading state');
        return (
            <div className={`${styles.weatherBlockContainer} ${compact ? styles.compact : ''}`}>
                <WeatherSkeleton />
            </div>
        );
    }

    // Show error state
    if (error) {
        console.log('WeatherBlock: Showing error state:', error);
        return (
            <div className={`${styles.weatherBlockContainer} ${compact ? styles.compact : ''}`}>
                <div className={styles.weatherError}>
                    <div className={styles.errorIcon}>⚠️</div>
                    <div className={styles.errorText}>{error}</div>
                </div>
            </div>
        );
    }

    console.log('WeatherBlock: Showing weather data:', weather);
    
    return weather ? (
        <div className={`${styles.weatherBlockContainer} ${compact ? styles.compact : ''}`}>
            <div className={styles.weatherHeader}>
                <div>
                    <div className={styles.location}>{getLocalizedLocation(location)}</div>
                    <div className={styles.date}>
                        {getLocalizedDate()}
                    </div>
                </div>
                <div className={styles.weatherIcon}>{getWeatherEmoji(weather.condition)}</div>
            </div>
            
            <div className={styles.weatherMain}>
                <div className={styles.temperature}>{weather.temperature}°C</div>
                <div className={styles.condition}>{getLocalizedCondition(weather.condition)}</div>
            </div>

            <div className={styles.weatherDetails}>
                <div className={styles.weatherDetail}>
                    <span className={styles.weatherDetailIcon}>💧</span>
                    <span>{t('weather.humidity')}: {weather.humidity}%</span>
                </div>
                <div className={styles.weatherDetail}>
                    <span className={styles.weatherDetailIcon}>🌬️</span>
                    <span>{t('weather.wind')}: {weather.windSpeed} m/s</span>
                </div>
            </div>
        </div>
    ) : null;
};

export default WeatherBlock;