import { useState, useCallback } from 'react';
import { LatLng, calculatePolygonArea, getPolygonCenter } from '../utils/geoUtils';

export interface PolygonState {
  points: LatLng[];
  area: {
    acres: number;
    hectares: number;
    squareMeters: number;
  };
  center: LatLng;
  isComplete: boolean; // true when polygon has 4 points
}

export function usePolygonArea() {
  const [points, setPoints] = useState<LatLng[]>([]);

  const addPoint = useCallback((point: LatLng) => {
    setPoints(prev => [...prev, point]);
  }, []);

  const removeLastPoint = useCallback(() => {
    setPoints(prev => prev.slice(0, -1));
  }, []);

  const resetPolygon = useCallback(() => {
    setPoints([]);
  }, []);

  const area = calculatePolygonArea(points);
  const center = getPolygonCenter(points);

  return {
    points,
    area,
    center,
    isComplete: points.length >= 4,
    addPoint,
    removeLastPoint,
    resetPolygon,
  };
}