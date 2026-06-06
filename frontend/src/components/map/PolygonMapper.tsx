'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePolygonArea } from '../../hooks/usePolygonArea';
import SearchBox from './SearchBox';
import type { LatLng } from '../../utils/geoUtils';
import WeatherStatusBadge from './WeatherStatusBadge';
// Leaflet must be loaded client-side only (it accesses window)
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

interface PolygonCompleteData {
  fieldName: string;
  coordinates: LatLng[];
  areaAcres: number;
  areaHectares: number;
  centerLat: number;
  centerLng: number;
}

interface PolygonMapperProps {
  onPolygonComplete: (data: PolygonCompleteData) => void;
  initialCenter?: LatLng;
}

export default function PolygonMapper({
  onPolygonComplete,
  initialCenter,
}: PolygonMapperProps) {
  const { points, area, center, isComplete, addPoint, removeLastPoint, resetPolygon } = usePolygonArea();
  const [mapCenter, setMapCenter] = useState<LatLng>(initialCenter || { lat: 22.5726, lng: 88.3639 });
  const [mapZoom, setMapZoom] = useState(13);
  const [fieldName, setFieldName] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    if (!initialCenter && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
          setMapZoom(15);
        },
        () => { /* geolocation denied — keep default centre */ }
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
    const trimmed = fieldName.trim();
    if (!trimmed) {
      setNameError('Give this field a name before saving.');
      return;
    }
    setNameError('');
    onPolygonComplete({
      fieldName: trimmed,
      coordinates: points,
      areaAcres: area.acres,
      areaHectares: area.hectares,
      centerLat: center.lat,
      centerLng: center.lng,
    });
    // Reset for the next field
    resetPolygon();
    setFieldName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
          Draw a field boundary
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          Name the field, then click 4 corners on the map to draw its boundary.
        </p>
      </div>

      {/* Field name input */}
      <div>
        <label
          htmlFor="field-name-input"
          style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}
        >
          Field Name
        </label>
        <input
          id="field-name-input"
          type="text"
          value={fieldName}
          onChange={e => { setFieldName(e.target.value); if (nameError) setNameError(''); }}
          placeholder="e.g. Wheat Field, North Paddy, Block A"
          maxLength={60}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: `1.5px solid ${nameError ? '#fca5a5' : 'var(--color-border)'}`,
            borderRadius: '10px',
            fontSize: '14px',
            color: 'var(--color-text-primary)',
            background: 'white',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#10b981'; }}
          onBlur={e => { e.currentTarget.style.borderColor = nameError ? '#fca5a5' : 'var(--color-border)'; }}
        />
        {nameError && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#dc2626' }}>{nameError}</p>
        )}
      </div>

      {/* Search bar */}
      <SearchBox onLocationSelect={handleLocationSelect} />

      {/* Map */}
      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border-tertiary)' }}>
        <div style={{position: 'absolute',top: '12px',right: '200px',zIndex: 800}}>
          <WeatherStatusBadge lat={mapCenter.lat} lng={mapCenter.lng}/>
        </div>
        <MapInner
          center={mapCenter}
          zoom={mapZoom}
          points={points}
          onMapClick={addPoint}
        />

        {/* How-to overlay */}
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '8px', padding: '8px 12px',
          fontSize: '12px', color: '#374151',
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          zIndex: 900, maxWidth: '180px', lineHeight: '1.6',
        }}>
          <strong>How to use:</strong><br />
          1. Name your field above<br />
          2. Search your village<br />
          3. Click 4 corners to mark boundary
        </div>
      </div>

      {/* Live stats bar */}
      <div style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
        background: isComplete ? '#f0fdf4' : '#f9fafb',
        border: `1px solid ${isComplete ? '#86efac' : '#e5e7eb'}`,
        borderRadius: '10px', padding: '12px 16px',
        transition: 'all 0.3s ease',
      }}>
        {/* Pin count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            background: '#16a34a', color: 'white',
            borderRadius: '50%', width: '20px', height: '20px',
            fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600,
          }}>{points.length}</span>
          <span style={{ fontSize: '13px', color: '#374151' }}>
            {points.length === 1 ? 'pin dropped' : 'pins dropped'}
          </span>
        </div>

        {isComplete && (
          <>
            <div style={{ width: '1px', height: '24px', background: '#d1d5db' }} />
            <div>
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#15803d' }}>{area.acres}</span>
              <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '4px' }}>acres</span>
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#0f766e' }}>{area.hectares}</span>
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
            Drop {Math.max(0, 4 - points.length)} more {(4 - points.length) === 1 ? 'pin' : 'pins'} to complete boundary
          </span>
        )}

        {points.length === 0 && (
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            Click on the map to start marking your field
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {points.length > 0 && (
            <button
              onClick={removeLastPoint}
              style={{
                padding: '6px 12px', border: '1px solid #d1d5db',
                borderRadius: '6px', background: 'white',
                fontSize: '12px', cursor: 'pointer', color: '#374151',
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
                fontSize: '12px', cursor: 'pointer', color: '#dc2626',
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
                fontWeight: 500,
              }}
            >
              Add field →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
