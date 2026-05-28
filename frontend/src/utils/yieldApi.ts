import { api } from './farmApi';

export const yieldApi = {
  /** Get all yield records for the authenticated user */
  getYields: async () => {
    const { data } = await api.get('/yields');
    return data;
  },

  /** Get a single yield record by ID */
  getYield: async (id: string) => {
    const { data } = await api.get(`/yields/${id}`);
    return data;
  },

  /** Create a new yield record */
  createYield: async (yieldData: Record<string, unknown>) => {
    const { data } = await api.post('/yields', yieldData);
    return data;
  },

  /** Update an existing yield record */
  updateYield: async (id: string, yieldData: Record<string, unknown>) => {
    const { data } = await api.put(`/yields/${id}`, yieldData);
    return data;
  },

  /** Delete a yield record */
  deleteYield: async (id: string) => {
    const { data } = await api.delete(`/yields/${id}`);
    return data;
  },

  /** Get yield records for a specific crop */
  getCropYields: async (cropId: string) => {
    const { data } = await api.get(`/yields/crop/${cropId}`);
    return data;
  },

  /** Get yield records for a specific farm */
  getFarmYields: async (farmId: string) => {
    const { data } = await api.get(`/yields/farm/${farmId}`);
    return data;
  },

  /** Get yield analytics summary */
  getYieldAnalytics: async () => {
    const { data } = await api.get('/yields/analytics/summary');
    return data;
  },
};

export default yieldApi;
