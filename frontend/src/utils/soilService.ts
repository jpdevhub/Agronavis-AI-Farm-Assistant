/**
 * Soil Service — Frontend
 *
 * All soil & fertilizer data calls go through the Express backend.
 * The backend owns the Supabase connection — the frontend never queries Supabase directly.
 *
 * Auth token is automatically attached via the shared `api` axios interceptor in farmApi.ts.
 */

import { api } from './farmApi';

export const soilService = {
  /**
   * Estimate soil health for a farm based on its geographic location.
   * The backend calls the `get_estimated_soil_health` Supabase RPC internally.
   */
  estimateSoilHealth: async (farmId: string, state: string, district: string) => {
    const response = await api.post('/soil-estimation/estimate', {
      farmId,
      state,
      district,
    });
    return response.data;
  },

  /**
   * Get fertilizer recommendations for a farm.
   * Returns bag counts for Urea/SSP/MOP based on soil-crop NPK gap.
   */
  getFertilizerRecommendation: async (farmId: string) => {
    const response = await api.get(`/soil-estimation/fertilizer/${farmId}?t=${Date.now()}`);
    return response.data;
  },
};
