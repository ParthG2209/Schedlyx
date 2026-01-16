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
   * FIXED: Get available slots using RPC with session_id
   * This is the ONLY safe way to check availability
   */
  static async getAvailableSlots(eventId: string): Promise<SlotAvailability[]> {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_slots', {
        p_event_id: eventId,
        p_session_id: this.getSessionId()
      })

      if (rpcError) {
        console.error('BookingService.getAvailableSlots RPC error:', rpcError)
        throw new Error(
          `Unable to load available slots. ${rpcError.code === 'PGRST202'
            ? 'Database function not found - please run migrations.'
            : 'Please refresh and try again.'
          }`
        )
      }

      return (rpcData || []).map((slot: any) => ({
        slotId: slot.slot_id || slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        totalCapacity: slot.total_capacity,
        availableCount: slot.available_count,
        price: slot.price
      }))
    } catch (error: any) {
      console.error('BookingService.getAvailableSlots error:', error)
      throw new Error(
        error.message || 'Failed to load available slots. Please refresh the page and try again.'
      )
    }
  }

  /**
   * FIXED: Check if event is bookable before showing booking UI
   */
  static async canBookEvent(eventId: string, quantity: number = 1): Promise<{
    canBook: boolean
    reason: string | null
    availableSlots: number
  }> {
    try {
      const { data, error } = await supabase.rpc('can_book_event', {
        p_event_id: eventId,
        p_quantity: quantity
      })

      if (error) throw error

      if (!data || data.length === 0) {
        return {
          canBook: false,
          reason: 'Unable to verify booking eligibility',
          availableSlots: 0
        }
      }

      const result = data[0]
      return {
        canBook: result.can_book,
        reason: result.can_book ? null : result.reason,
        availableSlots: result.available_slots || 0
      }
    } catch (error: any) {
      console.error('BookingService.canBookEvent error:', error)
      return {
        canBook: false,
        reason: error.message || 'Failed to check booking eligibility',
        availableSlots: 0
      }
    }
  }

  /**
   * FIXED: Create slot lock with quantity validation
   */
  static async createSlotLock(
    slotId: string,
    quantity: number = 1,
    sessionId?: string,
    userId?: string
  ): Promise<{ lockId: string, expiresAt: string }> {
    try {
      // Validate quantity
      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0')
      }

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

  /**
   * FIXED: Verify lock validity with server
   */
  static async verifyLock(lockId: string): Promise<{
    isValid: boolean
    reason: string | null
    expiresAt: string | null
  }> {
    try {
      const { data, error } = await supabase.rpc('verify_lock', {
        p_lock_id: lockId
      })

      if (error) throw error

      if (!data || data.length === 0) {
        return {
          isValid: false,
          reason: 'Lock not found',
          expiresAt: null
        }
      }

      const result = data[0]
      return {
        isValid: result.is_valid,
        reason: result.is_valid ? null : result.reason,
        expiresAt: result.expires_at
      }
    } catch (error: any) {
      console.error('BookingService.verifyLock error:', error)
      return {
        isValid: false,
        reason: error.message || 'Failed to verify lock',
        expiresAt: null
      }
    }
  }

  /**
   * Release slot lock
   */
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
   * Complete booking with server-side validation
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

  /**
   * Generate event slots (admin function)
   */
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
   * REMOVED: getEventSlots() - USE getAvailableSlots() INSTEAD
   * Direct table access bypasses lock logic and causes double-booking
   * 
   * If you need admin slot management, use a separate RPC function
   * that includes lock information explicitly
   */

  /**
   * Get session ID for lock tracking
   */
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('booking_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('booking_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Format slot time for display
   */
  static formatSlotTime(startTime: string, endTime: string): string {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  }

  /**
   * Get time remaining from expiry timestamp
   */
  static getTimeRemaining(expiresAt: string): number {
    const expires = new Date(expiresAt).getTime()
    return Math.max(0, Math.floor((expires - Date.now()) / 1000))
  }
}