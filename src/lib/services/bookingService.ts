// src/lib/services/bookingService.ts
// Service layer for booking operations

import { supabase } from '../supabase'
import { 
  SlotAvailability, 
  BookingFormData, 
  ConfirmedBooking,
  TimeSlot 
} from '../../types/booking'

export class BookingService {
  /**
   * Get available slots for an event
   * FIXED: Changed parameter name from p_event_id to match SQL function
   */
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

  /**
   * Create a temporary lock on a slot (holds it during booking process)
   */
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

      if (error) {
        console.error('Error creating slot lock:', error)
        throw new Error(error.message || 'Failed to create slot lock')
      }
      
      return data
    } catch (error: any) {
      console.error('BookingService.createSlotLock error:', error)
      throw error
    }
  }

  /**
   * Release a slot lock
   */
  static async releaseSlotLock(lockId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('release_slot_lock', {
        p_lock_id: lockId
      })

      if (error) {
        console.error('Error releasing slot lock:', error)
        throw new Error(error.message || 'Failed to release slot lock')
      }
      
      return data
    } catch (error: any) {
      console.error('BookingService.releaseSlotLock error:', error)
      throw error
    }
  }

  /**
   * Complete the booking (convert lock to confirmed booking)
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

      if (error) {
        console.error('Error completing booking:', error)
        throw new Error(error.message || 'Failed to complete booking')
      }

      // Fetch the complete booking details
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) {
        console.error('Error fetching booking details:', fetchError)
        throw new Error(fetchError.message || 'Failed to fetch booking details')
      }
      
      return booking as ConfirmedBooking
    } catch (error: any) {
      console.error('BookingService.completeBooking error:', error)
      throw error
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('cancel_slot_booking', {
        p_booking_id: bookingId
      })

      if (error) {
        console.error('Error cancelling booking:', error)
        throw new Error(error.message || 'Failed to cancel booking')
      }
      
      return data
    } catch (error: any) {
      console.error('BookingService.cancelBooking error:', error)
      throw error
    }
  }

  /**
   * Get booking by reference
   */
  static async getBookingByReference(reference: string): Promise<ConfirmedBooking | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, time_slots(*), events(*)')
        .eq('booking_reference', reference)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        console.error('Error fetching booking by reference:', error)
        throw new Error(error.message || 'Failed to fetch booking')
      }

      return data as ConfirmedBooking
    } catch (error: any) {
      console.error('BookingService.getBookingByReference error:', error)
      if (error.message.includes('PGRST116')) return null
      throw error
    }
  }

  /**
   * Generate time slots for an event
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

      if (error) {
        console.error('Error generating event slots:', error)
        throw new Error(error.message || 'Failed to generate event slots')
      }
      
      return data
    } catch (error: any) {
      console.error('BookingService.generateEventSlots error:', error)
      throw error
    }
  }

  /**
   * Get all slots for an event (admin view)
   */
  static async getEventSlots(eventId: string): Promise<TimeSlot[]> {
    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching event slots:', error)
        throw new Error(error.message || 'Failed to fetch event slots')
      }
      
      return data as TimeSlot[]
    } catch (error: any) {
      console.error('BookingService.getEventSlots error:', error)
      throw error
    }
  }

  /**
   * Get or create session ID for anonymous users
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
   * Format time for display
   */
  static formatSlotTime(startTime: string, endTime: string): string {
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
    
    return `${start.toLocaleTimeString('en-US', options)} - ${end.toLocaleTimeString('en-US', options)}`
  }

  /**
   * Calculate time remaining on lock
   */
  static getTimeRemaining(expiresAt: string): number {
    const expires = new Date(expiresAt).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((expires - now) / 1000))
  }

  /**
   * Format time remaining for display
   */
  static formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}