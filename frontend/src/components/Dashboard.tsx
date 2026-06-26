import MarketPriceWidget from "./MarketPriceWidget";
import { FarmCardSkeleton, CropCardSkeleton, MapSkeleton } from "./Skeleton";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import s from '../styles/Dashboard.module.css';
import { farmApi, cropApi } from '../utils/farmApi';
import { soilService } from '../utils/soilService';
import { useReverseGeocode } from '../hooks/useReverseGeocode';
import { FIELD_COLORS } from '../utils/mapUtils';
import type { LatLng } from '../utils/geoUtils';
import ProfileTab from './ProfileTab';
import AnalyticsDashboard from './AnalyticsDashboard';
import ResourceDashboard from './ResourceDashboard';
import CropScanTab from './CropScanTab';
import DailyTaskReminders from './DailyTaskReminders';
import EmptyState from './EmptyState';
import OnboardingTour from './OnboardingTour';

// SSR-disable Leaflet polygon mapper
const PolygonMapper = dynamic(() => import('./map/PolygonMapper'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

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
  total_area: number;
  location?: {
    latitude?: number;
    longitude?: number;
    state?: string;
    district?: string;
    village?: string;
    polygon?: Array<{ lat: number; lng: number }>;
    center_latitude?: number;
    center_longitude?: number;
    area_acres?: number;
  };
  soil_type?: string;
  irrigation_type?: string;
}

interface Crop {
  id: string;
  crop_type: string;
  variety?: string;
  area_allocated: number;
  sowing_date?: string;
  expected_harvest_date?: string;
  season?: string;
  current_growth_stage?: string;
}

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// Standard NPK soil profiles (mg/kg) — based on ICAR reference values
const NPK_BY_SOIL: Record<string, { n: number; p: number; k: number }> = {
  loamy:   { n: 142, p: 48, k: 210 },
  clay:    { n: 120, p: 60, k: 180 },
  sandy:   { n: 92,  p: 35, k: 140 },
  silt:    { n: 115, p: 42, k: 165 },
  peaty:   { n: 160, p: 30, k: 120 },
  chalky:  { n: 80,  p: 55, k: 190 },
  default: { n: 110, p: 45, k: 170 },
};

// Recommended fertilizer dosage by crop (lbs/acre) — ICAR/FAO crop nutrition guidelines
const FERT_BY_CROP: Record<string, { urea: number; dap: number; potash: number }> = {
  Rice:      { urea: 220, dap: 110, potash: 165 },
  Wheat:     { urea: 200, dap: 100, potash: 150 },
  Cotton:    { urea: 180, dap: 90,  potash: 130 },
  Sugarcane: { urea: 260, dap: 130, potash: 200 },
  Maize:     { urea: 190, dap: 95,  potash: 140 },
  Soybean:   { urea: 80,  dap: 120, potash: 110 },
  Tomato:    { urea: 150, dap: 140, potash: 160 },
  Potato:    { urea: 170, dap: 150, potash: 180 },
  default:   { urea: 200, dap: 100, potash: 150 },
};

// Coloured dot for each fertilizer type (no emojis)
const FertDot: React.FC<{ color: string }> = ({ color }) => (
  <div style={{
    width: 12, height: 12, borderRadius: '50%',
    background: color, flexShrink: 0, marginTop: 2,
  }} />
);

// Palette for field colour swatches — imported from shared mapUtils
// (FIELD_COLORS is used by both Dashboard and FarmMap to keep colours in sync)

const Dashboard: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [fields, setFields] = useState<Field[]>([]);
  // Map of farmId → fields[] for ALL farms (used in My Farms cards)
  const [allFarmsFields, setAllFarmsFields] = useState<Record<string, Field[]>>({});
  const [pendingField, setPendingField] = useState<{
    fieldName: string;
    coordinates: LatLng[];
    areaAcres: number;
    areaHectares: number;
    centerLat: number;
    centerLng: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fertilizer calc state
  const [fertFarmId, setFertFarmId] = useState('');
  const [fertFieldId, setFertFieldId] = useState(''); // '' = entire farm
  const [fertCrop, setFertCrop] = useState('Rice');
  const [fertMethod, setFertMethod] = useState('Broadcasting');

  const { geocode } = useReverseGeocode();
  const selectedFarm = farms.find(f => f.id === selectedFarmId);

  const loadData = useCallback(async () => {
    try {
      const farmsData = await farmApi.getFarms();
      setFarms(farmsData || []);
      if (farmsData?.length > 0) {
        if (!selectedFarmId) {
          setSelectedFarmId(farmsData[0].id);
          setFertFarmId(farmsData[0].id);
        }
        // Load crops for first farm
        try {
          const cropsData = await cropApi.getFarmCrops(farmsData[0].id);
          setCrops(cropsData || []);
          if (cropsData?.length > 0 && !fertCrop) setFertCrop(cropsData[0].crop_type);
        } catch { /* no crops */ }
        // Load fields for ALL farms so My Farms page shows correct counts
        const fieldsMap: Record<string, Field[]> = {};
        await Promise.all(
          farmsData.map(async (farm: Farm) => {
            try {
              const flds = await farmApi.getFarmFields(farm.id);
              fieldsMap[farm.id] = flds || [];
            } catch { fieldsMap[farm.id] = []; }
          })
        );
        setAllFarmsFields(fieldsMap);
      }
    } catch (err) {
      console.error('Error loading farms:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFarmId, fertCrop]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reload fields for selected farm whenever selectedFarmId changes
  useEffect(() => {
    if (!selectedFarmId) return;
    farmApi.getFarmFields(selectedFarmId)
      .then((data: Field[]) => {
        setFields(data || []);
        // Keep allFarmsFields in sync
        setAllFarmsFields(prev => ({ ...prev, [selectedFarmId]: data || [] }));
      })
      .catch(() => setFields([]));
  }, [selectedFarmId]);

  // Handle ?mode=draw from onboarding redirect
  useEffect(() => {
    const mode = router.query.mode as string;
    const farmId = router.query.farmId as string;
    if (mode === 'draw' && farmId && farms.length > 0) {
      setSelectedFarmId(farmId);
      setActiveTab('map');
      router.replace('/dashboard', undefined, { shallow: true });
    }
  }, [router.query, farms]);

  // Map handlers
  const handleAddField = async () => {
    if (!pendingField || !selectedFarmId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await farmApi.addFarmField(selectedFarmId, {
        name: pendingField.fieldName,
        area_acres: pendingField.areaAcres,
        area_hectares: pendingField.areaHectares,
        polygon: pendingField.coordinates.map(p => ({ lat: p.lat, lng: p.lng })),
        center_latitude: pendingField.centerLat,
        center_longitude: pendingField.centerLng,
      });
      setSaveMessage({ type: 'success', text: `"${pendingField.fieldName}" saved — ${pendingField.areaAcres.toFixed(1)} acres` });
      try {
        const geo = await geocode(pendingField.centerLat, pendingField.centerLng);
        if (geo?.state && geo?.district) {
          await soilService.estimateSoilHealth(selectedFarmId, geo.state, geo.district);
        }
      } catch { /* silent — soil estimation is best-effort */ }
      // Refresh both farms (for total_area) and the fields list
      await loadData();
      const refreshed = await farmApi.getFarmFields(selectedFarmId);
      setFields(refreshed || []);
      setPendingField(null);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save field';
      setSaveMessage({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (fieldId: string, fieldName: string) => {
    if (!selectedFarmId) return;
    setDeletingFieldId(fieldId);
    setSaveMessage(null);
    try {
      await farmApi.deleteFarmField(selectedFarmId, fieldId);
      setSaveMessage({ type: 'info', text: `"${fieldName}" removed.` });
      // Refresh both farms (total_area updated by DB trigger) and fields list
      await loadData();
      const refreshed = await farmApi.getFarmFields(selectedFarmId);
      setFields(refreshed || []);
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete field';
      setSaveMessage({ type: 'error', text: msg });
    } finally {
      setDeletingFieldId(null);
    }
  };

  // Fertilizer calc — area comes from farm_fields sum (kept in sync by DB trigger via total_area)
  const fertFarm = farms.find(f => f.id === fertFarmId) || farms[0];
  const soilKey = fertFarm?.soil_type || 'default';
  const npk = NPK_BY_SOIL[soilKey] || NPK_BY_SOIL.default;
  const dosage = FERT_BY_CROP[fertCrop] || FERT_BY_CROP.default;
  // If a specific field is selected, use its area; otherwise use total farm area from DB trigger
  const fertFields = allFarmsFields[fertFarm?.id || ''] || [];
  const selectedFertField = fertFields.find(f => f.id === fertFieldId);
  const area = selectedFertField
    ? selectedFertField.area_acres
    : (fertFarm?.total_area && fertFarm.total_area > 0) ? fertFarm.total_area : 1;
  // Dynamic cost/acre: (urea*$0.35 + dap*$0.55 + potash*$0.30) / 50kg bag weight
  const costPerAcre = ((dosage.urea * 0.35 + dosage.dap * 0.55 + dosage.potash * 0.30) / 50).toFixed(2);
  const ureaTons  = ((dosage.urea   * area) / 2000).toFixed(2);
  const dapTons   = ((dosage.dap    * area) / 2000).toFixed(2);
  const potashTons= ((dosage.potash * area) / 2000).toFixed(2);
  const ureaBags  = Math.ceil((dosage.urea   * area) / 50);
  const dapBags   = Math.ceil((dosage.dap    * area) / 50);
  const potashBags= Math.ceil((dosage.potash * area) / 50);
  const subtotal  = (ureaBags * 28 + dapBags * 42 + potashBags * 18);
  const delivery  = farms.length > 0 ? 450 : 0;
  const total     = (subtotal + delivery).toLocaleString();

  const hasFarms = farms.length > 0;

  return (
    <div>
      <OnboardingTour setActiveTab={setActiveTab} />
      {/* ======================== OVERVIEW ======================== */}
      {activeTab === 'overview' && (
        <>
          <div className={s.greeting}>
            <h2 className={s.greetingTitle}>{t('dashboard.overview.greetingTitle')}</h2>
            <p className={s.greetingSub}>
              {hasFarms
                ? t('dashboard.overview.summaryWithFarms', { farmCount: farms.length, cropCount: crops.length })
                : t('dashboard.overview.summaryEmpty')}
            </p>
          </div>

          {/* Weather + Area */}
          <div className={s.overviewGrid} style={{ marginBottom: 20 }}>
            <div className={s.weatherCard} style={{ gridColumn: 'span 2' }} data-hc-target="true">
              <div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>{t('dashboard.overview.clearSkies')}</div>
                <div className={s.weatherTemp}>24°C</div>
              </div>
              <div className={s.weatherMeta}>
                <div className={s.weatherMetaItem}>
                  <div className={s.weatherMetaKey}>{t('weather.humidity')}</div>
                  <div className={s.weatherMetaVal}>42%</div>
                </div>
                <div className={s.weatherMetaItem}>
                  <div className={s.weatherMetaKey}>{t('weather.wind')}</div>
                  <div className={s.weatherMetaVal}>12 km/h</div>
                </div>
                <div className={s.weatherMetaItem}>
                  <div className={s.weatherMetaKey}>{t('dashboard.overview.farms')}</div>
                  <div className={s.weatherMetaVal}>{farms.length}</div>
                </div>
                <div className={s.weatherMetaItem}>
                  <div className={s.weatherMetaKey}>{t('dashboard.overview.crops')}</div>
                  <div className={s.weatherMetaVal}>{crops.length}</div>
                </div>
              </div>
            </div>

            <div className={s.card} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('farms')} data-hc-target="true">
              <div className={s.cardTitle}>{t('dashboard.overview.totalArea')}</div>
              <div className={s.cardSub}>{t('dashboard.overview.acrossAllFarms')}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {farms.reduce((acc, f) => acc + (f.total_area || 0), 0).toFixed(1)}
                <span style={{ fontSize: 16, fontWeight: 600, color: '#10b981' }}> ac</span>
              </div>
            </div>
          </div>

          {/* Crop Progress + Tasks + Satellite */}
          <div className={s.overviewGrid}>
            {/* Crop progress */}
            <div className={s.card} data-hc-target="true">
              <div className={s.cardHeader}>
                <div className={s.cardTitle}>{t('dashboard.overview.cropProgress')}</div>
              </div>
              {crops.length > 0 ? (
                <>
                  <div className={s.progressRing} style={{ marginBottom: 12 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#dcfce7" strokeWidth="10"/>
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 50 * 0.75} ${2 * Math.PI * 50 * 0.25}`}
                        strokeDashoffset={2 * Math.PI * 50 * 0.25}
                        strokeLinecap="round" transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div style={{ position: 'absolute', textAlign: 'center' }}>
                      <div className={s.progressLabel}>75%</div>
                      <div className={s.progressSub}>{t('dashboard.overview.maturity')}</div>
                    </div>
                  </div>
                  <div className={s.cropMeta}>
                    <span className={s.cropTag}>{crops[0].crop_type}</span>
                    <span className={s.cropHealthBadge}>{t('dashboard.overview.healthy')}</span>
                  </div>
                  <div className={s.cropStats}>
                    <div className={s.cropStat}>
                      <div className={s.cropStatLabel}>{t('dashboard.overview.moisture')}</div>
                      <div className={s.cropStatVal}>68%</div>
                    </div>
                    <div className={s.cropStat}>
                      <div className={s.cropStatLabel}>{t('dashboard.overview.nitrogen')}</div>
                      <div className={`${s.cropStatVal} ${s.cropStatValGreen}`}>{t('dashboard.overview.optimal')}</div>
                    </div>
                  </div>
                  <div className={s.harvestRow}>
                    <span>{t('dashboard.overview.estimatedHarvest')}</span>
                    <span style={{ fontWeight: 700 }}>{crops[0].expected_harvest_date || t('dashboard.overview.notSet')}</span>
                  </div>
                  <div className={s.harvestBar}><div className={s.harvestBarFill} /></div>
                </>
              ) : (
                <EmptyState
                  variant="crops"
                  title={t('dashboard.emptyStates.crops.title')}
                  description={t('dashboard.emptyStates.crops.desc')}
                  ctaLabel={t('dashboard.emptyStates.crops.cta')}
                  onCta={() => router.push('/onboarding/crops?farmId=' + (farms[0]?.id || ''))}
                />
              )}
            </div>

            <DailyTaskReminders />

            {/* Satellite card */}
            <div className={`${s.card} ${s.satelliteCard}`} data-hc-target="true">
              <div className={s.cardTitle}>{t('dashboard.overview.liveSatellite')}</div>
              <div className={s.cardSub} style={{ marginBottom: 12 }}>{t('dashboard.overview.fieldTelemetry')}</div>
              <div className={s.mapPlaceholder}>
                <div className={s.liveBadge}>{t('dashboard.overview.liveFeed')}</div>
                <div className={s.coordBadge}>
                  {selectedFarm?.location?.center_latitude?.toFixed(4) || '22.5726'}° N,{' '}
                  {selectedFarm?.location?.center_longitude?.toFixed(4) || '88.3639'}° E
                </div>
                <div className={s.mapPlaceholderText} style={{ position: 'absolute', top: '40%' }}>
                  {hasFarms ? t('dashboard.overview.openFieldMapToDraw') : t('dashboard.overview.noFarmLocation')}
                </div>
              </div>
              <div className={s.signalStrength}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t('dashboard.overview.signalStrength')}</span>
                <div className={s.signalDots}>
                  {[true, true, true, false].map((active, i) => (
                    <div key={i} className={`${s.signalDot} ${!active ? s.signalDotWeak : ''}`} />
                  ))}
                </div>
              </div>
              <div className={s.telemetryGrid}>
                <div className={s.telemetryItem}><div className={s.telemetryLabel}>Soil Temp</div><div className={s.telemetryVal}>19.4°C</div></div>
                <div className={s.telemetryItem}><div className={s.telemetryLabel}>NDVI Index</div><div className={s.telemetryVal}>0.82</div></div>
              </div>
              <button className={s.expandBtn} onClick={() => setActiveTab('map')}>{t('dashboard.overview.openFieldMap')}</button>
            </div>
          </div>
          <MarketPriceWidget />
          {/* AI Yield banner */}
          <div className={s.yieldBanner} style={{ marginTop: 24 }}>
            <div>
              <div className={s.yieldTitle}>{t('dashboard.overview.aiYieldPrediction')}</div>
              <div className={s.yieldDesc}>
                {t('dashboard.overview.yieldDesc')}
              </div>
              <button className={s.yieldBtn} onClick={() => router.push('/weather-forecast')}>{t('dashboard.overview.viewForecastReport')}</button>
            </div>
            <div className={s.yieldStats}>
              <div className={s.yieldStat}>
                <div className={s.yieldStatLabel}>{t('dashboard.overview.estTonnage')}</div>
                <div className={s.yieldStatVal}>2.4k</div>
              </div>
              <div className={s.yieldStat}>
                <div className={s.yieldStatLabel}>{t('dashboard.overview.confidence')}</div>
                <div className={s.yieldStatVal}>94%</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ======================== MY FARMS ======================== */}
      {activeTab === 'farms' && (
        <>
          <div className={s.cardHeader} style={{ marginBottom: 20 }}>
            <div>
              <div className={s.fertTitle}>Active Cultivations</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Soil metrics for {farms.length} active plot{farms.length !== 1 ? 's' : ''}.
              </div>
            </div>
            <button className={s.emptyBtn} onClick={() => router.push('/onboarding/farm')}>
              + Map New Farm
            </button>
          </div>

          {loading ? (
            <div className={s.farmsGrid}>
              <FarmCardSkeleton />
              <FarmCardSkeleton />
              <FarmCardSkeleton />
            </div>
          ) : !hasFarms ? (
            <EmptyState
              variant="farms"
              title={t('dashboard.emptyStates.farms.title')}
              description={t('dashboard.emptyStates.farms.desc')}
              ctaLabel={t('dashboard.emptyStates.farms.cta')}
              onCta={() => router.push('/onboarding/farm')}
            />
          ) : (
            <>
              <div className={s.farmsGrid}>
                {farms.map(farm => {
                  const fnpk = NPK_BY_SOIL[farm.soil_type || 'default'] || NPK_BY_SOIL.default;
                  return (
                    <div key={farm.id} className={s.farmCard} onClick={() => { setSelectedFarmId(farm.id); setActiveTab('map'); }} data-hc-target="true">
                      <div className={s.farmCardImg}>
                        <span className={s.farmCardPremiumBadge}>
                          {farm.soil_type?.toUpperCase() || 'LOAMY'} SOIL
                        </span>
                      </div>
                      <div className={s.farmCardBody}>
                        <div className={s.farmCardName}>
                          {farm.name}
                          <span className={s.cropBadge}>{farm.soil_type?.toUpperCase() || 'LOAMY'}</span>
                        </div>
                        <div className={s.farmNpkGrid}>
                          <div className={s.npkItem}>
                            <div className={s.npkLabel}>NITROGEN (N)</div>
                            <div className={s.npkVal}>{fnpk.n}</div>
                            <div className={s.npkUnit}>mg/kg</div>
                          </div>
                          <div className={s.npkItem}>
                            <div className={s.npkLabel}>PHOSPHORUS (P)</div>
                            <div className={s.npkVal}>{fnpk.p}</div>
                            <div className={s.npkUnit}>mg/kg</div>
                          </div>
                          <div className={s.npkItem}>
                            <div className={s.npkLabel}>POTASSIUM (K)</div>
                            <div className={s.npkVal}>{fnpk.k}</div>
                            <div className={s.npkUnit}>mg/kg</div>
                          </div>
                        </div>
                        <div className={s.soilDesc}>
                          {farm.total_area && farm.total_area > 0 ? `${farm.total_area.toFixed(1)} acres` : 'Area not mapped'} — {farm.irrigation_type || 'Irrigation type not set'}
                          {(allFarmsFields[farm.id]?.length ?? 0) > 0 && (
                            <span style={{ marginLeft: 6, color: '#059669', fontWeight: 600 }}>
                              · {allFarmsFields[farm.id].length} field{allFarmsFields[farm.id].length !== 1 ? 's' : ''} mapped
                            </span>
                          )}
                        </div>
                        <div className={s.farmCardFooter}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {farm.location?.district || farm.location?.state || 'Location not set'}
                          </span>
                          <button className={s.viewLink} onClick={e => { e.stopPropagation(); setSelectedFarmId(farm.id); setActiveTab('map'); }}>
                            View Map
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {farms[0] && (
                <div className={s.insightCard} data-hc-target="true">
                  <div className={s.insightTitle}>Quick Fertilizer Insight</div>
                  <div className={s.insightSub}>Based on soil profile for {farms[0].name}.</div>
                  <div className={s.insightRow}>
                    <span className={s.insightKey}>Soil Type</span>
                    <span className={s.insightVal}>{(farms[0].soil_type || 'loamy').charAt(0).toUpperCase() + (farms[0].soil_type || 'loamy').slice(1)}</span>
                  </div>
                  <div className={s.insightRow}>
                    <span className={s.insightKey}>Target NPK</span>
                    <span className={s.insightVal}>{npk.n}-{npk.p}-{npk.k} mg/kg</span>
                  </div>
                  <div className={s.insightRow}>
                    <span className={s.insightKey}>Est. Cost/Acre</span>
                    <span className={s.insightValCost}>${costPerAcre}</span>
                  </div>
                  <button className={s.viewRecsBtn} onClick={() => setActiveTab('fertilizer')}>
                    Open Fertilizer Calculator
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ======================== MY CROPS ======================== */}
      {activeTab === 'crops' && (
        <>
          <div className={s.cardHeader} style={{ marginBottom: 20 }}>
            <div>
              <div className={s.fertTitle}>{t('dashboard.cropsTab.title')}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                {t('dashboard.cropsTab.subtitle')}
              </div>
            </div>
            {hasFarms && (
              <button
                className={s.emptyBtn}
                onClick={() => router.push('/onboarding/crops?farmId=' + (selectedFarmId || farms[0]?.id || ''))}
              >
                {t('dashboard.cropsTab.plantCrop')}
              </button>
            )}
          </div>

          {loading ? (
            <div className={s['crop-list-skeleton']}>
              <CropCardSkeleton />
              <CropCardSkeleton />
              <CropCardSkeleton />
            </div>
          ) : !hasFarms ? (
            /* No farms at all — prompt to add a farm first */
            <EmptyState
              variant="farms"
              title={t('dashboard.emptyStates.farms.title')}
              description={t('dashboard.emptyStates.farms.desc')}
              ctaLabel={t('dashboard.emptyStates.farms.cta')}
              onCta={() => router.push('/onboarding/farm')}
            />
          ) : crops.length === 0 ? (
            /* Farms exist but no crops yet — show the hero illustrated empty state */
            <div className={s.card} style={{ padding: '8px 0' }} data-hc-target="true">
              <EmptyState
                variant="crops"
                title={t('dashboard.emptyStates.crops.title')}
                description={t('dashboard.emptyStates.crops.desc')}
                ctaLabel={t('dashboard.emptyStates.crops.cta')}
                onCta={() => router.push('/onboarding/crops?farmId=' + (selectedFarmId || farms[0]?.id || ''))}
              />
            </div>
          ) : (
            /* Crops exist — render crop cards */
            <div className={s.farmsGrid}>
              {crops.map((crop) => {
                const stage = crop.current_growth_stage || 'Vegetative';
                const parseDate = (d: string | null | undefined) => {
                  if (!d) return t('dashboard.notSet');
                  const date = new Date(d);
                  return isNaN(date.getTime())
                    ? t('dashboard.notSet')
                    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                };
                const sowingLabel = parseDate(crop.sowing_date);
                const harvestLabel = parseDate(crop.expected_harvest_date);
                return (
                  <div key={crop.id} className={s.farmCard} style={{ cursor: 'default' }} data-hc-target="true">
                    {/* Card header */}
                    <div className={s.farmCardImg} style={{ background: 'linear-gradient(160deg, #052e16, #14532d)' }}>
                      <span className={s.farmCardPremiumBadge}>{stage.toUpperCase()}</span>
                    </div>
                    <div className={s.farmCardBody}>
                      <div className={s.farmCardName}>
                        {crop.crop_type}
                        {crop.variety && (
                          <span className={s.cropBadge}>{crop.variety}</span>
                        )}
                      </div>
                      {/* Area + Season row */}
                      <div className={s.soilDesc}>
                        {crop.area_allocated > 0 ? `${crop.area_allocated.toFixed(1)} acres` : t('dashboard.cropsTab.areaNotSet')}
                        {crop.season && <span style={{ marginLeft: 6, color: '#059669', fontWeight: 600 }}>· {crop.season}</span>}
                      </div>
                      {/* Sowing & Harvest */}
                      <div className={s.farmNpkGrid} style={{ marginTop: 0 }}>
                        <div className={s.npkItem}>
                          <div className={s.npkLabel}>SOWING</div>
                          <div className={s.npkVal} style={{ fontSize: 12 }}>{sowingLabel}</div>
                        </div>
                        <div className={s.npkItem}>
                          <div className={s.npkLabel}>HARVEST</div>
                          <div className={s.npkVal} style={{ fontSize: 12 }}>{harvestLabel}</div>
                        </div>
                      </div>
                      <div className={s.farmCardFooter}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {crop.current_growth_stage ? `${t('dashboard.cropsTab.stage')}: ${crop.current_growth_stage}` : t('dashboard.cropsTab.growthStageNotSet')}
                        </span>
                        <button
                          className={s.viewLink}
                          onClick={() => setActiveTab('cropscan')}
                        >
                          {t('dashboard.cropsTab.scanCrop')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================== FIELD MAP ======================== */}
      {activeTab === 'map' && (
        <>
          <div className={s.cardHeader} style={{ marginBottom: 16 }}>
            <div>
              <div className={s.fertTitle}>Field Manager</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Draw and name each field boundary. You can add multiple fields per farm.
              </div>
            </div>
            {hasFarms && (
              <select
                className={s.farmSelectorSelect}
                value={selectedFarmId}
                onChange={e => {
                  setSelectedFarmId(e.target.value);
                  setPendingField(null);
                  setSaveMessage(null);
                }}
              >
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
          </div>

          {saveMessage && (
            <div className={`${s.saveMessage} ${saveMessage.type === 'success' ? s.saveSuccess : saveMessage.type === 'error' ? s.saveError : s.saveInfo}`}>
              {saveMessage.text}
            </div>
          )}

          {!hasFarms ? (
            <EmptyState
              variant="farms"
              title={t('dashboard.emptyStates.farms.title')}
              description={t('dashboard.emptyStates.farms.desc')}
              ctaLabel={t('dashboard.emptyStates.farms.cta')}
              onCta={() => router.push('/onboarding/farm')}
            />
          ) : (
            <>
              {/* ── Polygon drawing tool ── */}
              <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                <PolygonMapper
                  initialCenter={
                    selectedFarm?.location?.center_latitude && selectedFarm?.location?.center_longitude
                      ? { lat: selectedFarm.location.center_latitude, lng: selectedFarm.location.center_longitude }
                      : selectedFarm?.location?.latitude && selectedFarm?.location?.longitude
                      ? { lat: selectedFarm.location.latitude, lng: selectedFarm.location.longitude }
                      : { lat: 22.5726, lng: 88.3639 }
                  }
                  onPolygonComplete={data => setPendingField(data)}
                />
              </div>

              {/* ── Pending field confirm panel ── */}
              {pendingField && (
                <div style={{
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'white',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: 14,
                  padding: '16px 24px',
                  boxShadow: '0 2px 12px rgba(16,185,129,0.1)',
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                      Ready to save
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                      {pendingField.fieldName}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {pendingField.areaAcres.toFixed(2)} acres &nbsp;·&nbsp; {pendingField.areaHectares.toFixed(2)} ha
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => setPendingField(null)}
                      style={{
                        padding: '10px 20px',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: 10, background: 'white',
                        fontSize: 13, fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleAddField}
                      disabled={saving}
                      style={{
                        padding: '10px 28px',
                        background: 'linear-gradient(135deg, #064e3b, #059669)',
                        color: 'white', border: 'none', borderRadius: 10,
                        fontSize: 14, fontWeight: 700,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
                        boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Field'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Saved fields list ── */}
              {fields.length > 0 ? (
                  <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }} data-hc-target="true">
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        Mapped Fields
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {fields.length} field{fields.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {selectedFarm?.total_area?.toFixed(1) ?? '0'} acres total
                      </div>
                    </div>
                    {fields.map((field, idx) => (
                      <div
                        key={field.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '14px 20px',
                          borderBottom: idx < fields.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}
                      >
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                          background: FIELD_COLORS[idx % FIELD_COLORS.length],
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                            {field.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {field.area_acres.toFixed(2)} acres
                            {field.area_hectares ? ` · ${field.area_hectares.toFixed(2)} ha` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteField(field.id, field.name)}
                          disabled={deletingFieldId === field.id}
                          aria-label={`Delete field ${field.name}`}
                          style={{
                            padding: '6px 14px',
                            border: '1px solid #fca5a5',
                            borderRadius: 8, background: '#fef2f2',
                            fontSize: 12, fontWeight: 600, color: '#dc2626',
                            cursor: deletingFieldId === field.id ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', flexShrink: 0,
                            opacity: deletingFieldId === field.id ? 0.6 : 1,
                          }}
                        >
                          {deletingFieldId === field.id ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
                    <EmptyState
                      variant="fields"
                      title={t('dashboard.emptyStates.fields.title')}
                      description={t('dashboard.emptyStates.fields.desc')}
                    />
                  </div>
                )}
            </>
          )}
        </>
      )}

      {/* ======================== FERTILIZER ======================== */}
      {activeTab === 'fertilizer' && (
        <div className={s.fertSection} id="fertilizer-print-area">
          {/* Left: Calculator */}
          <div>
            <div className={s.fertTitle}>Fertilizer Calculator</div>
            <div className={s.fertDesc}>
              Dosage values follow ICAR/FAO crop nutrition guidelines. Select your farm and crop to compute exact quantities.
            </div>

            <div className={s.selectRow}>
              <div>
                <div className={s.selectLabel}>Farm Plot</div>
                <select className={s.fertSelect} value={fertFarmId} onChange={e => {
                  setFertFarmId(e.target.value);
                  setFertFieldId(''); // reset field when farm changes
                }}>
                  {farms.length > 0
                    ? farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                    : <option value="">No farms — add one first</option>
                  }
                </select>
              </div>
              {/* Field selector — populated from farm_fields table */}
              {fertFields.length > 0 && (
                <div>
                  <div className={s.selectLabel}>Specific Field</div>
                  <select className={s.fertSelect} value={fertFieldId} onChange={e => setFertFieldId(e.target.value)}>
                    <option value="">Entire Farm ({(fertFarm?.total_area || 0).toFixed(1)} acres)</option>
                    {fertFields.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.area_acres.toFixed(1)} ac)</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <div className={s.selectLabel}>Application Method</div>
                <select className={s.fertSelect} value={fertMethod} onChange={e => setFertMethod(e.target.value)}>
                  <option>Broadcasting</option>
                  <option>Banding</option>
                  <option>Foliar Spray</option>
                  <option>Fertigation</option>
                </select>
              </div>
            </div>

            <div>
              <div className={s.selectLabel} style={{ marginBottom: 8 }}>Crop Type</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {['Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Maize', 'Soybean', 'Tomato', 'Potato'].map(crop => (
                  <button
                    key={crop}
                    onClick={() => setFertCrop(crop)}
                    style={{
                      padding: '6px 16px',
                      border: '1.5px solid',
                      borderColor: fertCrop === crop ? '#10b981' : 'var(--color-border)',
                      borderRadius: 20,
                      background: fertCrop === crop ? '#f0fdf4' : 'white',
                      color: fertCrop === crop ? '#065f46' : 'var(--color-text-secondary)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {crop}
                  </button>
                ))}
              </div>
            </div>

            {/* Soil type info banner */}
            {fertFarm && (
              <div style={{ background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Soil type: <strong style={{ color: 'var(--color-text-primary)' }}>{(fertFarm.soil_type || 'Loamy').charAt(0).toUpperCase() + (fertFarm.soil_type || 'Loamy').slice(1)}</strong>
                {' '} | Area: <strong style={{ color: 'var(--color-text-primary)' }}>{area.toFixed(1)} acres</strong>
                {' '} | NPK: <strong style={{ color: '#059669' }}>{npk.n}-{npk.p}-{npk.k} mg/kg</strong>
              </div>
            )}

            <div className={s.dosageBox}>
              <div className={s.dosageTitle}>Calculated Dosages</div>
              {[
                { name: 'Urea (46-0-0)', color: '#10b981', lbs: dosage.urea, tons: ureaTons, note: 'Nitrogen source' },
                { name: 'DAP (18-46-0)',  color: '#f97316', lbs: dosage.dap,   tons: dapTons,  note: 'N+P source' },
                { name: 'MOP (0-0-60)',   color: '#6366f1', lbs: dosage.potash,tons: potashTons,note: 'Potassium source' },
              ].map(item => (
                <div key={item.name} className={s.dosageItem} data-hc-target="true">
                  <FertDot color={item.color} />
                  <div className={s.dosageInfo}>
                    <div className={s.dosageName}>{item.name}</div>
                    <div className={s.dosageSub}>{item.note} — {item.lbs} lbs/acre</div>
                  </div>
                  <div className={s.dosageTotal}>{item.tons} tons</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.5 }}>
              Values calculated using ICAR/FAO standard dosage rates. Adjust based on local soil test results.
            </div>
          </div>

          {/* Right: Shopping list */}
          <div>
            <div className={s.cardHeader} style={{ marginBottom: 16 }}>
              <div className={s.fertTitle}>Procurement List</div>
            </div>

            <div className={s.shoppingList}>
              {[
                { name: 'Urea (46-0-0) — 50 kg bag', color: '#10b981', bags: ureaBags, tons: ureaTons },
                { name: 'DAP (18-46-0) — 50 kg bag',  color: '#f97316', bags: dapBags,   tons: dapTons },
                { name: 'MOP (0-0-60) — 50 kg bag',   color: '#6366f1', bags: potashBags,tons: potashTons },
              ].map(item => (
                <div key={item.name} className={s.shoppingItem} data-hc-target="true">
                  <div className={s.shoppingIcon}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                  </div>
                  <div className={s.shoppingInfo}>
                    <div className={s.shoppingName}>{item.name}</div>
                    <div className={s.shoppingBags}>{item.bags} bags ({item.tons} tons total)</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={s.shoppingTotals}>
              <div className={s.totalsRow}>
                <span>Subtotal ({ureaBags + dapBags + potashBags} bags)</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className={s.totalsRow}>
                <span>Est. Delivery</span>
                <span>${delivery}</span>
              </div>
              <div className={`${s.totalsRow} ${s.totalsRowBold}`}>
                <span>Total Order</span>
                <span>${total}</span>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              Prices are indicative. Contact your local agri-input supplier for actual rates.
            </div>
            <button className={s.printBtn} onClick={() => window.print()}>
              Print Report
            </button>
            <button className={s.orderBtn}>Generate Purchase Order</button>
          </div>
        </div>
      )}

      {/* ======================== RESOURCES / INVENTORY ======================== */}
      {activeTab === 'resources' && <ResourceDashboard />}

      {/* ======================== ANALYTICS ======================== */}
      {activeTab === 'analytics' && <AnalyticsDashboard />}

      {/* ======================== PROFILE ======================== */}
      {activeTab === 'profile' && <ProfileTab />}

      {/* ======================== CROPSCAN AI ======================== */}
      {activeTab === 'cropscan' && <CropScanTab />}
    </div>
  );
};

export default Dashboard;

