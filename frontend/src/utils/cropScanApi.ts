/**
 * CropScan AI — API client
 * Uses shared axios `api` instance from farmApi.ts so JWT is injected automatically.
 * For multipart uploads we use the axios instance directly (it handles FormData).
 */
import { api } from './farmApi'
import { supabase } from '../lib/supabase'
import { getOfflineCropScans, saveOfflineCropScans } from '../lib/offlineStorage'

export interface DiagnosisResult {
  predicted_disease_name: string
  confidence_score: number
  is_healthy: boolean
  crop_type?: string
  symptoms: string[]
  recommended_action: string[]
}

export interface CropScan {
  id: string
  farm_id: string
  crop_id?: string
  detected_disease: string
  confidence_score: number
  recommendation: string
  scan_date: string
  farms?: { name: string }
}

/**
 * Upload a plant image and get a disease diagnosis from the Python ML backend.
 * If farmId is provided, the result is saved to the crop_scans table automatically.
 */
export async function diagnoseImage(
  imageFile: File,
  farmId?: string,
  cropId?: string
): Promise<DiagnosisResult> {
  const formData = new FormData()
  formData.append('file', imageFile)

  const params: Record<string, string> = {}
  if (farmId) params.farm_id = farmId
  if (cropId) params.crop_id = cropId

  const { data } = await api.post<DiagnosisResult>('/diagnose', formData, {
    params,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/*
  Fetch scan history for the authenticated user.
  Optionally filtered by farm_id.
 */
export async function getScanHistory(farmId?: string): Promise<CropScan[]> {
  try {
    const params: Record<string, string> = {}
    if (farmId) params.farm_id = farmId
    const { data } = await api.get<{
      success: boolean;
      data: CropScan[]
    }>('/crop-scans', { params })
    const scans = data.data ?? []
    await saveOfflineCropScans(scans, farmId)
    return scans
  } catch (error) {
    console.warn('getScanHistory: Network request failed, falling back to offline storage:', error instanceof Error ? error.message : error);
    const cached = await getOfflineCropScans(farmId);
    if (cached) {
      return cached;
    }
    throw error;
  }
}
