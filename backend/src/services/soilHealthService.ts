import { supabase } from '../lib/supabase';
import type { SoilHealth } from '../types';

export class SoilHealthService {
  // Create a new soil health record
  static async createSoilHealth(soilHealth: Omit<SoilHealth, 'id' | 'created_at'>): Promise<SoilHealth> {
    const { data, error } = await supabase
      .from('soil_health_history')
      .insert(soilHealth)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create soil health record: ${error.message}`)
    return data
  }

  // Get soil health record by ID
  static async getSoilHealthById(id: string): Promise<SoilHealth | null> {
    const { data, error } = await supabase
      .from('soil_health_history')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get soil health record: ${error.message}`)
    }
    return data
  }

  // Get all soil health records for a farm
  static async getSoilHealthByFarmId(farmId: string): Promise<SoilHealth[]> {
    const { data, error } = await supabase
      .from('soil_health_history')
      .select('*')
      .eq('farm_id', farmId)
      .order('tested_date', { ascending: false })
    
    if (error) throw new Error(`Failed to get soil health records: ${error.message}`)
    return data || []
  }

  // Get soil health records by farmer ID (across all farms)
  static async getSoilHealthByFarmerId(farmerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('soil_health_history')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .order('tested_date', { ascending: false })
    
    if (error) throw new Error(`Failed to get farmer soil health records: ${error.message}`)
    return data || []
  }

  // Update soil health record
  static async updateSoilHealth(id: string, updates: Partial<SoilHealth>): Promise<SoilHealth> {
    const { data, error } = await supabase
      .from('soil_health_history')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update soil health record: ${error.message}`)
    return data
  }

  // Delete soil health record
  static async deleteSoilHealth(id: string): Promise<void> {
    const { error } = await supabase
      .from('soil_health_history')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Failed to delete soil health record: ${error.message}`)
  }

  // Get latest soil health for a farm
  static async getLatestSoilHealth(farmId: string): Promise<SoilHealth | null> {
    const { data, error } = await supabase
      .from('soil_health_history')
      .select('*')
      .eq('farm_id', farmId)
      .order('tested_date', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get latest soil health: ${error.message}`)
    }
    return data
  }

  // Get soil health trend for a farm
  static async getSoilHealthTrend(farmId: string, limit = 12): Promise<SoilHealth[]> {
    const { data, error } = await supabase
      .from('soil_health_history')
      .select('*')
      .eq('farm_id', farmId)
      .order('tested_date', { ascending: false })
      .limit(limit)
    
    if (error) throw new Error(`Failed to get soil health trend: ${error.message}`)
    return data || []
  }

  // Get soil health analytics for farmer
  static async getSoilHealthAnalytics(farmerId: string): Promise<any> {
    const { data, error } = await supabase
      .from('soil_health_history')
      .select(`
        ph_level,
        nitrogen,
        phosphorus,
        potassium,
        organic_carbon,
        moisture_level,
        tested_date,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .order('tested_date', { ascending: false })
    
    if (error) throw new Error(`Failed to get soil health analytics: ${error.message}`)

    if (!data || data.length === 0) {
      return {
        totalTests: 0,
        averages: null,
        trends: null,
        lastTested: null
      }
    }

    // Calculate averages from latest records per farm
    const latestByFarm = data.reduce((acc, record) => {
      const farmId = (record.farms as any).id
      if (!acc[farmId] || new Date(record.tested_date) > new Date(acc[farmId].tested_date)) {
        acc[farmId] = record
      }
      return acc
    }, {} as Record<string, any>)

    const latestRecords = Object.values(latestByFarm)
    
    const averages = {
      ph_level: latestRecords.reduce((sum, r) => sum + (r.ph_level || 0), 0) / latestRecords.length,
      nitrogen: latestRecords.reduce((sum, r) => sum + (r.nitrogen || 0), 0) / latestRecords.length,
      phosphorus: latestRecords.reduce((sum, r) => sum + (r.phosphorus || 0), 0) / latestRecords.length,
      potassium: latestRecords.reduce((sum, r) => sum + (r.potassium || 0), 0) / latestRecords.length,
      organic_carbon: latestRecords.reduce((sum, r) => sum + (r.organic_carbon || 0), 0) / latestRecords.length,
      moisture_level: latestRecords.reduce((sum, r) => sum + (r.moisture_level || 0), 0) / latestRecords.length
    }

    return {
      totalTests: data.length,
      totalFarmsTested: latestRecords.length,
      averages,
      lastTested: data[0]?.tested_date,
      trends: data.slice(0, 6) // Last 6 tests for trending
    }
  }

  // Check soil health status based on standard ranges
  static analyzeSoilHealth(soilHealth: SoilHealth): any {
    const analysis = {
      ph_status: 'unknown',
      nitrogen_status: 'unknown',
      phosphorus_status: 'unknown',
      potassium_status: 'unknown',
      overall_status: 'unknown',
      recommendations: [] as string[]
    }

    // pH analysis (optimal range: 6.0-7.5)
    if (soilHealth.ph_level) {
      if (soilHealth.ph_level < 6.0) {
        analysis.ph_status = 'acidic'
        analysis.recommendations.push('Apply lime to increase pH')
      } else if (soilHealth.ph_level > 7.5) {
        analysis.ph_status = 'alkaline'
        analysis.recommendations.push('Apply organic matter to reduce pH')
      } else {
        analysis.ph_status = 'optimal'
      }
    }

    // Nitrogen analysis (optimal: >300 kg/ha)
    if (soilHealth.nitrogen) {
      if (soilHealth.nitrogen < 200) {
        analysis.nitrogen_status = 'low'
        analysis.recommendations.push('Apply nitrogen fertilizer or organic compost')
      } else if (soilHealth.nitrogen < 300) {
        analysis.nitrogen_status = 'medium'
      } else {
        analysis.nitrogen_status = 'high'
      }
    }

    // Phosphorus analysis (optimal: >25 kg/ha)
    if (soilHealth.phosphorus) {
      if (soilHealth.phosphorus < 15) {
        analysis.phosphorus_status = 'low'
        analysis.recommendations.push('Apply phosphorus fertilizer')
      } else if (soilHealth.phosphorus < 25) {
        analysis.phosphorus_status = 'medium'
      } else {
        analysis.phosphorus_status = 'high'
      }
    }

    // Potassium analysis (optimal: >300 kg/ha)
    if (soilHealth.potassium) {
      if (soilHealth.potassium < 200) {
        analysis.potassium_status = 'low'
        analysis.recommendations.push('Apply potassium fertilizer')
      } else if (soilHealth.potassium < 300) {
        analysis.potassium_status = 'medium'
      } else {
        analysis.potassium_status = 'high'
      }
    }

    // Overall status
    const statuses = [analysis.ph_status, analysis.nitrogen_status, analysis.phosphorus_status, analysis.potassium_status]
    const lowCount = statuses.filter(s => s === 'low').length
    const optimalCount = statuses.filter(s => s === 'optimal' || s === 'high').length

    if (lowCount >= 2) {
      analysis.overall_status = 'poor'
    } else if (lowCount === 1) {
      analysis.overall_status = 'fair'
    } else if (optimalCount >= 3) {
      analysis.overall_status = 'excellent'
    } else {
      analysis.overall_status = 'good'
    }

    return analysis
  }
}