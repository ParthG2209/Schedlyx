import { supabase } from '../lib/supabase'
import { 
  Availability, 
  mapDBAvailabilityToDomain 
} from '../types'

export interface AvailabilitySlotInput {
  day_of_week: number
  start_time: string
  end_time: string
  is_enabled: boolean
}

export const availabilityService = {
  /**
   * Fetch current user's availability
   */
  async getMyAvailability(): Promise<Availability[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('availabilities')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return (data || []).map(mapDBAvailabilityToDomain)
  },

  /**
   * Save user availability using the atomic RPC function
   */
  async saveAvailability(slots: AvailabilitySlotInput[]): Promise<void> {
    const { error } = await supabase.rpc('update_user_availability', {
      p_slots: slots
    })

    if (error) {
      console.error('Error in saveAvailability RPC:', error)
      throw new Error(error.message || 'Failed to save availability')
    }
  },

  /**
   * Fetch a specific user's availability (publicly accessible)
   */
  async getUserAvailability(userId: string): Promise<Availability[]> {
    const { data, error } = await supabase
      .from('availabilities')
      .select('*')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return (data || []).map(mapDBAvailabilityToDomain)
  }
}
