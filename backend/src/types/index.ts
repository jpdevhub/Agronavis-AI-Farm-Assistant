/**
 * Shared TypeScript types for the AgroNavis backend.
 * These mirror the Supabase database schema.
 */

export interface Farmer {
  id: string;
  email?: string;
  full_name: string;
  phone_number: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  education_level?: string;
  years_of_experience?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FarmLocation {
  latitude?: number;
  longitude?: number;
  state?: string;
  district?: string;
  village?: string;
  coordinates_source?: string;
  polygon?: Array<{ lat: number; lng: number }>;
  center_latitude?: number;
  center_longitude?: number;
  area_acres?: number;
  area_hectares?: number;
  soil_estimated?: boolean;
  soil_estimated_at?: string;
  fields?: FarmField[];
}

export interface FarmField {
  id: string;
  name: string;
  area_acres: number;
  area_hectares?: number;
  polygon: Array<{ lat: number; lng: number }>;
  center_latitude?: number;
  center_longitude?: number;
  created_at?: string;
}

export interface Farm {
  id?: string;
  farmer_id: string;
  name: string;
  total_area: number;
  address?: string;
  location?: FarmLocation;
  soil_type?: 'sandy' | 'clay' | 'loamy' | 'silt' | 'peaty' | 'chalky';
  irrigation_type?: 'drip' | 'sprinkler' | 'flood' | 'rainfed' | 'manual';
  ownership_type?: 'owned' | 'leased' | 'shared';
  created_at?: string;
}

export interface Crop {
  id?: string;
  farm_id: string;
  crop_type: string;
  variety?: string;
  sowing_date?: string;
  expected_harvest_date?: string;
  area_allocated: number;
  season?: 'kharif' | 'rabi' | 'zaid' | 'perennial';
  current_growth_stage?:
    | 'sowing'
    | 'germination'
    | 'vegetative'
    | 'flowering'
    | 'fruiting'
    | 'harvesting';
  yield_expectation?: number;
  created_at?: string;
}

export interface FarmResource {
  id?: string;
  farm_id: string;
  resource_type:
    | 'tractor'
    | 'harvester'
    | 'plough'
    | 'irrigation_pump'
    | 'sprayer'
    | 'storage';
  quantity?: number;
  condition?: 'excellent' | 'good' | 'average' | 'poor';
  created_at?: string;
}

export interface SoilHealth {
  id?: string;
  farm_id: string;
  ph_level?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  organic_carbon?: number;
  moisture_level?: number;
  tested_date?: string;
  created_at?: string;
}

export interface YieldHistory {
  id?: string;
  farm_id: string;
  crop_type: string;
  variety?: string;
  season?: string;
  year: number;
  quantity: number;
  unit?: string;
  quality_notes?: string;
  created_at?: string;
}

export interface CropVariety {
  id?: string;
  crop_type: string;
  variety: string;
  season: string[];
  avg_yield_per_acre?: number;
  growth_duration_days?: number;
  req_nitrogen_kg_per_acre?: number;
  req_phosphorus_kg_per_acre?: number;
  req_potassium_kg_per_acre?: number;
  ideal_ph_min?: number;
  ideal_ph_max?: number;
  created_at?: string;
}

// Extends Express Request with an authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        [key: string]: unknown;
      };
    }
  }
}