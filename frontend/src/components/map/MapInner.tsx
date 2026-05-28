'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../../utils/geoUtils';

// Fix leaflet marker icon issue in Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A component to catch map clicks and pass them up
function ClickCatcher({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// A component to recenter the map when mapCenter props change
function MapCenterUpdater({ center, zoom }: { center: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

interface MapInnerProps {
  center: LatLng;
  zoom: number;
  points: LatLng[];
  onMapClick: (point: LatLng) => void;
}

export default function MapInner({ center, zoom, points, onMapClick }: MapInnerProps) {
  const handleMapClick = (lat: number, lng: number) => {
    onMapClick({ lat, lng });
  };

  const polygonPositions = points.map(p => [p.lat, p.lng] as [number, number]);

  return (
    <div style={{ height: '480px', width: '100%', borderRadius: '12px', zIndex: 1 }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCenterUpdater center={center} zoom={zoom} />
        <ClickCatcher onMapClick={handleMapClick} />

        {/* Draw the markers for each pinned point */}
        {points.map((p, idx) => (
          <Marker key={idx} position={[p.lat, p.lng]} />
        ))}

        {/* Draw the polygon if there are points */}
        {points.length > 0 && (
          <Polygon
            positions={polygonPositions}
            pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.3, weight: 3 }}
          />
        )}
      </MapContainer>
    </div>
  );
}