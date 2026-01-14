// src/lib/services/bookingService.ts
import { supabase } from '../supabase'
import { 
  SlotAvailability, 
  BookingFormData, 
  ConfirmedBooking,
  TimeSlot 
} from '../../types/booking'

export class BookingService {
  /**
   * Get an event by its ID or Slug
   * FIXED: Added UUID check and robust error handling for PGRST116 (406 error)
   */
  static async getEventById(idOrSlug: string) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)
      
      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!user_id (
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)

      if (isUuid) {
        query = query.eq('id', idOrSlug)
      } else {
        query = query.eq('slug', idOrSlug)
      }

      const { data, error } = await query.single()

      if (error) {
        // PGRST116 means no row found; return null so the UI can handle it gracefully
        if (error.code === 'PGRST116') return null
        throw error
      }
      
      return data
    } catch (error: any) {
      console.error('BookingService.getEventById error:', error)
      return null
    }
  }

  static async getAvailableSlots(eventId: string): Promise<SlotAvailability[]> {
    try {
      const { data, error } = await supabase.rpc('get_available_slots', {
        p_event_id: eventId
      })

      if (error) {
        console.error('Error fetching available slots:', error)
        throw new Error(error.message || 'Failed to fetch available slots')
      }
      
      return data || []
    } catch (error: any) {
      console.error('BookingService.getAvailableSlots error:', error)
      throw error
    }
  }

  static async createSlotLock(
    slotId: string,
    quantity: number = 1,
    sessionId?: string,
    userId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_slot_lock', {
        p_slot_id: slotId,
        p_user_id: userId || null,
        p_session_id: sessionId || this.getSessionId(),
        p_quantity: quantity,
        p_lock_duration_minutes: 10
      })

      if (error) throw new Error(error.message)
      return data
    } catch (error: any) {
      throw error
    }
  }

  static async releaseSlotLock(lockId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('release_slot_lock', {
        p_lock_id: lockId
      })
      return data
    } catch (error: any) {
      throw error
    }
  }

  static async completeBooking(
    lockId: string,
    formData: BookingFormData
  ): Promise<ConfirmedBooking> {
    try {
      const { data, error } = await supabase.rpc('complete_slot_booking', {
        p_lock_id: lockId,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_email: formData.email,
        p_phone: formData.phone || null,
        p_notes: formData.notes || null
      })

      if (error) throw error

      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) throw fetchError
      return booking as ConfirmedBooking
    } catch (error: any) {
      throw error
    }
  }

  static async generateEventSlots(
    eventId: string,
    startDate: string,
    endDate: string,
    capacityPerSlot: number = 10
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('generate_event_slots', {
        p_event_id: eventId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_capacity_per_slot: capacityPerSlot
      })

      if (error) throw error
      return data
    } catch (error: any) {
      throw error
    }
  }

  static async getEventSlots(eventId: string): Promise<TimeSlot[]> {
    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true })

      if (error) throw error
      return data as TimeSlot[]
    } catch (error: any) {
      throw error
    }
  }

  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('booking_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('booking_session_id', sessionId)
    }
    return sessionId
  }

  static formatSlotTime(startTime: string, endTime: string): string {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  }

  static getTimeRemaining(expiresAt: string): number {
    const expires = new Date(expiresAt).getTime()
    return Math.max(0, Math.floor((expires - Date.now()) / 1000))
  }
}