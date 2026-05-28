import { supabase } from '../lib/supabase';
import type { Farm } from '../types';

export class FarmService {
  // Create a new farm
  static async createFarm(farm: Omit<Farm, 'id' | 'created_at'>): Promise<Farm> {
    const { data, error } = await supabase
      .from('farms')
      .insert(farm)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create farm: ${error.message}`)
    return data
  }

  // Get farm by ID
  static async getFarmById(id: string): Promise<Farm | null> {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to get farm: ${error.message}`)
    }
    return data
  }

  // Get all farms for a farmer
  static async getFarmsByFarmerId(farmerId: string): Promise<Farm[]> {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(`Failed to get farms: ${error.message}`)
    return data || []
  }

  // Update farm
  static async updateFarm(id: string, updates: Partial<Farm>): Promise<Farm> {
    const { data, error } = await supabase
      .from('farms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update farm: ${error.message}`)
    return data
  }

  // Delete farm (will cascade to all related data)
  static async deleteFarm(id: string): Promise<void> {
    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Failed to delete farm: ${error.message}`)
  }

  // Get farm with detailed info including crops and resources
  static async getFarmWithDetails(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('farms')
      .select(`
        *,
        crops (*),
        farm_resources (*),
        soil_health_history (*),
        yield_history (*)
      `)
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get farm details: ${error.message}`)
    }
    return data
  }

  // Get farms summary for a farmer
  static async getFarmsSummary(farmerId: string): Promise<any> {
    const { data, error } = await supabase
      .from('farms')
      .select(`
        id,
        name,
        total_area,
        soil_type,
        irrigation_type,
        crops (
          id,
          crop_type,
          area_allocated,
          current_growth_stage
        )
      `)
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(`Failed to get farms summary: ${error.message}`)
    return data || []
  }

  // Check if farm belongs to farmer
  static async validateFarmOwnership(farmId: string, farmerId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('farms')
      .select('farmer_id')
      .eq('id', farmId)
      .single()
    
    if (error) return false
    return data?.farmer_id === farmerId
  }

  // Get farms within a certain radius of coordinates
  static async getFarmsByLocation(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 10,
    farmerId?: string
  ): Promise<Farm[]> {
    // This is a simplified approach - for a production app, consider 
    // using PostGIS or a more sophisticated geospatial solution
    
    // First, get farms that might have location data
    let query = supabase.from('farms').select('*')
    
    // If farmerId is provided, filter by farmer
    if (farmerId) {
      query = query.eq('farmer_id', farmerId)
    }
    
    const { data, error } = await query
    
    if (error) throw new Error(`Failed to get farms by location: ${error.message}`)
    
    // Filter farms based on distance calculation
    const farmsWithLocation = data.filter(farm => {
      if (!farm.location?.latitude || !farm.location?.longitude) {
        return false
      }
      
      const distance = this.calculateDistance(
        latitude,
        longitude,
        farm.location.latitude,
        farm.location.longitude
      )
      
      // Add distance to farm object for sorting
      farm.distance = distance
      
      return distance <= radiusKm
    })
    
    // Sort by distance
    return farmsWithLocation.sort((a, b) => a.distance - b.distance)
  }
  
  // Helper method to calculate distance between two points using the Haversine formula
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c // Distance in km
    
    return distance
  }
  
  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180)
  }

}