import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../auth/context/AuthContext';
import { farmApi } from '../../utils/farmApi';
import { useFormState } from '../../hooks/useFormState';
import { useLocation } from '../../hooks/useLocation';
import styles from '../../styles/Onboarding.module.css';

export default function FarmSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const { farmId, hasBoundary } = router.query as { farmId?: string; hasBoundary?: string };
  const { loading, error, success, setLoading, setError, setSuccess } = useFormState();
  const { locationStatus, getCurrentLocation } = useLocation();

  const [formData, setFormData] = useState({
    farmName: '',
    address: '',
    soilType: '',
    irrigationType: '',
    ownershipType: '',
    state: '',
    district: '',
    village: '',
    latitude: '',
    longitude: '',
    useCurrentLocation: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (name === 'useCurrentLocation' && val === true) {
      getCurrentLocation(handleLocationSuccess);
    }
  };

  const handleLocationSuccess = (location: { latitude: string; longitude: string }) => {
    setFormData(prev => ({ ...prev, latitude: location.latitude, longitude: location.longitude }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.farmName) {
      setError('Farm name is required');
      setLoading(false);
      return;
    }

    try {
      if (!user) throw new Error('You must be logged in to create a farm');

      const farmPayload: any = {
        name: formData.farmName,
        total_area: 0,
        address: formData.address || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        location: {
          state: formData.state || null,
          district: formData.district || null,
          village: formData.village || null,
          coordinates_source: formData.useCurrentLocation ? 'gps' : 'manual',
        },
        soil_type: formData.soilType || null,
        irrigation_type: formData.irrigationType || null,
        ownership_type: formData.ownershipType || null,
      };

      const newFarm = await farmApi.createFarm(farmPayload);
      setSuccess('Farm saved! Redirecting to map...');
      setTimeout(() => router.push(`/dashboard?mode=draw&farmId=${newFarm.id}`), 1200);
    } catch (err: any) {
      console.error('Error saving farm:', err);
      setError(err.message || 'Failed to save farm information');
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
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.cardTitle}>Farm Setup</h1>
            <p className={styles.cardSubtitle}>Step 2 of 3 — Tell us about your farm</p>
          </div>
        </div>

        {/* Step progress */}
        <div className={styles.stepBar}>
          <div className={`${styles.step} ${styles.stepActive}`} />
          <div className={`${styles.step} ${styles.stepActive}`} />
          <div className={styles.step} />
        </div>

        <div className={styles.cardBody}>
          <p className={styles.welcomeText}>
            Let&apos;s set up your primary farm. Area will be auto-calculated when you draw the boundary on the map.
          </p>

          {error && <div className={styles.errorBox}>{error}</div>}
          {success && <div className={styles.successBox}>{success}</div>}

          <form onSubmit={handleSubmit}>
            {/* Farm Name */}
            <div className={styles.formGroup}>
              <label htmlFor="farmName" className={styles.label}>
                Farm Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text" id="farmName" name="farmName"
                value={formData.farmName} onChange={handleChange}
                placeholder="e.g. Green Valley Farm"
                className={styles.input} required
              />
            </div>

            {/* Area callout */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#065f46', margin: '0 0 2px' }}>Area auto-calculated</p>
                <p style={{ fontSize: 12, color: '#047857', margin: 0 }}>Draw your field boundary on the Map tab — we&apos;ll calculate exact acres &amp; hectares.</p>
              </div>
            </div>

            {/* Address */}
            <div className={styles.formGroup}>
              <label htmlFor="address" className={styles.label}>Address</label>
              <textarea
                id="address" name="address"
                value={formData.address} onChange={handleChange as any}
                rows={2} placeholder="Village, Taluka, District"
                className={styles.input}
                style={{ resize: 'none', lineHeight: 1.5 }}
              />
            </div>

            {/* State / District / Village */}
            <div className={styles.formRow} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className={styles.formGroup}>
                <label htmlFor="state" className={styles.label}>State</label>
                <input type="text" id="state" name="state" value={formData.state} onChange={handleChange} placeholder="Maharashtra" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="district" className={styles.label}>District</label>
                <input type="text" id="district" name="district" value={formData.district} onChange={handleChange} placeholder="Pune" className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="village" className={styles.label}>Village</label>
                <input type="text" id="village" name="village" value={formData.village} onChange={handleChange} placeholder="Village" className={styles.input} />
              </div>
            </div>

            {/* Location */}
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Farm Location
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', marginBottom: 10, cursor: 'pointer' }}>
                <input
                  id="useCurrentLocation" name="useCurrentLocation" type="checkbox"
                  checked={formData.useCurrentLocation} onChange={handleChange}
                  style={{ width: 16, height: 16, accentColor: '#10b981' }}
                />
                Use my current location
              </label>
              {locationStatus.fetching && <p style={{ fontSize: 12, color: '#2563eb' }}>Getting your location...</p>}
              {locationStatus.error && <p style={{ fontSize: 12, color: '#e11d48' }}>{locationStatus.error}</p>}
              {locationStatus.success && <p style={{ fontSize: 12, color: '#059669' }}>Location retrieved!</p>}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="latitude" className={styles.label}>Latitude</label>
                  <input type="text" id="latitude" name="latitude" value={formData.latitude} onChange={handleChange} placeholder="18.5204" className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="longitude" className={styles.label}>Longitude</label>
                  <input type="text" id="longitude" name="longitude" value={formData.longitude} onChange={handleChange} placeholder="73.8567" className={styles.input} />
                </div>
              </div>
            </div>

            {/* Soil / Irrigation */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="soilType" className={styles.label}>Soil Type</label>
                <select id="soilType" name="soilType" value={formData.soilType} onChange={handleChange} className={styles.select}>
                  <option value="">Select</option>
                  <option value="sandy">Sandy</option>
                  <option value="clay">Clay</option>
                  <option value="loamy">Loamy</option>
                  <option value="silt">Silt</option>
                  <option value="peaty">Peaty</option>
                  <option value="chalky">Chalky</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="irrigationType" className={styles.label}>Irrigation</label>
                <select id="irrigationType" name="irrigationType" value={formData.irrigationType} onChange={handleChange} className={styles.select}>
                  <option value="">Select</option>
                  <option value="drip">Drip</option>
                  <option value="sprinkler">Sprinkler</option>
                  <option value="flood">Flood</option>
                  <option value="rainfed">Rainfed</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            {/* Ownership */}
            <div className={styles.formGroup}>
              <label htmlFor="ownershipType" className={styles.label}>Ownership</label>
              <select id="ownershipType" name="ownershipType" value={formData.ownershipType} onChange={handleChange} className={styles.select}>
                <option value="">Select ownership type</option>
                <option value="owned">Owned</option>
                <option value="leased">Leased</option>
                <option value="shared">Shared</option>
              </select>
            </div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => router.push('/onboarding/profile')}
                style={{ flex: 1, padding: 12, border: '1.5px solid #e2e8f0', borderRadius: 14, background: '#f8fafc', fontSize: 14, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ← Back
              </button>
              <button type="submit" disabled={loading} className={styles.submitBtn} style={{ flex: 2, marginTop: 0 }}>
                {loading ? 'Saving...' : 'Save Farm →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}