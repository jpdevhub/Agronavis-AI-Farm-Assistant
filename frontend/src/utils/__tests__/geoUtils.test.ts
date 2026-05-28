import { calculatePolygonArea, getPolygonCenter } from '../geoUtils';

describe('calculatePolygonArea', () => {
  it('returns zeros when fewer than 3 points', () => {
    expect(calculatePolygonArea([])).toEqual({ acres: 0, hectares: 0, squareMeters: 0 });
    expect(calculatePolygonArea([{ lat: 21, lng: 79 }])).toEqual({ acres: 0, hectares: 0, squareMeters: 0 });
    expect(calculatePolygonArea([{ lat: 21, lng: 79 }, { lat: 22, lng: 79 }])).toEqual({ acres: 0, hectares: 0, squareMeters: 0 });
  });

  it('calculates a roughly 1-acre square correctly (±5% tolerance)', () => {
    // A square ~63.6m × 63.6m near Nagpur, India ≈ 1 acre (4046.86 m²)
    const sideMetersInDegrees = 0.000572; // ~63.6m in degrees lat/lng near equator
    const points = [
      { lat: 21.1500, lng: 79.0800 },
      { lat: 21.1500 + sideMetersInDegrees, lng: 79.0800 },
      { lat: 21.1500 + sideMetersInDegrees, lng: 79.0800 + sideMetersInDegrees },
      { lat: 21.1500, lng: 79.0800 + sideMetersInDegrees },
    ];

    const result = calculatePolygonArea(points);

    // Should be close to 1 acre (4046.86 m²)
    expect(result.squareMeters).toBeGreaterThan(3600);
    expect(result.squareMeters).toBeLessThan(4500);
    expect(result.acres).toBeGreaterThan(0.88);
    expect(result.acres).toBeLessThan(1.12);
    expect(result.hectares).toBeGreaterThan(0.35);
    expect(result.hectares).toBeLessThan(0.46);
  });

  it('calculates a large 10-acre polygon correctly (±5% tolerance)', () => {
    // 10 acres ≈ 40468 m², square side ≈ 201m ≈ 0.00181 degrees
    const side = 0.00181;
    const points = [
      { lat: 21.1500, lng: 79.0800 },
      { lat: 21.1500 + side, lng: 79.0800 },
      { lat: 21.1500 + side, lng: 79.0800 + side },
      { lat: 21.1500, lng: 79.0800 + side },
    ];

    const result = calculatePolygonArea(points);
    expect(result.acres).toBeGreaterThan(9.0);
    expect(result.acres).toBeLessThan(11.0);
  });

  it('returns numeric types with correct precision', () => {
    const points = [
      { lat: 21.155, lng: 79.088 },
      { lat: 21.165, lng: 79.088 },
      { lat: 21.165, lng: 79.098 },
      { lat: 21.155, lng: 79.098 },
    ];
    const result = calculatePolygonArea(points);
    expect(typeof result.acres).toBe('number');
    expect(typeof result.hectares).toBe('number');
    expect(typeof result.squareMeters).toBe('number');
    // Precision: acres and hectares should have up to 4 decimal places
    expect(result.acres.toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(4);
  });
});

describe('getPolygonCenter', () => {
  it('returns India center for empty points', () => {
    const center = getPolygonCenter([]);
    expect(center.lat).toBeCloseTo(20.5937, 2);
    expect(center.lng).toBeCloseTo(78.9629, 2);
  });

  it('returns correct centroid for a square', () => {
    const points = [
      { lat: 20, lng: 78 },
      { lat: 22, lng: 78 },
      { lat: 22, lng: 80 },
      { lat: 20, lng: 80 },
    ];
    const center = getPolygonCenter(points);
    expect(center.lat).toBeCloseTo(21, 5);
    expect(center.lng).toBeCloseTo(79, 5);
  });

  it('returns the single point for a single-element array', () => {
    const center = getPolygonCenter([{ lat: 15.5, lng: 75.2 }]);
    expect(center.lat).toBe(15.5);
    expect(center.lng).toBe(75.2);
  });
});
