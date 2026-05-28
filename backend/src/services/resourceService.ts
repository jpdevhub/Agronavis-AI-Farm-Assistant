import { supabase } from '../lib/supabase';
import type { FarmResource } from '../types';

export class ResourceService {
  // Create a new resource
  static async createResource(resource: Omit<FarmResource, 'id' | 'created_at'>): Promise<FarmResource> {
    const { data, error } = await supabase
      .from('farm_resources')
      .insert(resource)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create resource: ${error.message}`)
    return data
  }

  // Get resource by ID
  static async getResourceById(id: string): Promise<FarmResource | null> {
    const { data, error } = await supabase
      .from('farm_resources')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(`Failed to get resource: ${error.message}`)
    }
    return data
  }

  // Get all resources for a farm
  static async getResourcesByFarmId(farmId: string): Promise<FarmResource[]> {
    const { data, error } = await supabase
      .from('farm_resources')
      .select('*')
      .eq('farm_id', farmId)
      .order('resource_type', { ascending: true })
    
    if (error) throw new Error(`Failed to get resources: ${error.message}`)
    return data || []
  }

  // Get resources by farmer ID (across all farms)
  static async getResourcesByFarmerId(farmerId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('farm_resources')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .order('resource_type', { ascending: true })
    
    if (error) throw new Error(`Failed to get farmer resources: ${error.message}`)
    return data || []
  }

  // Update resource
  static async updateResource(id: string, updates: Partial<FarmResource>): Promise<FarmResource> {
    const { data, error } = await supabase
      .from('farm_resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update resource: ${error.message}`)
    return data
  }

  // Delete resource
  static async deleteResource(id: string): Promise<void> {
    const { error } = await supabase
      .from('farm_resources')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Failed to delete resource: ${error.message}`)
  }

  // Get resources by type
  static async getResourcesByType(farmerId: string, resourceType: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('farm_resources')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .eq('resource_type', resourceType)
      .order('condition', { ascending: false })
    
    if (error) throw new Error(`Failed to get resources by type: ${error.message}`)
    return data || []
  }

  // Get resources by condition
  static async getResourcesByCondition(farmerId: string, condition: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('farm_resources')
      .select(`
        *,
        farms!inner (
          id,
          name,
          farmer_id
        )
      `)
      .eq('farms.farmer_id', farmerId)
      .eq('condition', condition)
      .order('resource_type', { ascending: true })
    
    if (error) throw new Error(`Failed to get resources by condition: ${error.message}`)
    return data || []
  }

  // Get resource analytics for farmer
  static async getResourceAnalytics(farmerId: string): Promise<any> {
    const { data, error } = await supabase
      .from('farm_resources')
      .select(`
        resource_type,
        quantity,
        condition,
        farms!inner (farmer_id)
      `)
      .eq('farms.farmer_id', farmerId)
    
    if (error) throw new Error(`Failed to get resource analytics: ${error.message}`)

    // Calculate analytics
    const totalResources = data?.reduce((sum, resource) => sum + (resource.quantity || 0), 0) || 0
    
    const resourcesByType = data?.reduce((acc, resource) => {
      const type = resource.resource_type
      if (!acc[type]) {
        acc[type] = { count: 0, totalQuantity: 0 }
      }
      acc[type].count += 1
      acc[type].totalQuantity += resource.quantity || 0
      return acc
    }, {} as Record<string, { count: number; totalQuantity: number }>)

    const resourcesByCondition = data?.reduce((acc, resource) => {
      const condition = resource.condition || 'unknown'
      if (!acc[condition]) {
        acc[condition] = 0
      }
      acc[condition] += resource.quantity || 0
      return acc
    }, {} as Record<string, number>)

    return {
      totalResources,
      resourcesByType,
      resourcesByCondition,
      totalUniqueResources: data?.length || 0
    }
  }

  // Bulk create resources
  static async createMultipleResources(resources: Omit<FarmResource, 'id' | 'created_at'>[]): Promise<FarmResource[]> {
    const { data, error } = await supabase
      .from('farm_resources')
      .insert(resources)
      .select()
    
    if (error) throw new Error(`Failed to create resources: ${error.message}`)
    return data || []
  }
}