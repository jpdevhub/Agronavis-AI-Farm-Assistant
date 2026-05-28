'use client'; // if you are using Next.js App Router

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePolygonArea } from '../../hooks/usePolygonArea';
import SearchBox from './SearchBox';
import type { LatLng } from '../../utils/geoUtils';

// Leaflet must be loaded client-side only (it accesses window)
// So we lazy-load the inner map component
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '480px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f0fdf4', borderRadius: '12px',
      color: '#16a34a', fontSize: '14px'
    }}>
      Loading map...
    </div>
  ),
});

interface PolygonMapperProps {
  onPolygonComplete: (data: {
    coordinates: LatLng[];
    areaAcres: number;
    areaHectares: number;
    centerLat: number;
    centerLng: number;
  }) => void;
  initialCenter?: LatLng;
  showInstructions?: boolean;
}

export default function PolygonMapper({ onPolygonComplete, initialCenter, showInstructions = true }: PolygonMapperProps) {
  const { points, area, center, isComplete, addPoint, removeLastPoint, resetPolygon } = usePolygonArea();
  const [mapCenter, setMapCenter] = useState<LatLng>(initialCenter || { lat: 22.5726, lng: 88.3639 });
  const [mapZoom, setMapZoom] = useState(13);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!initialCenter && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setMapZoom(15);
          setLocationLoading(false);
        },
        () => {
          setLocationLoading(false);
        }
      );
    } else if (initialCenter) {
      setMapCenter(initialCenter);
      setMapZoom(16);
    }
  }, [initialCenter]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setMapCenter({ lat, lng });
    setMapZoom(15);
  };

  const handleConfirm = () => {
    if (!isComplete) return;
    onPolygonComplete({
      coordinates: points,
      areaAcres: area.acres,
      areaHectares: area.hectares,
      centerLat: center.lat,
      centerLng: center.lng,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          Draw your field boundary
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Click 4 corners to mark your field boundary.
        </p>
      </div>

      {/* Search bar (floats above the map visually) */}
      <SearchBox onLocationSelect={handleLocationSelect} />

      {/* Map */}
      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border-tertiary)' }}>
        <MapInner
          center={mapCenter}
          zoom={mapZoom}
          points={points}
          onMapClick={addPoint}
        />

        {/* Instructions overlay (top-left of map) */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '8px', padding: '8px 12px',
          fontSize: '12px', color: '#374151',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          zIndex: 900, maxWidth: '180px', lineHeight: '1.6'
        }}>
          <strong>How to use:</strong><br/>
          1. Search your village<br/>
          2. Click corners of your field<br/>
          3. Drop 3+ pins to form a polygon
        </div>
      </div>

      {/* Live stats bar */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
        background: isComplete ? '#f0fdf4' : '#f9fafb',
        border: `1px solid ${isComplete ? '#86efac' : '#e5e7eb'}`,
        borderRadius: '10px', padding: '12px 16px',
        transition: 'all 0.3s ease'
      }}>
        {/* Pin count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            background: '#16a34a', color: 'white',
            borderRadius: '50%', width: '20px', height: '20px',
            fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600
          }}>{points.length}</span>
          <span style={{ fontSize: '13px', color: '#374151' }}>
            {points.length === 1 ? 'pin dropped' : 'pins dropped'}
          </span>
        </div>

        {/* Area display */}
        {isComplete && (
          <>
            <div style={{ width: '1px', height: '24px', background: '#d1d5db' }}/>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#15803d' }}>
                {area.acres}
              </span>
              <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '4px' }}>acres</span>
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#0f766e' }}>
                {area.hectares}
              </span>
              <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '4px' }}>hectares</span>
            </div>
            <div>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                ({area.squareMeters.toLocaleString()} m²)
              </span>
            </div>
          </>
        )}

        {!isComplete && points.length > 0 && (
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            Drop {4 - points.length} more {4 - points.length === 1 ? 'pin' : 'pins'} to complete boundary
          </span>
        )}

        {points.length === 0 && (
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            Click on the map to start marking your field
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }}/>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {points.length > 0 && (
            <button
              onClick={removeLastPoint}
              style={{
                padding: '6px 12px', border: '1px solid #d1d5db',
                borderRadius: '6px', background: 'white',
                fontSize: '12px', cursor: 'pointer', color: '#374151'
              }}
            >
              Undo last pin
            </button>
          )}
          {points.length > 0 && (
            <button
              onClick={resetPolygon}
              style={{
                padding: '6px 12px', border: '1px solid #fca5a5',
                borderRadius: '6px', background: '#fef2f2',
                fontSize: '12px', cursor: 'pointer', color: '#dc2626'
              }}
            >
              Reset
            </button>
          )}
          {isComplete && (
            <button
              onClick={handleConfirm}
              style={{
                padding: '6px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#16a34a',
                fontSize: '13px',
                cursor: 'pointer',
                color: 'white',
                fontWeight: 500
              }}
            >
              Confirm field boundary →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}