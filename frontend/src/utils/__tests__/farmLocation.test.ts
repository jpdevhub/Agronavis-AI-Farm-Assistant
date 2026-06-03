import { extractFarmCoordinates } from '../farmLocation';

describe('extractFarmCoordinates', () => {
  it('uses polygon center coordinates when available', () => {
    expect(
      extractFarmCoordinates({
        location: {
          center_latitude: 22.5,
          center_longitude: 88.3,
        },
      })
    ).toEqual({ latitude: 22.5, longitude: 88.3 });
  });

  it('falls back to farm-level latitude and longitude', () => {
    expect(
      extractFarmCoordinates({
        latitude: 19.07,
        longitude: 72.87,
      })
    ).toEqual({ latitude: 19.07, longitude: 72.87 });
  });

  it('returns null when coordinates are missing', () => {
    expect(extractFarmCoordinates({})).toBeNull();
    expect(extractFarmCoordinates(null)).toBeNull();
  });
});
