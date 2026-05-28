import React, { useState, useEffect, useCallback } from 'react';
import styles from '../styles/ResourceDashboard.module.css';
import { resourceApi } from '../utils/resourceApi';
import { farmApi } from '../utils/farmApi';

interface Resource {
  id: string;
  name: string;
  resource_type: string;
  quantity: number;
  unit: string;
  condition?: string;
  farm_id?: string;
  notes?: string;
}

interface Farm {
  id: string;
  name: string;
}

const RESOURCE_TYPES = ['all', 'seeds', 'fertilizer', 'equipment', 'water', 'pesticide', 'other'];

// SVG icon per resource type — no emojis
const RESOURCE_SVG: Record<string, React.ReactNode> = {
  seeds: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12M12 12C12 6.48 7.52 2 2 2c0 5.52 4.48 10 10 10z"/>
      <path d="M12 12c0-5.52 4.48-10 10-10-0 5.52-4.48 10-10 10z"/>
    </svg>
  ),
  fertilizer: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
    </svg>
  ),
  equipment: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  water: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
    </svg>
  ),
  pesticide: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  other: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
};

const RESOURCE_ICON_CLASSES: Record<string, string> = {
  seeds: 'iconSeeds',
  fertilizer: 'iconFertilizer',
  equipment: 'iconEquipment',
  water: 'iconWater',
  pesticide: 'iconPesticide',
  other: 'iconOther',
};

const CONDITION_CLASSES: Record<string, string> = {
  good: 'badgeGood',
  fair: 'badgeFair',
  poor: 'badgePoor',
  'low stock': 'badgeLow',
};

const ResourceDashboard: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    resource_type: 'seeds',
    quantity: '',
    unit: '',
    condition: 'good',
    farm_id: '',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resourcesData, farmsData] = await Promise.all([
        resourceApi.getResources(),
        farmApi.getFarms(),
      ]);
      setResources(Array.isArray(resourcesData) ? resourcesData : resourcesData?.data || []);
      setFarms(farmsData || []);
      // Default farm_id to first farm
      if (farmsData?.length > 0) {
        setForm(f => ({ ...f, farm_id: farmsData[0].id }));
      }
    } catch (err) {
      console.error('Error loading resources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredResources = activeFilter === 'all'
    ? resources
    : resources.filter(r => r.resource_type === activeFilter);

  const totalItems = resources.length;
  const goodCount = resources.filter(r => r.condition === 'good').length;
  const lowCount = resources.filter(r => r.condition === 'low stock' || r.condition === 'poor').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.quantity || !form.unit) return;
    setSaving(true);
    try {
      await resourceApi.createResource({
        ...form,
        quantity: parseFloat(form.quantity),
      });
      setShowModal(false);
      setForm(f => ({ ...f, name: '', quantity: '', unit: '', notes: '' }));
      await loadData();
    } catch (err) {
      console.error('Error saving resource:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Inventory</h2>
          <p className={styles.pageSubtitle}>Track your farm resources</p>
        </div>
        <div className={styles.loadingContainer}>
          {[80, 80, 80, 60].map((h, i) => (
            <div key={i} className={styles.skeletonCard} style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <h2 className={styles.pageTitle}>Inventory</h2>
        <p className={styles.pageSubtitle}>Track seeds, equipment & supplies</p>
      </div>

      {/* Summary Row */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{totalItems}</div>
          <div className={styles.summaryLabel}>Total Items</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.warning}`}>
          <div className={styles.summaryValue}>{goodCount}</div>
          <div className={styles.summaryLabel}>Good Cond.</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.danger}`}>
          <div className={styles.summaryValue}>{lowCount}</div>
          <div className={styles.summaryLabel}>Needs Attention</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className={styles.categoryFilter}>
        {RESOURCE_TYPES.map(type => (
          <button
            key={type}
            className={`${styles.filterChip} ${activeFilter === type ? styles.filterChipActive : ''}`}
            onClick={() => setActiveFilter(type)}
          >
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Resource List */}
      <div className={styles.resourceList}>
        {filteredResources.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>No resources yet</h3>
            <p className={styles.emptyText}>
              {activeFilter === 'all'
                ? 'Tap + to log your first resource like seeds, fertilizer, or equipment.'
                : `No ${activeFilter} found. Tap + to add one.`}
            </p>
          </div>
        ) : (
          filteredResources.map(resource => {
            const iconClass = styles[RESOURCE_ICON_CLASSES[resource.resource_type] || 'iconOther'];
            const conditionClass = styles[CONDITION_CLASSES[resource.condition || ''] || 'badgeGood'];
            return (
              <div key={resource.id} className={styles.resourceCard}>
                <div className={`${styles.resourceIcon} ${iconClass}`}>
                  {RESOURCE_SVG[resource.resource_type] || RESOURCE_SVG.other}
                </div>
                <div className={styles.resourceInfo}>
                  <div className={styles.resourceName}>{resource.name}</div>
                  <div className={styles.resourceType}>{resource.resource_type}</div>
                </div>
                <div className={styles.resourceMeta}>
                  <div className={styles.resourceQty}>
                    {resource.quantity}
                    <span className={styles.resourceQtyUnit}> {resource.unit}</span>
                  </div>
                  {resource.condition && (
                    <span className={`${styles.conditionBadge} ${conditionClass}`}>
                      {resource.condition}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <button className={styles.fab} onClick={() => setShowModal(true)} aria-label="Add resource">
        +
      </button>

      {/* Add Resource Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className={styles.modalSheet}>
            <h3 className={styles.modalTitle}>
              Add Resource
              <button className={styles.modalCloseBtn} type="button" onClick={() => setShowModal(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Resource Name <span style={{ color: '#e11d48' }}>*</span></label>
                  <input
                    className={styles.formInput}
                    placeholder="e.g. Urea Fertilizer, Paddy Seeds"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Type <span style={{ color: '#e11d48' }}>*</span></label>
                  <select
                    className={styles.formSelect}
                    value={form.resource_type}
                    onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}
                  >
                    {RESOURCE_TYPES.filter(t => t !== 'all').map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Quantity <span style={{ color: '#e11d48' }}>*</span></label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g. 50"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Unit <span style={{ color: '#e11d48' }}>*</span></label>
                  <select
                    className={styles.formSelect}
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  >
                    <option value="">Select unit</option>
                    <option value="kg">kg</option>
                    <option value="L">L (litres)</option>
                    <option value="bags">bags</option>
                    <option value="tons">tons</option>
                    <option value="units">units</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Condition</label>
                  <select
                    className={styles.formSelect}
                    value={form.condition}
                    onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                  >
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor / Needs Repair</option>
                    <option value="low stock">Low Stock</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Assign to Farm</label>
                  <select
                    className={styles.formSelect}
                    value={form.farm_id}
                    onChange={e => setForm(f => ({ ...f, farm_id: e.target.value }))}
                  >
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes (optional)</label>
                <input
                  className={styles.formInput}
                  placeholder="Supplier, purchase date, batch number..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: 13,
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    background: '#f8fafc',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
                <button className={styles.submitButton} type="submit" disabled={saving} style={{ flex: 2 }}>
                  {saving ? 'Saving...' : 'Save Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResourceDashboard;
