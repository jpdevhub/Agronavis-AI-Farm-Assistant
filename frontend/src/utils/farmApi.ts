/**
 * API Client — Frontend
 *
 * Single axios instance with auth interceptor.
 * All API calls to the Express backend go through this file.
 *
 * Architecture: Frontend → Express Backend → Supabase
 * (Frontend uses Supabase JS SDK ONLY for auth session management)
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';
import { getOfflineFarms, saveOfflineFarms, getOfflineFields, saveOfflineFields } from '../lib/offlineStorage';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// Shared axios instance — exported so other services (soilService, profileApi, etc.) reuse it.
export const api = axios.create({ baseURL: BASE_URL });

// Attach the Supabase JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${session.access_token}`);
    } else {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return config;
});

// ─── Farm API ─────────────────────────────────────────────────────────────────

export const farmApi = {
  /** Get all farms for the authenticated user */
  getFarms: async () => {
    try {
      const { data } = await api.get('/farms');
      if (data && data.data) {
        await saveOfflineFarms(data.data);
      }
      return data.data;
    } catch (error) {
      console.warn('getFarms: Network request failed, falling back to offline storage:', error instanceof Error ? error.message : error);
      const cached = await getOfflineFarms();
      if (cached) {
        return cached;
      }
      throw error;
    }
  },

  /** Get farm summary list */
  getFarmsSummary: async () => {
    const { data } = await api.get('/farms/summary');
    return data.data;
  },

  /** Get a single farm by ID */
  getFarm: async (id: string) => {
    const { data } = await api.get(`/farms/${id}`);
    return data.data;
  },

  /** Get farm with full detail (crops, soil, yields) */
  getFarmDetails: async (id: string) => {
    const { data } = await api.get(`/farms/${id}/details`);
    return data.data;
  },

  /** Create a new farm */
  createFarm: async (farmData: Record<string, unknown>) => {
    const { data } = await api.post('/farms', farmData);
    return data.data;
  },

  /** Update a farm */
  updateFarm: async (id: string, farmData: Record<string, unknown>) => {
    const { data } = await api.put(`/farms/${id}`, farmData);
    return data.data;
  },

  /** Delete a farm */
  deleteFarm: async (id: string) => {
    const { data } = await api.delete(`/farms/${id}`);
    return data;
  },

  /** Find farms near a GPS coordinate */
  getFarmsNearLocation: async (
    latitude: number,
    longitude: number,
    radius = 10
  ) => {
    const { data } = await api.get('/farms/location/nearby', {
      params: { latitude, longitude, radius },
    });
    return data.data;
  },

  /** Get all mapped fields for a farm */
  getFarmFields: async (farmId: string) => {
    try {
      const { data } = await api.get(`/farms/${farmId}/fields`);
      if (data && data.data) {
        await saveOfflineFields(farmId, data.data);
      }
      return data.data;
    } catch (error) {
      console.warn(`getFarmFields: Network request failed for farm ${farmId}, falling back to offline storage:`, error instanceof Error ? error.message : error);
      const cached = await getOfflineFields(farmId);
      if (cached) {
        return cached;
      }
      throw error;
    }
  },

  /** Add a drawn polygon field to a farm */
  addFarmField: async (
    farmId: string,
    fieldData: {
      name: string;
      area_acres: number;
      area_hectares?: number;
      polygon: Array<{ lat: number; lng: number }>;
      center_latitude?: number;
      center_longitude?: number;
    }
  ) => {
    const { data } = await api.post(`/farms/${farmId}/fields`, fieldData);
    return data.data;
  },

  /** Remove a field from a farm */
  deleteFarmField: async (farmId: string, fieldId: string) => {
    const { data } = await api.delete(`/farms/${farmId}/fields/${fieldId}`);
    return data;
  },
};

// ─── Profile API ──────────────────────────────────────────────────────────────

export const profileApi = {
  /** Fetch the current user's farmer profile */
  getProfile: async () => {
    const { data } = await api.get('/profile');
    return data;
  },

  /** Create or update the current user's farmer profile */
  saveProfile: async (profileData: {
    full_name: string;
    phone_number: string;
    gender?: string;
    date_of_birth?: string;
    years_of_experience?: number;
    education_level?: string;
  }) => {
    const { data } = await api.post('/profile', profileData);
    return data;
  },
};

// ─── Crop API ─────────────────────────────────────────────────────────────────

export const cropApi = {
  /** Get all crops for a specific farm */
  getFarmCrops: async (farmId: string) => {
    const { data } = await api.get(`/crops/farm/${farmId}`);
    return data;
  },

  /** Create a new crop */
  createCrop: async (cropData: Record<string, unknown>) => {
    const { data } = await api.post('/crops', cropData);
    return data;
  },

  /** Update an existing crop */
  updateCrop: async (id: string, cropData: Record<string, unknown>) => {
    const { data } = await api.put(`/crops/${id}`, cropData);
    return data;
  },

  /** Delete a crop */
  deleteCrop: async (id: string) => {
    const { data } = await api.delete(`/crops/${id}`);
    return data;
  },
};

export default farmApi;