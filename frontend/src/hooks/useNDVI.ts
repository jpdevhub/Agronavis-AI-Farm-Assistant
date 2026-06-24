import { useState, useCallback } from 'react';
import { api } from '../utils/farmApi';

interface NDVIData {
  farm_id: string;
  date_from: string;
  date_to: string;
  bbox: number[];
  ndvi_min: number;
  ndvi_max: number;
  ndvi_mean: number;
  resolution: number;
}

const useNDVI = (farmId: string) => {
  const [ndviData, setNdviData] = useState<NDVIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNDVI = useCallback(async (dateFrom?: string, dateTo?: string) => {
    if (!farmId) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { farm_id: farmId };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get('/ndvi', { params });
      setNdviData(data.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch NDVI data');
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  return { ndviData, loading, error, fetchNDVI };
};

export default useNDVI;
