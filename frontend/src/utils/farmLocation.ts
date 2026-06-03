import type { Coordinates } from '../types/weatherForecast';

export interface FarmLocationInput {
  latitude?: number;
  longitude?: number;
  location?: {
    latitude?: number;
    longitude?: number;
    center_latitude?: number;
    center_longitude?: number;
  };
}

export function extractFarmCoordinates(
  farm: FarmLocationInput | null | undefined
): Coordinates | null {
  if (!farm) {
    return null;
  }

  const location = farm.location;
  const latitude =
    location?.center_latitude ?? location?.latitude ?? farm.latitude;
  const longitude =
    location?.center_longitude ?? location?.longitude ?? farm.longitude;

  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)
  ) {
    return { latitude, longitude };
  }

  return null;
}
