import { supabase } from '../supabase'
import { BookingSystemGuard } from '../guards/bookingSystemGuard'

export class BookingService {
  /**
   * CRITICAL: Get available slots - ONLY THROUGH RPC
   * Direct time_slots queries are FORBIDDEN as they bypass lock logic
   */
  static async getAvailableSlots(eventId: string): Promise<SlotAvailability[]> {
    // Pre-flight health check
    const health = await BookingSystemGuard.checkBookingSystemHealth()
    if (!health.isHealthy) {
      throw new Error(health.error || 'Booking system is not configured correctly')
    }

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_slots', {
        p_event_id: eventId,
        p_session_id: this.getSessionId()
      })

      if (rpcError) {
        console.error('BookingService.getAvailableSlots RPC error:', rpcError)
        
        // CRITICAL: NO FALLBACK TO DIRECT QUERIES
        // Direct queries bypass lock logic and cause double-booking
        throw new Error(
          rpcError.code === 'PGRST202'
            ? 'Database migrations required. Please run: supabase db push'
            : `Failed to load slots: ${rpcError.message}`
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
      throw error // Propagate to UI - do not hide failures
    }
  }

  /**
   * REMOVED: getEventSlots() - This function bypassed lock logic
   * For admin slot management, use a separate RPC with proper lock visibility
   */

  /**
   * Check if event is bookable (pre-flight check)
   * This prevents users from reaching broken booking flows
   */
  static async canBookEvent(eventId: string, quantity: number = 1): Promise<{
    canBook: boolean
    reason: string | null
    availableSlots: number
  }> {
    // Pre-flight health check
    const health = await BookingSystemGuard.checkBookingSystemHealth()
    if (!health.isHealthy) {
      return {
        canBook: false,
        reason: health.error || 'Booking system unavailable',
        availableSlots: 0
      }
    }

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
   * Create slot lock with server-side validation
   * Lock authority is ALWAYS the server, never the client
   */
  static async createSlotLock(
    slotId: string,
    quantity: number = 1,
    sessionId?: string,
    userId?: string
  ): Promise<{ lockId: string, expiresAt: string }> {
    try {
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

      // Fetch server-generated expiry time (SINGLE SOURCE OF TRUTH)
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
   * Server-side lock verification (AUTHORITY)
   * Client timers are UX-only, this is the real check
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
   * Complete booking with server-side validation
   * Server ALWAYS has final authority on lock validity and capacity
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
   * Get session ID for lock tracking
   * This binds locks to browser sessions to prevent CSRF
   */
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('booking_session_id')
    if (!sessionId) {
      // Generate cryptographically secure session ID
      sessionId = `session_${Date.now()}_${crypto.randomUUID()}`
      sessionStorage.setItem('booking_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Get time remaining (UX ONLY - NOT AUTHORITY)
   * Server expiry is the ONLY authority for lock validity
   */
  static getTimeRemaining(expiresAt: string): number {
    const expires = new Date(expiresAt).getTime()
    return Math.max(0, Math.floor((expires - Date.now()) / 1000))
  }

  static formatSlotTime(startTime: string, endTime: string): string {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  }
}

// ============================================
// FIX 3: Updated bookingStore with Clear Authority
// src/stores/bookingStore.ts (KEY CHANGES)
// ============================================

export const useBookingStore = create<BookingStore>((set, get) => {
  // Timer is stored outside state to avoid re-renders
  let timerIntervalId: NodeJS.Timeout | null = null

  return {
    // ... existing state ...

    selectSlot: async (slot: SlotAvailability, quantity: number = 1) => {
      set({ loading: true, error: null })
      
      try {
        // SERVER-SIDE LOCK CREATION (AUTHORITY)
        const { lockId, expiresAt } = await BookingService.createSlotLock(
          slot.slotId, 
          quantity
        )
        
        set({
          selectedSlot: slot,
          selectedQuantity: quantity,
          lockId,
          lockExpiresAt: expiresAt, // Server time is authority
          currentStep: 'fill-details',
          loading: false,
          error: null
        })
        
        // Clear any existing timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
        }
        
        // UX-ONLY TIMER: For display purposes only
        // Lock validity is ALWAYS determined by server via verifyLock()
        timerIntervalId = setInterval(() => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            
            // Update display only
            set({ timeRemaining: remaining })
            
            // When timer reaches zero, check with server (not client decision)
            if (remaining <= 0) {
              if (timerIntervalId) {
                clearInterval(timerIntervalId)
                timerIntervalId = null
              }
              // Don't auto-reset - let server rejection handle it
            }
          }
        }, 1000)
        
      } catch (error: any) {
        console.error('Error selecting slot:', error)
        set({
          loading: false,
          error: error.message || 'Failed to reserve slot. Please try again.'
        })
      }
    },

    confirmBooking: async () => {
      const { lockId, formData } = get()
      
      if (!lockId) {
        set({ error: 'No active reservation found' })
        return
      }
      
      set({ loading: true, error: null })
      
      try {
        // SERVER VALIDATES LOCK (AUTHORITY)
        // If lock expired/invalid, server will reject
        const booking = await BookingService.completeBooking(lockId, formData)
        
        // Success - clear timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
          timerIntervalId = null
        }
        
        set({
          booking,
          currentStep: 'completed',
          loading: false,
          error: null
        })
      } catch (error: any) {
        console.error('Error confirming booking:', error)
        
        // SERVER REJECTED - likely lock expired or capacity exhausted
        if (error.message?.includes('expired') || 
            error.message?.includes('not found') ||
            error.message?.includes('capacity')) {
          
          if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
          }
          
          // Reset to slot selection - server authority rejected booking
          set({
            error: error.message || 'Your reservation has expired. Please select a new slot.',
            currentStep: 'select-slot',
            selectedSlot: null,
            selectedQuantity: 1,
            lockId: null,
            lockExpiresAt: null,
            timeRemaining: 0,
            loading: false
          })
        } else {
          // Other error - keep state but show error
          set({
            loading: false,
            error: error.message || 'Failed to confirm booking. Please try again.'
          })
        }
      }
    },

    // ... rest of store ...
  }
})