import { useState, useCallback } from 'react';

interface GeocodingResult {
  state: string;
  district: string;
  village?: string;
  displayName: string;
}

interface UseReverseGeocodeReturn {
  geocode: (lat: number, lng: number) => Promise<GeocodingResult | null>;
  result: GeocodingResult | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for reverse geocoding coordinates to state/district
 * using the free OpenStreetMap Nominatim API.
 * 
 * Usage:
 *   const { geocode, result, loading, error } = useReverseGeocode();
 *   const data = await geocode(lat, lng);
 */
export function useReverseGeocode(): UseReverseGeocodeReturn {
  const [result, setResult] = useState<GeocodingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocode = useCallback(async (lat: number, lng: number): Promise<GeocodingResult | null> => {
    setLoading(true);
    setError(null);

    try {
      // Nominatim requires a User-Agent header
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=10`,
        {
          headers: {
            'User-Agent': 'AgroNavis/1.0 (farm-assistant-app)',
            'Accept-Language': 'en'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.address) {
        throw new Error('No address found for these coordinates');
      }

      const address = data.address;

      // Nominatim returns district in various fields depending on the country/region
      // For India: state_district is the district, state is the state
      const state = address.state || address.region || '';
      const district = 
        address.state_district ||  // India primary
        address.county ||          // Fallback
        address.city_district ||   // Urban areas
        address.city ||            // City fallback
        '';
      const village = address.village || address.town || address.suburb || '';

      const geocoded: GeocodingResult = {
        state: state.toUpperCase(),
        district: district.toUpperCase(),
        village,
        displayName: data.display_name || `${district}, ${state}`
      };

      setResult(geocoded);
      return geocoded;
    } catch (err: any) {
      const message = err.message || 'Failed to determine location';
      setError(message);
      console.error('Reverse geocoding error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { geocode, result, loading, error };
}
