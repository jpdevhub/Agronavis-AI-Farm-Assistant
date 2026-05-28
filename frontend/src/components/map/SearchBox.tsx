import React, { useState, useRef } from 'react';
import { searchLocation } from '../../utils/geoUtils';

interface SearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

interface SearchBoxProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function SearchBox({ onLocationSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchLocation(value);
        setResults(found);
        setShowDropdown(true);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.displayName.split(',')[0]); // show short name
    setShowDropdown(false);
    onLocationSelect(result.lat, result.lng);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1000 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '8px 12px',
        gap: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
      }}>
        {/* Search icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search your village or district..."
          value={query}
          onChange={e => handleInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') e.preventDefault(); // Prevent form submission
          }}
          style={{
            border: 'none',
            outline: 'none',
            width: '280px',
            fontSize: '14px',
            color: '#111827',
            background: 'transparent',
          }}
        />
        {loading && (
          <div style={{
            width: '14px', height: '14px', border: '2px solid #e5e7eb',
            borderTopColor: '#16a34a', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite'
          }}/>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '44px',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          maxHeight: '220px',
          overflowY: 'auto',
        }}>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : 'none',
                fontSize: '13px',
                lineHeight: '1.4',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ fontWeight: 500, color: '#111827' }}>
                {r.displayName.split(',')[0]}
              </span>
              <br/>
              <span style={{ color: '#6b7280', fontSize: '11px' }}>
                {r.displayName.split(',').slice(1, 3).join(',')}
              </span>
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}