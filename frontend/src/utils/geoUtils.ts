// Utility functions for polygon/geo calculations
import * as turf from '@turf/turf';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculate area of a polygon in both acres and hectares
 * using the Turf.js library (works offline, no API needed)
 */
export function calculatePolygonArea(points: LatLng[]): {
  acres: number;
  hectares: number;
  squareMeters: number;
} {
  if (points.length < 3) {
    return { acres: 0, hectares: 0, squareMeters: 0 };
  }

  // Turf needs the polygon closed (first point = last point)
  const coordinates = [
    ...points.map(p => [p.lng, p.lat]),
    [points[0].lng, points[0].lat], // close the ring
  ];

  const polygon = turf.polygon([coordinates]);
  const areaInSquareMeters = turf.area(polygon);

  return {
    squareMeters: Math.round(areaInSquareMeters),
    hectares: parseFloat((areaInSquareMeters / 10000).toFixed(4)),
    acres: parseFloat((areaInSquareMeters / 4046.86).toFixed(4)),
  };
}

/**
 * Calculate the center point of a polygon
 * (used to auto-center the map on the drawn field)
 */
export function getPolygonCenter(points: LatLng[]): LatLng {
  if (points.length === 0) return { lat: 20.5937, lng: 78.9629 }; // India center default

  const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
  return { lat, lng };
}

/**
 * Search for a village/location using Nominatim (OpenStreetMap, free)
 * Returns an array of search results with coordinates
 */
export async function searchLocation(query: string): Promise<
  Array<{
    displayName: string;
    lat: number;
    lng: number;
    type: string;
  }>
> {
  // Add "India" to bias results for Indian farmers
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=5&addressdetails=1`,
    {
      headers: {
        // Nominatim requires a User-Agent
        'Accept-Language': 'en',
      },
    }
  );

  if (!response.ok) throw new Error('Location search failed');

  const data = await response.json();

  return data.map((item: any) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    type: item.type,
  }));
}