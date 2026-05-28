import { supabase } from '../lib/supabase';
import type { YieldHistory } from '../types';

export class YieldService {
  // Create a new yield record
  static async createYieldRecord(yieldRecord: Omit<YieldHistory, 'id' | 'created_at'>): Promise<YieldHistory> {
    const { data, error } = await supabase
      .from('yield_history')
      .insert(yieldRecord)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create yield record: ${error.message}`)
    return data
  }

  // Get yield record by ID
  static async getYieldById(id: string): Promise<YieldHistory | null> {
    const { data, error } = await supabase
      .from('yield_history')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get yield record: ${error.message}`)
    }
    return data
  }

  // Get all yield records for a farm
  static async getYieldsByFarmId(farmId: string): Promise<YieldHistory[]> {
    const { data, error } = await supabase
      .from('yield_history')
      .select('*')
      .eq('farm_id', farmId)
      .order('year', { ascending: false })
    
    if (error) throw new Error(`Failed to get yield records: ${error.message}`)
    return data || []
  }

  // Get yield records by farmer ID (across all farms)
  static async getYieldsByFarmerId(farmerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('yield_history')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .order('year', { ascending: false })
    
    if (error) throw new Error(`Failed to get farmer yield records: ${error.message}`)
    return data || []
  }

  // Update yield record
  static async updateYieldRecord(id: string, updates: Partial<YieldHistory>): Promise<YieldHistory> {
    const { data, error } = await supabase
      .from('yield_history')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update yield record: ${error.message}`)
    return data
  }

  // Delete yield record
  static async deleteYieldRecord(id: string): Promise<void> {
    const { error } = await supabase
      .from('yield_history')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Failed to delete yield record: ${error.message}`)
  }

  // Get yields by crop type
  static async getYieldsByCropType(farmerId: string, cropType: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('yield_history')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .eq('crop_type', cropType)
      .order('year', { ascending: false })
    
    if (error) throw new Error(`Failed to get yields by crop type: ${error.message}`)
    return data || []
  }

  // Get yields by year
  static async getYieldsByYear(farmerId: string, year: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('yield_history')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .eq('year', year)
      .order('crop_type', { ascending: true })
    
    if (error) throw new Error(`Failed to get yields by year: ${error.message}`)
    return data || []
  }

  // Get yields by season
  static async getYieldsBySeason(farmerId: string, season: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('yield_history')
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
      .order('year', { ascending: false })
    
    if (error) throw new Error(`Failed to get yields by season: ${error.message}`)
    return data || []
  }

  // Get yield analytics for farmer
  static async getYieldAnalytics(farmerId: string): Promise<any> {
    const { data, error } = await supabase
      .from('yield_history')
      .select(`
        crop_type,
        variety,
        season,
        year,
        quantity,
        unit,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .order('year', { ascending: false })
    
    if (error) throw new Error(`Failed to get yield analytics: ${error.message}`)

    if (!data || data.length === 0) {
      return {
        totalRecords: 0,
        totalYield: 0,
        averageYield: 0,
        yieldByCrop: {},
        yieldByYear: {},
        trendAnalysis: null
      }
    }

    // Calculate analytics
    const totalYield = data.reduce((sum, record) => sum + (record.quantity || 0), 0)
    const totalRecords = data.length
    const averageYield = totalYield / totalRecords

    // Yield by crop type
    const yieldByCrop = data.reduce((acc, record) => {
      const crop = record.crop_type
      if (!acc[crop]) {
        acc[crop] = { totalQuantity: 0, records: 0, averageYield: 0 }
      }
      acc[crop].totalQuantity += record.quantity || 0
      acc[crop].records += 1
      acc[crop].averageYield = acc[crop].totalQuantity / acc[crop].records
      return acc
    }, {} as Record<string, any>)

    // Yield by year
    const yieldByYear = data.reduce((acc, record) => {
      const year = record.year
      if (!acc[year]) {
        acc[year] = { totalQuantity: 0, records: 0, crops: new Set() }
      }
      acc[year].totalQuantity += record.quantity || 0
      acc[year].records += 1
      acc[year].crops.add(record.crop_type)
      return acc
    }, {} as Record<number, any>)

    // Convert Set to Array for JSON serialization
    Object.keys(yieldByYear).forEach(yearStr => {
      const year = parseInt(yearStr)
      yieldByYear[year].crops = Array.from(yieldByYear[year].crops)
    })

    // Trend analysis (last 5 years)
    const currentYear = new Date().getFullYear()
    const lastFiveYears = Array.from({ length: 5 }, (_, i) => currentYear - i)
    const trendData = lastFiveYears.map(year => ({
      year,
      totalYield: yieldByYear[year]?.totalQuantity || 0,
      recordsCount: yieldByYear[year]?.records || 0
    }))

    const bestPerformingCrop = Object.entries(yieldByCrop).reduce((best: any, [crop, data]: [string, any]) => 
      data.averageYield > (best.averageYield || 0) ? { crop, ...data } : best, 
      { averageYield: 0 }
    )

    return {
      totalRecords,
      totalYield,
      averageYield,
      yieldByCrop,
      yieldByYear,
      trendAnalysis: trendData,
      bestPerformingCrop
    }
  }

  // Get yield trends for specific crop
  static async getCropYieldTrend(farmerId: string, cropType: string, years = 5): Promise<any[]> {
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - years + 1

    const { data, error } = await supabase
      .from('yield_history')
      .select(`
        year,
        quantity,
        variety,
        season,
        farms!inner (farmer_id)
      `)
      .eq('farms.farmer_id', farmerId)
      .eq('crop_type', cropType)
      .gte('year', startYear)
      .order('year', { ascending: true })
    
    if (error) throw new Error(`Failed to get crop yield trend: ${error.message}`)
    return data || []
  }

  // Compare yields across farms for a farmer
  static async compareYieldsAcrossFarms(farmerId: string, cropType?: string): Promise<any[]> {
    let query = supabase
      .from('yield_history')
      .select(`
        quantity,
        year,
        crop_type,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)

    if (cropType) {
      query = query.eq('crop_type', cropType)
    }

    const { data, error } = await query.order('year', { ascending: false })
    
    if (error) throw new Error(`Failed to compare yields across farms: ${error.message}`)

    // Group by farm
    const yieldsByFarm = data?.reduce((acc, record) => {
      const farmId = (record.farms as any).id
      const farmName = (record.farms as any).name
      
      if (!acc[farmId]) {
        acc[farmId] = {
          farmId,
          farmName,
          totalYield: 0,
          records: 0,
          averageYield: 0,
          crops: new Set()
        }
      }
      
      acc[farmId].totalYield += record.quantity || 0
      acc[farmId].records += 1
      acc[farmId].averageYield = acc[farmId].totalYield / acc[farmId].records
      acc[farmId].crops.add(record.crop_type)
      
      return acc
    }, {} as Record<string, any>) || {}

    // Convert Set to Array and return as array
    return Object.values(yieldsByFarm).map(farm => ({
      ...farm,
      crops: Array.from(farm.crops)
    }))
  }

  // Bulk create yield records
  static async createMultipleYieldRecords(yieldRecords: Omit<YieldHistory, 'id' | 'created_at'>[]): Promise<YieldHistory[]> {
    const { data, error } = await supabase
      .from('yield_history')
      .insert(yieldRecords)
      .select()
    
    if (error) throw new Error(`Failed to create yield records: ${error.message}`)
    return data || []
  }
}