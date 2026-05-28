import { supabase } from '../lib/supabase';
import type { Crop, CropVariety } from '../types';

export class CropService {
  // Create a new crop
  static async createCrop(crop: Omit<Crop, 'id' | 'created_at'>): Promise<Crop> {
    const { data, error } = await supabase
      .from('crops')
      .insert(crop)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create crop: ${error.message}`)
    return data
  }

  // Get crop by ID
  static async getCropById(id: string): Promise<Crop | null> {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get crop: ${error.message}`)
    }
    return data
  }

  // Get all crops for a farm
  static async getCropsByFarmId(farmId: string): Promise<Crop[]> {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .eq('farm_id', farmId)
      .order('sowing_date', { ascending: false })
    
    if (error) throw new Error(`Failed to get crops: ${error.message}`)
    return data || []
  }

  // Get crops by farmer ID (across all farms)
  static async getCropsByFarmerId(farmerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('crops')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .order('sowing_date', { ascending: false })
    
    if (error) throw new Error(`Failed to get farmer crops: ${error.message}`)
    return data || []
  }

  // Update crop
  static async updateCrop(id: string, updates: Partial<Crop>): Promise<Crop> {
    const { data, error } = await supabase
      .from('crops')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update crop: ${error.message}`)
    return data
  }

  // Delete crop
  static async deleteCrop(id: string): Promise<void> {
    const { error } = await supabase
      .from('crops')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Failed to delete crop: ${error.message}`)
  }

  // Get crops by growth stage
  static async getCropsByGrowthStage(farmerId: string, stage: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('crops')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .eq('current_growth_stage', stage)
      .order('sowing_date', { ascending: false })
    
    if (error) throw new Error(`Failed to get crops by stage: ${error.message}`)
    return data || []
  }

  // Get crops by season
  static async getCropsBySeason(farmerId: string, season: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('crops')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .eq('season', season)
      .order('sowing_date', { ascending: false })
    
    if (error) throw new Error(`Failed to get crops by season: ${error.message}`)
    return data || []
  }

  // Get crop varieties (reference data)
  static async getCropVarieties(): Promise<CropVariety[]> {
    const { data, error } = await supabase
      .from('crop_varieties')
      .select('*')
      .order('crop_type', { ascending: true })
    
    if (error) throw new Error(`Failed to get crop varieties: ${error.message}`)
    return data || []
  }

  // Get varieties for specific crop type
  static async getVarietiesForCrop(cropType: string): Promise<CropVariety[]> {
    const { data, error } = await supabase
      .from('crop_varieties')
      .select('*')
      .eq('crop_type', cropType)
      .order('variety', { ascending: true })
    
    if (error) throw new Error(`Failed to get varieties for crop: ${error.message}`)
    return data || []
  }

  // Get crop analytics for farmer
  static async getCropAnalytics(farmerId: string): Promise<any> {
    // Get total area under cultivation
    const { data: totalAreaData, error: areaError } = await supabase
      .from('crops')
      .select(`
        area_allocated,
        farms!inner (farmer_id)
      `)
      .eq('farms.farmer_id', farmerId)
    
    if (areaError) throw new Error(`Failed to get crop analytics: ${areaError.message}`)

    // Get crop distribution by type
    const { data: distributionData, error: distError } = await supabase
      .from('crops')
      .select(`
        crop_type,
        area_allocated,
        farms!inner (farmer_id)
      `)
      .eq('farms.farmer_id', farmerId)
    
    if (distError) throw new Error(`Failed to get crop distribution: ${distError.message}`)

    // Calculate analytics
    const totalArea = totalAreaData?.reduce((sum, crop) => sum + (crop.area_allocated || 0), 0) || 0
    
    const cropDistribution = distributionData?.reduce((acc, crop) => {
      const type = crop.crop_type
      if (!acc[type]) {
        acc[type] = { count: 0, totalArea: 0 }
      }
      acc[type].count += 1
      acc[type].totalArea += crop.area_allocated || 0
      return acc
    }, {} as Record<string, { count: number; totalArea: number }>)

    return {
      totalCrops: totalAreaData?.length || 0,
      totalArea,
      cropDistribution
    }
  }
}