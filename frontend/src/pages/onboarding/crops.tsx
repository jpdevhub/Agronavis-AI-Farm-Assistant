import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/context/AuthContext';
import { cropApi } from '../../utils/farmApi';
import styles from '../../styles/Onboarding.module.css';

interface CropVariety {
  id: string;
  crop_type: string;
  variety: string;
  season: string[];
  avg_yield_per_acre: number;
  growth_duration_days: number;
}

const DEFAULT_TYPES = ['Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Maize', 'Soybean', 'Tomato', 'Potato'];
const DEFAULT_VARIETIES: Record<string, string[]> = {
  Rice: ['Basmati', 'IR64', 'Jasmine'],
  Wheat: ['HD2967', 'PBW343', 'Lok1'],
  Cotton: ['Bt Cotton', 'DCH-32', 'American Cotton'],
  Sugarcane: ['Co238', 'CoC671', 'Co86032'],
  Maize: ['Pioneer', 'Hybrid', 'Sweet Corn'],
  Soybean: ['JS335', 'PS1042', 'Bragg'],
  Tomato: ['Roma', 'Cherry', 'Beefsteak'],
  Potato: ['Kufri Jyoti', 'Kufri Chandramukhi', 'Kufri Badshah'],
};

export default function CropSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const { farmId } = router.query;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cropVarieties, setCropVarieties] = useState<CropVariety[]>([]);
  const [varietiesByType, setVarietiesByType] = useState<Record<string, string[]>>(DEFAULT_VARIETIES);
  const [cropTypes, setCropTypes] = useState<string[]>(DEFAULT_TYPES);

  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    sowingDate: '',
    expectedHarvestDate: '',
    areaAllocated: '',
    season: '',
  });

  // Fetch crop varieties
  useEffect(() => {
    async function fetchCropVarieties() {
      try {
        const { data, error } = await supabase.from('crop_varieties').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          setCropVarieties(data);
          const types = Array.from(new Set(data.map((c: CropVariety) => c.crop_type)));
          setCropTypes(types);
          const byType: Record<string, string[]> = {};
          data.forEach((c: CropVariety) => {
            if (!byType[c.crop_type]) byType[c.crop_type] = [];
            byType[c.crop_type].push(c.variety);
          });
          setVarietiesByType(byType);
        }
      } catch {
        // Use defaults on failure
      }
    }
    fetchCropVarieties();
  }, []);

  // Auto-calculate harvest date
  useEffect(() => {
    if (formData.cropType && formData.variety && formData.sowingDate) {
      const selected = cropVarieties.find(
        c => c.crop_type === formData.cropType && c.variety === formData.variety
      );
      if (selected) {
        const sow = new Date(formData.sowingDate);
        const harvest = new Date(sow);
        harvest.setDate(harvest.getDate() + selected.growth_duration_days);
        setFormData(prev => ({ ...prev, expectedHarvestDate: harvest.toISOString().split('T')[0] }));
      }
    }
  }, [formData.cropType, formData.variety, formData.sowingDate, cropVarieties]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cropType') {
      setFormData(prev => ({ ...prev, cropType: value, variety: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.cropType || !formData.areaAllocated || !farmId) {
      setError('Crop type, area, and farm ID are required');
      setLoading(false);
      return;
    }

    try {
      if (!user) throw new Error('You must be logged in to add crops');
      await cropApi.createCrop({
        farm_id: farmId as string,
        crop_type: formData.cropType,
        variety: formData.variety || null,
        sowing_date: formData.sowingDate || null,
        expected_harvest_date: formData.expectedHarvestDate || null,
        area_allocated: parseFloat(formData.areaAllocated),
        season: formData.season || null,
        current_growth_stage: 'sowing',
      });
      setSuccess('Crop added successfully!');
      setFormData({ cropType: '', variety: '', sowingDate: '', expectedHarvestDate: '', areaAllocated: '', season: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to save crop');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card} data-hc-target="true">
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.headerIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12M12 12C12 6.48 7.52 2 2 2c0 5.52 4.48 10 10 10z"/>
              <path d="M12 12c0-5.52 4.48-10 10-10-0 5.52-4.48 10-10 10z"/>
            </svg>
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.cardTitle}>Crop Setup</h1>
            <p className={styles.cardSubtitle}>Step 3 of 3 — Add your current crops</p>
          </div>
        </div>

        {/* Step progress */}
        <div className={styles.stepBar}>
          <div className={`${styles.step} ${styles.stepActive}`} />
          <div className={`${styles.step} ${styles.stepActive}`} />
          <div className={`${styles.step} ${styles.stepActive}`} />
        </div>

        <div className={styles.cardBody}>
          <p className={styles.welcomeText}>
            Add crops currently growing on your farm. Harvest date is auto-calculated from variety data.
          </p>

          {error && <div className={styles.errorBox}>{error}</div>}

          {success ? (
            <div className={styles.successBox}>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>{success}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setSuccess('')}
                  style={{ flex: 1, padding: '10px', border: '1.5px solid #bbf7d0', borderRadius: 12, background: 'white', fontSize: 13, fontWeight: 600, color: '#059669', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Add Another Crop
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className={styles.submitBtn}
                  style={{ flex: 2, marginTop: 0 }}
                >
                  Go to Dashboard →
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="cropType" className={styles.label}>
                    Crop Type <span className={styles.required}>*</span>
                  </label>
                  <select id="cropType" name="cropType" value={formData.cropType} onChange={handleChange} className={styles.select} required>
                    <option value="">Select crop type</option>
                    {cropTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="variety" className={styles.label}>Variety</label>
                  <select id="variety" name="variety" value={formData.variety} onChange={handleChange} className={styles.select} disabled={!formData.cropType}>
                    <option value="">Select variety</option>
                    {formData.cropType && varietiesByType[formData.cropType]?.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="areaAllocated" className={styles.label}>
                    Area (acres) <span className={styles.required}>*</span>
                  </label>
                  <input type="number" id="areaAllocated" name="areaAllocated" value={formData.areaAllocated} onChange={handleChange} min="0.1" step="0.1" placeholder="e.g. 5.5" className={styles.input} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="season" className={styles.label}>Season</label>
                  <select id="season" name="season" value={formData.season} onChange={handleChange} className={styles.select}>
                    <option value="">Select season</option>
                    <option value="kharif">Kharif (Monsoon)</option>
                    <option value="rabi">Rabi (Winter)</option>
                    <option value="zaid">Zaid (Summer)</option>
                    <option value="perennial">Perennial</option>
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="sowingDate" className={styles.label}>Sowing Date</label>
                  <input type="date" id="sowingDate" name="sowingDate" value={formData.sowingDate} onChange={handleChange} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="expectedHarvestDate" className={styles.label}>
                    Harvest Date
                    {formData.cropType && formData.variety && formData.sowingDate && (
                      <span style={{ fontSize: 11, color: '#10b981', marginLeft: 6, fontWeight: 500 }}>auto-calculated</span>
                    )}
                  </label>
                  <input
                    type="date" id="expectedHarvestDate" name="expectedHarvestDate"
                    value={formData.expectedHarvestDate} onChange={handleChange}
                    className={styles.input}
                    readOnly={!!(formData.cropType && formData.variety && formData.sowingDate)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => router.push('/onboarding/farm')}
                  style={{ flex: 1, padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 14, background: '#f8fafc', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ← Back
                </button>
                <button type="submit" disabled={loading} className={styles.submitBtn} style={{ flex: 2, marginTop: 0 }}>
                  {loading ? 'Saving...' : 'Add Crop'}
                </button>
              </div>

              <div className={styles.skipLink}>
                <button type="button" className={styles.skipBtn} onClick={() => router.push('/dashboard')}>
                  Skip — go to dashboard
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}