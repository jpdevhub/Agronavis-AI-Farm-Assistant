import { api } from './farmApi';

export const soilHealthApi = {
  /** Get all soil health records for the authenticated user */
  getSoilHealthRecords: async () => {
    const { data } = await api.get('/soil-health');
    return data;
  },

  /** Get a single soil health record by ID */
  getSoilHealth: async (id: string) => {
    const { data } = await api.get(`/soil-health/${id}`);
    return data;
  },

  /** Create a new soil health record */
  createSoilHealth: async (recordData: Record<string, unknown>) => {
    const { data } = await api.post('/soil-health', recordData);
    return data;
  },

  /** Update an existing soil health record */
  updateSoilHealth: async (id: string, recordData: Record<string, unknown>) => {
    const { data } = await api.put(`/soil-health/${id}`, recordData);
    return data;
  },

  /** Delete a soil health record */
  deleteSoilHealth: async (id: string) => {
    const { data } = await api.delete(`/soil-health/${id}`);
    return data;
  },

  /** Get all soil health records for a specific farm */
  getFarmSoilHealth: async (farmId: string) => {
    const { data } = await api.get(`/soil-health/farm/${farmId}`);
    return data;
  },

  /** Get latest soil health record for a farm */
  getLatestSoilHealth: async (farmId: string) => {
    const { data } = await api.get(`/soil-health/farm/${farmId}/latest`);
    return data;
  },

  /** Get soil health trends for a farm */
  getSoilHealthTrends: async (farmId: string) => {
    const { data } = await api.get(`/soil-health/analytics/trends/${farmId}`);
    return data;
  },

  /** Get soil health analytics summary */
  getSoilHealthAnalytics: async () => {
    const { data } = await api.get('/soil-health/analytics/summary');
    return data;
  },
};

export default soilHealthApi;
