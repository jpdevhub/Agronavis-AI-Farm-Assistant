import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { farmApi } from '../utils/farmApi';
import styles from '../styles/Map.module.css';

// Fix for Leaflet marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Farm {
  id: string;
  name: string;
  location: {
    latitude?: number;
    longitude?: number;
    state?: string;
    district?: string;
    village?: string;
    polygon?: Array<{lat: number, lng: number}>;
    fields?: Array<{
      id: string;
      name: string;
      area_acres: number;
      area_hectares?: number;
      polygon: Array<{lat: number, lng: number}>;
      center_latitude?: number;
      center_longitude?: number;
      created_at?: string;
    }>;
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
  showAllFields?: boolean;
  height?: string;
}

const FarmMap: React.FC<FarmMapProps> = ({ 
  farmId, 
  centerLat = 20.5937, 
  centerLng = 78.9629,
  zoom = 5,
  showAllFarms = false,
  showAllFields = false,
  height = '400px'
}) => {
  const [farms, setFarms] = useState<Farm[]>([]);
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
          if (farm) {
            setFarms([farm]);
            if (farm.location?.latitude && farm.location?.longitude) {
              setMapCenter([farm.location.latitude, farm.location.longitude]);
              setMapZoom(16);
            } else if (farm.location?.polygon && farm.location.polygon.length >= 3) {
              const polygon = farm.location.polygon;
              const centerLat = polygon.reduce((sum: number, p: {lat: number}) => sum + p.lat, 0) / polygon.length;
              const centerLng = polygon.reduce((sum: number, p: {lng: number}) => sum + p.lng, 0) / polygon.length;
              setMapCenter([centerLat, centerLng]);
              setMapZoom(16);
            }
          } else {
            setFarms([]);
            setError('Farm not found');
          }
        } else if (showAllFarms) {
          const allFarms = await farmApi.getFarms();
          const farmsWithCoords = allFarms.filter(
            (farm: Farm) => (farm.location?.latitude && farm.location?.longitude) || 
                           (farm.location?.polygon && farm.location.polygon.length >= 3)
          );
          
          setFarms(farmsWithCoords);
          
          if (farmsWithCoords.length > 0) {
            const firstFarm = farmsWithCoords[0];
            if (firstFarm.location?.latitude && firstFarm.location?.longitude) {
              setMapCenter([firstFarm.location.latitude, firstFarm.location.longitude]);
            } else if (firstFarm.location?.polygon && firstFarm.location.polygon.length >= 3) {
              const polygon = firstFarm.location.polygon;
              const centerLat = polygon.reduce((sum: number, p: {lat: number}) => sum + p.lat, 0) / polygon.length;
              const centerLng = polygon.reduce((sum: number, p: {lng: number}) => sum + p.lng, 0) / polygon.length;
              setMapCenter([centerLat, centerLng]);
            }
            setMapZoom(12);
          }
        }
      } catch (err: any) {
        console.error('Error loading farm data:', err);
        setError(err.message || 'Failed to load farm data');
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
        <p className="text-gray-500 text-center p-4">
          No farms with location data available.<br/>
          <span className="text-sm">Use "Draw Field" to add field boundaries.</span>
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
          const hasPolygon = farm.location?.polygon && farm.location.polygon.length >= 3;
          const hasFields = farm.location?.fields && farm.location.fields.length > 0;
          const lat = farm.location?.latitude;
          const lng = farm.location?.longitude;

          // Derive center from polygon centroid if GPS lat/lng not set
          const polyCenter = hasPolygon ? {
            lat: farm.location!.polygon!.reduce((s: number, p: {lat: number}) => s + p.lat, 0) / farm.location!.polygon!.length,
            lng: farm.location!.polygon!.reduce((s: number, p: {lng: number}) => s + p.lng, 0) / farm.location!.polygon!.length,
          } : null;

          const centerLat = lat ?? polyCenter?.lat ?? farm.location?.fields?.[0]?.center_latitude;
          const centerLng = lng ?? polyCenter?.lng ?? farm.location?.fields?.[0]?.center_longitude;
          

          if (!centerLat || !centerLng) return null;
          
          return (
            <React.Fragment key={farm.id}>
              {showAllFields && hasFields ? (
                farm.location.fields!.map((field, idx) => (
                  field.polygon && field.polygon.length >= 3 && (
                    <Polygon 
                      key={field.id || idx}
                      positions={field.polygon.map(p => [p.lat, p.lng])} 
                      pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.3, weight: 3 }}
                    >
                      <Popup>
                        <div style={{ minWidth: '150px' }}>
                          <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>{field.name}</h3>
                          <p style={{ margin: '4px 0' }}><strong>Area:</strong> {field.area_acres} acres</p>
                          {field.area_hectares && <p style={{ margin: '4px 0' }}><strong>Area:</strong> {field.area_hectares} ha</p>}
                        </div>
                      </Popup>
                    </Polygon>
                  )
                ))
              ) : hasPolygon && (
                <Polygon 
                  positions={farm.location.polygon!.map(p => [p.lat, p.lng])} 
                  pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.3, weight: 3 }}
                />
              )}
              <Marker position={[centerLat!, centerLng!]}>
                <Popup>
                  <div style={{ minWidth: '150px' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>{farm.name}</h3>
                    <p style={{ margin: '4px 0' }}><strong>Area:</strong> {farm.total_area} acres</p>
                    {farm.soil_type && <p style={{ margin: '4px 0' }}><strong>Soil:</strong> {farm.soil_type}</p>}
                    {farm.irrigation_type && <p style={{ margin: '4px 0' }}><strong>Irri:</strong> {farm.irrigation_type}</p>}
                    {hasPolygon && (
                      <p style={{ margin: '4px 0', color: '#16a34a', fontSize: '12px' }}>
                        ✓ Field boundary mapped ({farm.location.polygon!.length} points)
                      </p>
                    )}
                    {(farm.location?.village || farm.location?.district || farm.location?.state) && (
                      <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
                        {[farm.location?.village, farm.location?.district, farm.location?.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default FarmMap;