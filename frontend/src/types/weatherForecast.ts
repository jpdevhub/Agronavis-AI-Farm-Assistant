export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface OpenWeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface OpenWeatherForecastItem {
  dt: number;
  main: {
    temp: number;
    humidity: number;
  };
  weather: OpenWeatherCondition[];
  rain?: {
    '3h'?: number;
  };
  pop?: number;
}

export interface OpenWeatherForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: OpenWeatherForecastItem[];
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
  };
}

export interface FertilizerWeatherAnalysis {
  totalRainfallMm: number;
  heavyRainExpected: boolean;
  periodCount: number;
}
