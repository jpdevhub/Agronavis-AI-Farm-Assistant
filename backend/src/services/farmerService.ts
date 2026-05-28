import { supabase } from '../lib/supabase';
import type { Farmer } from '../types';

export class FarmerService {
  // Create a new farmer profile
  static async createFarmer(farmer: Omit<Farmer, 'created_at' | 'updated_at'>): Promise<Farmer> {
    const { data, error } = await supabase
      .from('farmers')
      .insert(farmer)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create farmer: ${error.message}`)
    return data
  }

  // Get farmer by ID
  static async getFarmerById(id: string): Promise<Farmer | null> {
    const { data, error } = await supabase
      .from('farmers')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to get farmer: ${error.message}`)
    }
    return data
  }

  // Update farmer profile
  static async updateFarmer(id: string, updates: Partial<Farmer>): Promise<Farmer> {
    const { data, error } = await supabase
      .from('farmers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update farmer: ${error.message}`)
    return data
  }

  // Delete farmer (will cascade to all related data)
  static async deleteFarmer(id: string): Promise<void> {
    const { error } = await supabase
      .from('farmers')
      .delete()
      .eq('id', id)
    
    if (error) throw new Error(`Failed to delete farmer: ${error.message}`)
  }

  // Get all farmers (admin function)
  static async getAllFarmers(limit = 100, offset = 0): Promise<{ data: Farmer[], count: number }> {
    const { data, error, count } = await supabase
      .from('farmers')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })
    
    if (error) throw new Error(`Failed to get farmers: ${error.message}`)
    return { data: data || [], count: count || 0 }
  }

  // Check if farmer exists
  static async farmerExists(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('farmers')
      .select('id')
      .eq('id', id)
      .single()
    
    return !error && !!data
  }
}