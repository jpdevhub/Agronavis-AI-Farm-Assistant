import React from 'react';

interface NDVILegendProps {
  ndviMean?: number;
}

const NDVILegend: React.FC<NDVILegendProps> = ({ ndviMean }) => {
  const getHealthLabel = (mean: number) => {
    if (mean >= 0.6) return { label: 'Healthy Vegetation', color: '#16a34a' };
    if (mean >= 0.4) return { label: 'Moderate Vegetation', color: '#ca8a04' };
    if (mean >= 0.2) return { label: 'Sparse Vegetation', color: '#ea580c' };
    return { label: 'Water Stress / Bare Soil', color: '#dc2626' };
  };

  const health = ndviMean !== undefined ? getHealthLabel(ndviMean) : null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      right: '10px',
      zIndex: 1000,
      background: 'white',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      minWidth: '160px',
    }}>
      <p style={{ fontWeight: 600, fontSize: '12px', marginBottom: '8px', color: '#374151' }}>
        NDVI Legend
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {[
          { color: '#16a34a', label: 'Healthy (=0.6)' },
          { color: '#ca8a04', label: 'Moderate (0.4–0.6)' },
          { color: '#ea580c', label: 'Sparse (0.2–0.4)' },
          { color: '#dc2626', label: 'Stress (<0.2)' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{item.label}</span>
          </div>
        ))}
      </div>
      {health && ndviMean !== undefined && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Farm Average</p>
          <p style={{ fontSize: '12px', fontWeight: 600, color: health.color }}>
            {ndviMean.toFixed(2)} — {health.label}
          </p>
        </div>
      )}
    </div>
  );
};

export default NDVILegend;
