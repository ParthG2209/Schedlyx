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
   */
  static async getEventById(idOrSlug: string) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

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
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error: any) {
      console.error('BookingService.getEventById error:', error)
      return null
    }
  }

  /**
   * Get available slots for an event
   */
  /**
  * Get available slots for an event
  * CRITICAL: This MUST use the RPC function - no fallback allowed
  * Direct time_slots queries bypass lock deduction and cause double-booking
  */
  static async getAvailableSlots(eventId: string): Promise<SlotAvailability[]> {
    try {
      // ONLY path forward: RPC with session_id for lock visibility
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_slots', {
        p_event_id: eventId,
        p_session_id: this.getSessionId()
      })

      if (rpcError) {
        // Log the actual error for debugging
        console.error('BookingService.getAvailableSlots RPC error:', rpcError)

        // CRITICAL: Do NOT fallback to direct time_slots query
        // That would bypass lock deduction and cause double-booking
        throw new Error(
          `Unable to load available slots. ${rpcError.code === 'PGRST202'
            ? 'Database function not found - please run migrations.'
            : 'Please refresh and try again.'
          }`
        )
      }

      // Transform RPC response to SlotAvailability format
      return (rpcData || []).map((slot: any) => ({
        slotId: slot.slot_id || slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        totalCapacity: slot.total_capacity,
        availableCount: slot.available_count, // Already accounts for active locks
        price: slot.price
      }))
    } catch (error: any) {
      console.error('BookingService.getAvailableSlots error:', error)

      // Re-throw with user-friendly message
      if (error.message && error.message.includes('Database function not found')) {
        throw new Error(
          'Booking system not configured. Please contact support or run database migrations.'
        )
      }

      throw new Error(
        error.message || 'Failed to load available slots. Please refresh the page and try again.'
      )
    }
  }
  /**
   * Create a slot lock and return lock ID + server-side expiry time
   * FIXED: Returns server-generated expiry to prevent client-server time drift
   */
  static async createSlotLock(
    slotId: string,
    quantity: number = 1,
    sessionId?: string,
    userId?: string
  ): Promise<{ lockId: string, expiresAt: string }> {
    try {
      const { data: lockId, error } = await supabase.rpc('create_slot_lock', {
        p_slot_id: slotId,
        p_user_id: userId || null,
        p_session_id: sessionId || this.getSessionId(),
        p_quantity: quantity,
        p_lock_duration_minutes: 10
      })

      if (error) throw new Error(error.message)

      // Fetch the actual lock record to get server-generated expiry time
      const { data: lockData, error: fetchError } = await supabase
        .from('slot_locks')
        .select('expires_at')
        .eq('id', lockId)
        .single()

      if (fetchError) throw fetchError

      return {
        lockId,
        expiresAt: lockData.expires_at
      }
    } catch (error: any) {
      throw error
    }
  }

  static async releaseSlotLock(lockId: string): Promise<boolean> {
    try {
      const { data } = await supabase.rpc('release_slot_lock', {
        p_lock_id: lockId
      })
      return data
    } catch (error: any) {
      throw error
    }
  }

  /**
   * Complete booking
   */
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

      return {
        id: booking.id,
        bookingReference: booking.booking_reference,
        eventId: booking.event_id,
        slotId: booking.slot_id,
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        phone: booking.phone,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        confirmedAt: booking.confirmed_at,
        createdAt: booking.created_at
      } as ConfirmedBooking
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

  /**
   * Get event slots
   */
  static async getEventSlots(eventId: string): Promise<TimeSlot[]> {
    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true })

      if (error) throw error

      return (data || []).map((slot: any) => ({
        id: slot.id,
        eventId: slot.event_id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        totalCapacity: slot.total_capacity,
        bookedCount: slot.booked_count,
        availableCount: slot.available_count,
        status: slot.status,
        isLocked: slot.is_locked,
        lockedUntil: slot.locked_until,
        price: slot.price,
        currency: slot.currency,
        createdAt: slot.created_at,
        updatedAt: slot.updated_at
      })) as TimeSlot[]
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