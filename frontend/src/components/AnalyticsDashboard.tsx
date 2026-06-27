import React, { useState, useEffect, useCallback } from 'react';
import styles from '../styles/AnalyticsDashboard.module.css';
import { yieldApi } from '../utils/yieldApi';
import { soilHealthApi } from '../utils/soilHealthApi';
import { farmApi } from '../utils/farmApi';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipYear}>{label}</p>
        <p className={styles.tooltipYield}>
          Yield: <span className={styles.tooltipValue}>{payload[0].value}</span>{' '}
          <span className={styles.tooltipUnit}>{payload[0].payload.unit}</span>
        </p>
      </div>
    );
  }
  return null;
};


interface YieldRecord {
  id: string;
  crop_type: string;
  variety?: string;
  quantity: number;
  unit: string;
  year: number;
  season?: string;
  farm_id: string;
}

interface SoilHealth {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  ph: number;
  tested_date?: string;
  farm_id: string;
}

interface Farm {
  id: string;
  name: string;
}

const CROP_ICONS: Record<string, string> = {
  rice: '🌾', wheat: '🌾', maize: '🌽', cotton: '🌿',
  sugarcane: '🎋', soybean: '🫘', potato: '🥔', tomato: '🍅',
  onion: '🧅', mustard: '🌻', default: '🌱',
};

const getCropIcon = (cropType: string) =>
  CROP_ICONS[cropType?.toLowerCase()] || CROP_ICONS.default;

const SEASONS = ['Kharif', 'Rabi', 'Zaid', 'Summer', 'Winter', 'Year-round'];
const UNITS = ['kg', 'quintal', 'ton', 'bags', 'litre'];

const convertUnit = (qty: number, fromUnit: string, toUnit: string): number => {
  const from = (fromUnit || 'quintal').trim().toLowerCase();
  const to = (toUnit || 'quintal').trim().toLowerCase();
  if (from === to) return qty;

  const toKgFactor: Record<string, number> = {
    kg: 1,
    quintal: 100,
    ton: 1000,
    bags: 50, // assume 50kg per bag
    litre: 1, // approximate 1l = 1kg
  };

  const fromFactor = toKgFactor[from] || 1;
  const toFactor = toKgFactor[to] || 1;

  return (qty * fromFactor) / toFactor;
};

const AnalyticsDashboard: React.FC = () => {
  const [yields, setYields] = useState<YieldRecord[]>([]);
  const [soilRecords, setSoilRecords] = useState<SoilHealth[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedCrop, setSelectedCrop] = useState<string>('');

  // Extract unique crop types from the yield records
  const availableCrops = React.useMemo(() => {
    const cropsSet = new Set<string>();
    yields.forEach(r => {
      if (r.crop_type) {
        const name = r.crop_type.trim();
        if (name) {
          const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
          cropsSet.add(normalized);
        }
      }
    });
    return Array.from(cropsSet);
  }, [yields]);

  // Set default crop type when availableCrops loads or changes
  useEffect(() => {
    if (availableCrops.length > 0) {
      if (!selectedCrop || !availableCrops.some(c => c.toLowerCase() === selectedCrop.toLowerCase())) {
        setSelectedCrop(availableCrops[0]);
      }
    } else {
      setSelectedCrop('');
    }
  }, [availableCrops, selectedCrop]);

  // Process data for Recharts LineChart
  const processedChartData = React.useMemo(() => {
    if (!selectedCrop) return [];

    const filtered = yields.filter(
      r => r.crop_type && r.crop_type.trim().toLowerCase() === selectedCrop.toLowerCase()
    );

    const groupedByYear: Record<number, { quantity: number; unit: string }> = {};
    filtered.forEach(r => {
      const yr = r.year;
      const unit = r.unit || 'quintal';
      if (!groupedByYear[yr]) {
        groupedByYear[yr] = { quantity: 0, unit };
      }
      const convertedQuantity = convertUnit(r.quantity || 0, unit, groupedByYear[yr].unit);
      groupedByYear[yr].quantity += convertedQuantity;
    });

    return Object.entries(groupedByYear)
      .map(([year, data]) => ({
        year: parseInt(year),
        quantity: Number(data.quantity.toFixed(2)),
        unit: data.unit,
      }))
      .sort((a, b) => a.year - b.year);
  }, [yields, selectedCrop]);

  const currentYear = new Date().getFullYear();

  const [yieldForm, setYieldForm] = useState({
    crop_type: '',
    variety: '',
    quantity: '',
    unit: 'quintal',
    year: String(currentYear),
    season: 'Kharif',
    farm_id: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [yieldData, farmsData] = await Promise.all([
        yieldApi.getYields(),
        farmApi.getFarms(),
      ]);

      const yieldsArr = Array.isArray(yieldData) ? yieldData : yieldData?.data || [];
      setYields(yieldsArr);
      setFarms(farmsData || []);

      if (farmsData?.length > 0) {
        setYieldForm(f => ({ ...f, farm_id: farmsData[0].id }));
        // Load soil health for first farm
        try {
          const soil = await soilHealthApi.getFarmSoilHealth(farmsData[0].id);
          setSoilRecords(Array.isArray(soil) ? soil : soil?.data ? [soil.data] : []);
        } catch {
          setSoilRecords([]);
        }
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Analytics
  const totalYield = yields.reduce((s, r) => s + (r.quantity || 0), 0);
  const uniqueCrops = new Set(yields.map(r => r.crop_type)).size;
  const latestYear = yields.length ? Math.max(...yields.map(r => r.year)) : currentYear;
  const thisYearYield = yields.filter(r => r.year === latestYear).reduce((s, r) => s + r.quantity, 0);

  const latestSoil = soilRecords[soilRecords.length - 1];

  const handleYieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yieldForm.crop_type || !yieldForm.quantity) return;
    setSaving(true);
    try {
      await yieldApi.createYield({
        ...yieldForm,
        quantity: parseFloat(yieldForm.quantity),
        year: parseInt(yieldForm.year),
      });
      setShowYieldModal(false);
      setYieldForm(f => ({ ...f, crop_type: '', variety: '', quantity: '' }));
      await loadData();
    } catch (err) {
      console.error('Error saving yield:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Analytics</h2>
          <p className={styles.pageSubtitle}>Loading farm data...</p>
        </div>
        <div className={styles.loadingContainer}>
          <div className={`${styles.skeletonCard} ${styles.h60}`} />
          <div className={`${styles.skeletonCard} ${styles.h80}`} />
          <div className={`${styles.skeletonCard} ${styles.h100}`} />
          <div className={`${styles.skeletonCard} ${styles.h80}`} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Analytics</h2>
        <p className={styles.pageSubtitle}>Yield history & soil health trends</p>
      </div>

      {/* ─── Yield Section ─────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span className={`${styles.sectionTitleIcon} ${styles.green}`}>🌾</span>
            Yield History
          </h3>
          <button className={styles.sectionAction} onClick={() => setShowYieldModal(true)}>
            + Log Harvest
          </button>
        </div>

        {/* Stat Cards */}
        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📊</div>
            <div className={styles.statValue}>{yields.length}</div>
            <div className={styles.statLabel}>Total Records</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🌱</div>
            <div className={styles.statValue}>{uniqueCrops}</div>
            <div className={styles.statLabel}>Crop Types</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📅</div>
            <div className={styles.statValue}>{thisYearYield}</div>
            <div className={styles.statLabel}>{latestYear} Yield</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>⚖️</div>
            <div className={styles.statValue}>{totalYield}</div>
            <div className={styles.statLabel}>Total Yield</div>
          </div>
        </div>

        {/* YoY Yield Trend Line Chart */}
        {yields.length > 0 && availableCrops.length > 0 && (
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h4 className={styles.chartTitle}>YoY Yield Trend</h4>
              <select
                className={styles.cropSelect}
                aria-label="Select crop for YoY yield trend"
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
              >
                {availableCrops.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processedChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="year" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="quantity"
                    stroke="#10b981"
                    strokeWidth={3}
                    activeDot={{ r: 6 }}
                    dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Yield Records */}
        {yields.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🌾</div>
            <h4 className={styles.emptyTitle}>No harvest records</h4>
            <p className={styles.emptyText}>Log your first harvest to track yield trends over time.</p>
            <button className={styles.addButton} onClick={() => setShowYieldModal(true)}>
              Log First Harvest
            </button>
          </div>
        ) : (
          <div className={styles.yieldList}>
            {yields.slice(0, 8).map(record => (
              <div key={record.id} className={styles.yieldCard}>
                <div className={styles.yieldCardIcon}>
                  {getCropIcon(record.crop_type)}
                </div>
                <div className={styles.yieldCardInfo}>
                  <div className={styles.yieldCropName}>
                    {record.crop_type}
                    {record.variety ? ` · ${record.variety}` : ''}
                  </div>
                  <div className={styles.yieldMeta}>
                    {record.season ? `${record.season} ` : ''}{record.year}
                  </div>
                </div>
                <div className={styles.yieldQty}>
                  <div className={styles.yieldQtyValue}>{record.quantity}</div>
                  <div className={styles.yieldQtyUnit}>{record.unit}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.divider} />

      {/* ─── Soil Health Section ────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <span className={`${styles.sectionTitleIcon} ${styles.blue}`}>🧪</span>
            Soil Health
          </h3>
        </div>

        {!latestSoil ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🌍</div>
            <h4 className={styles.emptyTitle}>No soil data yet</h4>
            <p className={styles.emptyText}>
              Draw your farm boundary on the Map tab to automatically analyze regional soil data.
            </p>
          </div>
        ) : (
          <div className={styles.soilGrid}>
            {/* Nitrogen */}
            <div className={styles.soilCard}>
              <div className={styles.soilCardHeader}>
                <span className={styles.soilLabel}>Nitrogen (N)</span>
                <span className={styles.soilValue}>
                  {latestSoil.nitrogen}<small className={styles.soilUnit}> kg/ac</small>
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${styles.fillN}`}
                  style={{ width: `${Math.min((latestSoil.nitrogen / 250) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Phosphorus */}
            <div className={styles.soilCard}>
              <div className={styles.soilCardHeader}>
                <span className={styles.soilLabel}>Phosphorus (P)</span>
                <span className={styles.soilValue}>
                  {latestSoil.phosphorus}<small className={styles.soilUnit}> kg/ac</small>
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${styles.fillP}`}
                  style={{ width: `${Math.min((latestSoil.phosphorus / 30) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Potassium */}
            <div className={styles.soilCard}>
              <div className={styles.soilCardHeader}>
                <span className={styles.soilLabel}>Potassium (K)</span>
                <span className={styles.soilValue}>
                  {latestSoil.potassium}<small className={styles.soilUnit}> kg/ac</small>
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${styles.fillK}`}
                  style={{ width: `${Math.min((latestSoil.potassium / 150) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* pH */}
            <div className={styles.soilCard}>
              <div className={styles.soilCardHeader}>
                <span className={styles.soilLabel}>Soil pH</span>
                <span className={styles.soilValue}>{latestSoil.ph}</span>
              </div>
              <div className={styles.phBar}>
                <div
                  className={styles.phIndicator}
                  style={{ left: `${Math.min(Math.max((latestSoil.ph - 4) / 6 * 100, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAB for Yield */}
      <button className={styles.fab} onClick={() => setShowYieldModal(true)} aria-label="Log harvest">
        +
      </button>

      {/* Log Yield Modal */}
      {showYieldModal && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowYieldModal(false)}>
          <div className={styles.modalSheet}>
            <div className={styles.modalHandle} />
            <h3 className={styles.modalTitle}>Log Harvest</h3>
            <form onSubmit={handleYieldSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Crop Type</label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. Rice, Wheat, Cotton"
                  value={yieldForm.crop_type}
                  onChange={e => setYieldForm(f => ({ ...f, crop_type: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Variety (optional)</label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. Basmati, HYV"
                  value={yieldForm.variety}
                  onChange={e => setYieldForm(f => ({ ...f, variety: e.target.value }))}
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Quantity</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    placeholder="200"
                    value={yieldForm.quantity}
                    onChange={e => setYieldForm(f => ({ ...f, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Unit</label>
                  <select
                    className={styles.formSelect}
                    value={yieldForm.unit}
                    onChange={e => setYieldForm(f => ({ ...f, unit: e.target.value }))}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Season</label>
                  <select
                    className={styles.formSelect}
                    value={yieldForm.season}
                    onChange={e => setYieldForm(f => ({ ...f, season: e.target.value }))}
                  >
                    {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Year</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    value={yieldForm.year}
                    onChange={e => setYieldForm(f => ({ ...f, year: e.target.value }))}
                    min="2000"
                    max={currentYear + 1}
                  />
                </div>
              </div>
              {farms.length > 1 && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Farm</label>
                  <select
                    className={styles.formSelect}
                    value={yieldForm.farm_id}
                    onChange={e => setYieldForm(f => ({ ...f, farm_id: e.target.value }))}
                  >
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button className={styles.submitButton} type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Harvest Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
