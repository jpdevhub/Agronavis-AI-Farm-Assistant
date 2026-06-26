import localforage from 'localforage';

jest.mock('localforage', () => {
  const mockSetItemInternal = jest.fn();
  const mockGetItemInternal = jest.fn();
  return {
    __mockSetItem: mockSetItemInternal,
    __mockGetItem: mockGetItemInternal,
    createInstance: jest.fn(() => ({
      setItem: mockSetItemInternal,
      getItem: mockGetItemInternal,
    })),
  };
});

import { saveRecommendation, getLatestRecommendation, getRecommendationHistory } from './offlineStorage';

describe('offlineStorage', () => {
  const farmId = 'farm-123';
  const mockData = { test: 'data' };
  const IDB = (localforage as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saves recommendation and prepends to history', async () => {
    IDB.__mockGetItem.mockResolvedValueOnce([]); // No existing history

    const result = await saveRecommendation(farmId, mockData);

    expect(result.farmId).toBe(farmId);
    expect(result.data).toBe(mockData);
    expect(IDB.__mockSetItem).toHaveBeenCalledWith(farmId, [result]);
  });

  it('gets latest recommendation', async () => {
    const mockHistory = [
      { id: '1', farmId, timestamp: 2000, data: { test: 'newer' } },
      { id: '2', farmId, timestamp: 1000, data: { test: 'older' } },
    ];
    IDB.__mockGetItem.mockResolvedValueOnce(mockHistory);

    const latest = await getLatestRecommendation(farmId);
    expect(latest).toEqual(mockHistory[0]);
  });

  it('returns null if no history exists', async () => {
    IDB.__mockGetItem.mockResolvedValueOnce(null);

    const latest = await getLatestRecommendation(farmId);
    expect(latest).toBeNull();
  });

  it('gets recommendation history', async () => {
    const mockHistory = [{ id: '1', farmId, timestamp: 1000, data: {} }];
    IDB.__mockGetItem.mockResolvedValueOnce(mockHistory);

    const history = await getRecommendationHistory(farmId);
    expect(history).toEqual(mockHistory);
  });
});
