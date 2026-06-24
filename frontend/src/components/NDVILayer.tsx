import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import useNDVI from '../hooks/useNDVI';
import NDVILegend from './NDVILegend';

interface NDVILayerProps {
  farmId: string;
  visible: boolean;
  dateFrom?: string;
  dateTo?: string;
}

const NDVIOverlay: React.FC<{ bbox: number[]; opacity: number }> = ({ bbox, opacity }) => {
  const map = useMap();
  const layerRef = useRef<L.ImageOverlay | null>(null);

  useEffect(() => {
    const [west, south, east, north] = bbox;
    const bounds = L.latLngBounds([south, west], [north, east]);

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, 'rgba(220, 38, 38, 0.7)');
      gradient.addColorStop(0.4, 'rgba(234, 88, 12, 0.7)');
      gradient.addColorStop(0.7, 'rgba(202, 138, 4, 0.7)');
      gradient.addColorStop(1, 'rgba(22, 163, 74, 0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 100, 100);
    }

    const imageUrl = canvas.toDataURL();
    const overlay = L.imageOverlay(imageUrl, bounds, { opacity, alt: 'NDVI illustration — connect Sentinel Hub for real imagery' });
    overlay.addTo(map);
    layerRef.current = overlay;

    return () => {
      overlay.removeFrom(map);
    };
  }, [bbox, map]);

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  return null;
};

const NDVILayer: React.FC<NDVILayerProps> = ({ farmId, visible, dateFrom, dateTo }) => {
  const { ndviData, loading, error, fetchNDVI } = useNDVI(farmId);
  const [opacity, setOpacity] = useState(0.7);

  useEffect(() => {
    if (visible) {
      fetchNDVI(dateFrom, dateTo);
    }
  }, [visible, dateFrom, dateTo, fetchNDVI]);

  if (!visible) return null;

  if (loading) {
    return (
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000, background: 'white',
        padding: '10px 16px', borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontSize: '13px', color: '#374151',
      }}>
        Loading NDVI data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        position: 'absolute', top: '10px', left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000, background: '#fef2f2',
        padding: '8px 14px', borderRadius: '8px',
        border: '1px solid #fecaca',
        fontSize: '12px', color: '#dc2626',
      }}>
        {error}
      </div>
    );
  }

  if (!ndviData) return null;

  return (
    <>
      <NDVIOverlay bbox={ndviData.bbox} opacity={opacity} />
      <NDVILegend ndviMean={ndviData.ndvi_mean} />
      <div style={{
        position: 'absolute', bottom: '24px', left: '10px',
        zIndex: 1000, background: 'white',
        borderRadius: '8px', padding: '10px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        minWidth: '160px',
      }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
          Layer Opacity
        </p>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.1}
          value={opacity}
          onChange={e => setOpacity(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9ca3af' }}>
          <span>Transparent</span>
          <span>Solid</span>
        </div>
      </div>
    </>
  );
};

export default NDVILayer;

