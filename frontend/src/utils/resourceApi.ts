import { api } from './farmApi';

export const resourceApi = {
  /** Get all resources for the authenticated user */
  getResources: async () => {
    const { data } = await api.get('/resources');
    return data;
  },

  /** Get a single resource by ID */
  getResource: async (id: string) => {
    const { data } = await api.get(`/resources/${id}`);
    return data;
  },

  /** Create a new resource */
  createResource: async (resourceData: Record<string, unknown>) => {
    const { data } = await api.post('/resources', resourceData);
    return data;
  },

  /** Update an existing resource */
  updateResource: async (id: string, resourceData: Record<string, unknown>) => {
    const { data } = await api.put(`/resources/${id}`, resourceData);
    return data;
  },

  /** Delete a resource */
  deleteResource: async (id: string) => {
    const { data } = await api.delete(`/resources/${id}`);
    return data;
  },

  /** Get resources by category */
  getResourcesByCategory: async (category: string) => {
    const { data } = await api.get(`/resources/category/${category}`);
    return data;
  },

  /** Get resources for a specific farm */
  getFarmResources: async (farmId: string) => {
    const { data } = await api.get(`/resources/farm/${farmId}`);
    return data;
  },
};

export default resourceApi;
