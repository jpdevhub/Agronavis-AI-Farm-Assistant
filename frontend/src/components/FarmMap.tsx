import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { farmApi } from '../utils/farmApi';
import { FIELD_COLORS } from '../utils/mapUtils';
import styles from '../styles/Map.module.css';

// Fix for Leaflet marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Field {
  id: string;
  name: string;
  area_acres: number;
  area_hectares?: number;
  polygon: Array<{ lat: number; lng: number }>;
  center_latitude?: number;
  center_longitude?: number;
}

interface Farm {
  id: string;
  name: string;
  location: {
    latitude?: number;
    longitude?: number;
    state?: string;
    district?: string;
    village?: string;
    /** Legacy single-polygon stored directly on the farm */
    polygon?: Array<{ lat: number; lng: number }>;
  };
  total_area: number;
  soil_type?: string;
  irrigation_type?: string;
}

interface FarmMapProps {
  farmId?: string;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  showAllFarms?: boolean;
  height?: string;
}

const FarmMap: React.FC<FarmMapProps> = ({
  farmId,
  centerLat = 20.5937,
  centerLng = 78.9629,
  zoom = 5,
  showAllFarms = false,
  height = '400px',
}) => {
  const [farms, setFarms] = useState<Farm[]>([]);
  // Map from farm ID → its fields fetched from farm_fields table
  const [fieldsByFarm, setFieldsByFarm] = useState<Record<string, Field[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([centerLat, centerLng]);
  const [mapZoom, setMapZoom] = useState(zoom);

  useEffect(() => {
    const loadFarmData = async () => {
      try {
        setLoading(true);

        if (farmId) {
          const farm = await farmApi.getFarm(farmId);
          if (!farm) { setError('Farm not found'); return; }

          setFarms([farm]);

          // Load fields from the dedicated table
          const farmFields: Field[] = await farmApi.getFarmFields(farmId).catch(() => []);
          setFieldsByFarm({ [farmId]: farmFields });

          // Set map centre from first field, then legacy polygon centroid, then lat/lng
          const firstField = farmFields[0];
          if (firstField?.center_latitude && firstField?.center_longitude) {
            setMapCenter([firstField.center_latitude, firstField.center_longitude]);
            setMapZoom(16);
          } else if (farm.location?.polygon && farm.location.polygon.length >= 3) {
            const poly = farm.location.polygon;
            setMapCenter([
              poly.reduce((s: number, p: { lat: number }) => s + p.lat, 0) / poly.length,
              poly.reduce((s: number, p: { lng: number }) => s + p.lng, 0) / poly.length,
            ]);
            setMapZoom(16);
          } else if (farm.location?.latitude && farm.location?.longitude) {
            setMapCenter([farm.location.latitude, farm.location.longitude]);
            setMapZoom(16);
          }
        } else if (showAllFarms) {
          const allFarms: Farm[] = await farmApi.getFarms();
          const farmsWithData = allFarms.filter(
            f =>
              (f.location?.latitude && f.location?.longitude) ||
              (f.location?.polygon?.length ?? 0) >= 3
          );
          setFarms(farmsWithData);

          // Load fields for each farm in parallel
          const entries = await Promise.all(
            farmsWithData.map(async f => {
              const ff: Field[] = await farmApi.getFarmFields(f.id).catch(() => []);
              return [f.id, ff] as [string, Field[]];
            })
          );
          setFieldsByFarm(Object.fromEntries(entries));

          if (farmsWithData.length > 0) {
            const first = farmsWithData[0];
            const firstField = entries[0]?.[1]?.[0];
            if (firstField?.center_latitude && firstField?.center_longitude) {
              setMapCenter([firstField.center_latitude, firstField.center_longitude]);
            } else if (first.location?.latitude && first.location?.longitude) {
              setMapCenter([first.location.latitude, first.location.longitude]);
            }
            setMapZoom(12);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load farm data';
        console.error('FarmMap load error:', err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadFarmData();
  }, [farmId, showAllFarms]);

  if (loading) {
    return <div className={`${styles.loadingContainer} ${styles.mapHeight}`}>Loading map...</div>;
  }

  if (error) {
    return <div className={`${styles.errorContainer} ${styles.mapHeight}`}>Error: {error}</div>;
  }

  if (farms.length === 0) {
    return (
      <div className={`${styles.noDataContainer} ${styles.mapHeight}`}>
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
          No farms with location data available.<br />
          <span style={{ fontSize: '0.875rem' }}>Use &quot;Field Manager&quot; to add field boundaries.</span>
        </p>
      </div>
    );
  }

  const heightClass =
    height === '100%' ? styles.mapHeightFull :
    height === '250px' ? styles.mapHeightSmall :
    styles.mapHeight;

  return (
    <div className={`${styles.mapContainer} ${heightClass}`}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className={`${styles.mapContainer} ${styles.mapHeightFull}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {farms.map(farm => {
          const fields: Field[] = fieldsByFarm[farm.id] ?? [];
          const hasFields = fields.length > 0;
          const hasLegacyPolygon =
            !hasFields && (farm.location?.polygon?.length ?? 0) >= 3;

          // Marker position: first field centre → legacy polygon centroid → lat/lng
          const markerLat =
            fields[0]?.center_latitude ??
            farm.location?.latitude ??
            (hasLegacyPolygon
              ? farm.location!.polygon!.reduce((s: number, p: { lat: number }) => s + p.lat, 0) / farm.location!.polygon!.length
              : undefined);
          const markerLng =
            fields[0]?.center_longitude ??
            farm.location?.longitude ??
            (hasLegacyPolygon
              ? farm.location!.polygon!.reduce((s: number, p: { lng: number }) => s + p.lng, 0) / farm.location!.polygon!.length
              : undefined);

          return (
            <React.Fragment key={farm.id}>
              {/* Named fields from farm_fields table — each gets its own colour */}
              {hasFields &&
                fields.map((field, idx) => {
                  if (!field.polygon || field.polygon.length < 3) return null;
                  const color = FIELD_COLORS[idx % FIELD_COLORS.length];
                  return (
                    <Polygon
                      key={field.id}
                      positions={field.polygon.map(p => [p.lat, p.lng] as [number, number])}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2.5 }}
                    >
                      <Popup>
                        <div style={{ minWidth: 160 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                            {field.name}
                          </div>
                          <div style={{ fontSize: 13, color: '#374151' }}>
                            {field.area_acres.toFixed(2)} acres
                            {field.area_hectares ? ` · ${field.area_hectares.toFixed(2)} ha` : ''}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                            {farm.name}
                          </div>
                        </div>
                      </Popup>
                    </Polygon>
                  );
                })}

              {/* Legacy single polygon — only shown when no named fields exist */}
              {hasLegacyPolygon && (
                <Polygon
                  positions={farm.location!.polygon!.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.25, weight: 2.5 }}
                >
                  <Popup>
                    <div style={{ minWidth: 150, fontWeight: 700 }}>{farm.name}</div>
                  </Popup>
                </Polygon>
              )}

              {/* Farm marker */}
              {markerLat !== undefined && markerLng !== undefined && (
                <Marker position={[markerLat, markerLng]}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{farm.name}</div>
                      <div style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>
                        {farm.total_area.toFixed(1)} acres total
                      </div>
                      {hasFields && (
                        <div style={{ fontSize: 12, color: '#059669', marginBottom: 2 }}>
                          {fields.length} field{fields.length !== 1 ? 's' : ''} mapped
                        </div>
                      )}
                      {farm.soil_type && (
                        <div style={{ fontSize: 12, color: '#6b7280' }}>Soil: {farm.soil_type}</div>
                      )}
                      {(farm.location?.village || farm.location?.district || farm.location?.state) && (
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                          {[farm.location?.village, farm.location?.district, farm.location?.state]
                            .filter(Boolean)
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default FarmMap;
