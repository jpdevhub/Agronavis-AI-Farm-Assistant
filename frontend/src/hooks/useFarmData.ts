import { useEffect, useState } from 'react';
import { farmApi } from '../utils/farmApi';

interface FarmData {
  id: string;
  name: string;
  total_area?: number;
  location?: Record<string, unknown>;
}

const useFarmData = () => {
    const [farmData, setFarmData] = useState<FarmData[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getFarmData = async () => {
            try {
                const data = await farmApi.getFarms();
                setFarmData(data);
            } catch (err) {
                setError('Failed to fetch farm data');
            } finally {
                setLoading(false);
            }
        };

        getFarmData();
    }, []);

    return { farmData, loading, error };
};

export default useFarmData;