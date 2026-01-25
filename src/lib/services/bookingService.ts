// src/lib/services/bookingService.ts
// FIXED: Aligned BookingErrorType enum names with BookingErrorHandler expectations
// REMOVED: ensureRPCAvailable() - now relying on BookingSystemGuard only
import { supabase } from '../supabase'
import { BookingSystemGuard } from '../guards/bookingSystemGuard'

// Import types from the booking types file
import type { 
  SlotAvailability, 
  BookingFormData, 
  ConfirmedBooking 
} from '../../types/booking'

/**
 * FIXED: Booking error types aligned with BookingErrorHandler component
 * Changed to match exact names used in error handling UI
 */
export enum BookingErrorType {
  LOCK_EXPIRED = 'LOCK_EXPIRED',           // ✓ Aligned
  SLOT_FULL = 'SLOT_FULL',                 // ✓ Aligned
  INVALID_QUANTITY = 'INVALID_QUANTITY',   // ✓ Aligned
  CAPACITY_EXCEEDED = 'CAPACITY_EXCEEDED', // ✓ FIXED: Was CAPACITY_CHANGED
  SYSTEM_ERROR = 'SYSTEM_ERROR',           // ✓ Aligned
  RPC_UNAVAILABLE = 'RPC_UNAVAILABLE',     // ✓ FIXED: Was RPC_NOT_AVAILABLE
  INVALID_LOCK = 'INVALID_LOCK',           // ✓ FIXED: Was LOCK_INVALID
  SLOT_NOT_FOUND = 'SLOT_NOT_FOUND'        // ✓ Aligned
}

export class BookingError extends Error {
  constructor(
    public type: BookingErrorType,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'BookingError'
  }
}

export class BookingService {
  /**
   * CRITICAL: Get available slots - ONLY THROUGH RPC
   * FIXED: Removed ensureRPCAvailable() - relying on BookingSystemGuard pre-flight check
   */
  static async getAvailableSlots(eventId: string): Promise<SlotAvailability[]> {
    // REMOVED: ensureRPCAvailable() call
    // Now relying on BookingSystemGuard.checkBookingSystemHealth() 
    // called at page level in UpdatedBookingFlowPage
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_slots', {
        p_event_id: eventId,
        p_session_id: this.getSessionId()
      })

      if (rpcError) {
        console.error('BookingService.getAvailableSlots RPC error:', rpcError)
        
        // CRITICAL: NO FALLBACK - If RPC fails, the entire operation fails
        if (rpcError.code === 'PGRST202') {
          throw new BookingError(
            BookingErrorType.RPC_UNAVAILABLE,
            'Database migrations required. Please run: supabase db push',
            { code: rpcError.code, hint: rpcError.hint }
          )
        }
        
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          `Failed to load slots: ${rpcError.message}`,
          { code: rpcError.code, details: rpcError.details }
        )
      }

      // FIXED: Validate RPC response structure
      if (!Array.isArray(rpcData)) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Invalid response from availability RPC',
          { receivedType: typeof rpcData }
        )
      }

      return rpcData.map((slot: any) => ({
        slotId: slot.slot_id || slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        totalCapacity: slot.total_capacity,
        availableCount: slot.available_count,
        price: slot.price
      }))
    } catch (error: any) {
      // Re-throw BookingErrors as-is
      if (error instanceof BookingError) {
        throw error
      }
      
      // Wrap unknown errors
      console.error('BookingService.getAvailableSlots unexpected error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        `Unexpected error loading slots: ${error.message}`,
        { originalError: error }
      )
    }
  }

  /**
   * Check if event is bookable (pre-flight check)
   * FIXED: Uses CAPACITY_EXCEEDED instead of CAPACITY_CHANGED
   */
  static async canBookEvent(eventId: string, quantity: number): Promise<{
    canBook: boolean
    reason: string | null
    availableSlots: number
  }> {
    // FIXED: Validate quantity before proceeding
    if (!Number.isInteger(quantity) || quantity < 1) {
      return {
        canBook: false,
        reason: 'Invalid quantity: must be a positive integer',
        availableSlots: 0
      }
    }

    // Pre-flight health check via guard
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

      if (error) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          `Failed to check booking eligibility: ${error.message}`,
          { code: error.code }
        )
      }

      if (!data || data.length === 0) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Unable to verify booking eligibility: empty response'
        )
      }

      const result = data[0]
      return {
        canBook: result.can_book,
        reason: result.can_book ? null : result.reason,
        availableSlots: result.available_slots || 0
      }
    } catch (error: any) {
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.canBookEvent error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        `Failed to check booking eligibility: ${error.message}`,
        { originalError: error }
      )
    }
  }

  /**
   * Create slot lock with server-side validation
   * FIXED: Uses CAPACITY_EXCEEDED and SLOT_NOT_FOUND
   */
  static async createSlotLock(
    slotId: string,
    quantity: number,
    sessionId?: string,
    userId?: string
  ): Promise<{ lockId: string, expiresAt: string }> {
    // CRITICAL: Validate quantity BEFORE creating lock
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BookingError(
        BookingErrorType.INVALID_QUANTITY,
        'Quantity must be a positive integer',
        { provided: quantity }
      )
    }

    try {
      const { data: lockId, error } = await supabase.rpc('create_slot_lock', {
        p_slot_id: slotId,
        p_user_id: userId || null,
        p_session_id: sessionId || this.getSessionId(),
        p_quantity: quantity,
        p_lock_duration_minutes: 10
      })

      if (error) {
        // FIXED: Parse specific error types with aligned enum names
        if (error.message?.includes('capacity')) {
          throw new BookingError(
            BookingErrorType.CAPACITY_EXCEEDED, // FIXED: Was CAPACITY_CHANGED
            `Not enough capacity: requested ${quantity} but insufficient slots available`,
            { code: error.code, quantity }
          )
        }
        
        if (error.message?.includes('not found') || error.message?.includes('invalid')) {
          throw new BookingError(
            BookingErrorType.SLOT_NOT_FOUND, // FIXED: Now properly aligned
            'Slot not found or no longer available',
            { code: error.code }
          )
        }
        
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          `Failed to create lock: ${error.message}`,
          { code: error.code }
        )
      }

      if (!lockId) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Lock creation returned no ID'
        )
      }

      // CRITICAL: Fetch server-generated expiry time (SINGLE SOURCE OF TRUTH)
      const { data: lockData, error: fetchError } = await supabase
        .from('slot_locks')
        .select('expires_at')
        .eq('id', lockId)
        .single()

      if (fetchError) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          `Lock created but failed to fetch expiry: ${fetchError.message}`,
          { lockId, code: fetchError.code }
        )
      }

      if (!lockData?.expires_at) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Lock created but has no expiry time',
          { lockId }
        )
      }

      return {
        lockId,
        expiresAt: lockData.expires_at
      }
    } catch (error: any) {
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.createSlotLock unexpected error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        `Unexpected error creating lock: ${error.message}`,
        { originalError: error }
      )
    }
  }

  /**
   * Server-side lock verification (AUTHORITY)
   * FIXED: Clear error types with aligned enum names
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

      if (error) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          `Failed to verify lock: ${error.message}`,
          { lockId, code: error.code }
        )
      }

      if (!data || data.length === 0) {
        return {
          isValid: false,
          reason: 'Lock not found',
          expiresAt: null
        }
      }

      const result = data[0]
      
      // FIXED: Return specific reasons for invalidity
      if (!result.is_valid) {
        const reason = result.reason || 'Lock is no longer valid'
        return {
          isValid: false,
          reason,
          expiresAt: result.expires_at
        }
      }

      return {
        isValid: true,
        reason: null,
        expiresAt: result.expires_at
      }
    } catch (error: any) {
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.verifyLock error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        `Failed to verify lock: ${error.message}`,
        { lockId, originalError: error }
      )
    }
  }

  /**
   * Complete booking with server-side validation
   * FIXED: Uses INVALID_LOCK instead of LOCK_INVALID
   */
  static async completeBooking(
    lockId: string,
    formData: BookingFormData
  ): Promise<ConfirmedBooking> {
    // CRITICAL: Validate lock before attempting booking
    const lockStatus = await this.verifyLock(lockId)
    
    if (!lockStatus.isValid) {
      // FIXED: Parse lock failure reason with aligned enum
      if (lockStatus.reason?.includes('expired')) {
        throw new BookingError(
          BookingErrorType.LOCK_EXPIRED,
          'Your reservation has expired. Please select a new slot.',
          { lockId, reason: lockStatus.reason }
        )
      }
      
      throw new BookingError(
        BookingErrorType.INVALID_LOCK, // FIXED: Was LOCK_INVALID
        lockStatus.reason || 'Lock is no longer valid',
        { lockId }
      )
    }

    try {
      const { data: bookingId, error } = await supabase.rpc('complete_slot_booking', {
        p_lock_id: lockId,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_email: formData.email,
        p_phone: formData.phone || null,
        p_notes: formData.notes || null
      })

      if (error) {
        // FIXED: Parse specific error types with aligned enum names
        if (error.message?.includes('expired')) {
          throw new BookingError(
            BookingErrorType.LOCK_EXPIRED,
            'Your reservation expired while confirming. Please select a new slot.',
            { lockId, code: error.code }
          )
        }
        
        if (error.message?.includes('capacity') || error.message?.includes('full')) {
          throw new BookingError(
            BookingErrorType.SLOT_FULL,
            'This slot is now full. Please select another slot.',
            { lockId, code: error.code }
          )
        }
        
        if (error.message?.includes('not found')) {
          throw new BookingError(
            BookingErrorType.INVALID_LOCK, // FIXED: Was LOCK_INVALID
            'Reservation not found. Please start over.',
            { lockId, code: error.code }
          )
        }
        
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          `Failed to complete booking: ${error.message}`,
          { lockId, code: error.code }
        )
      }

      if (!bookingId) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Booking creation returned no ID',
          { lockId }
        )
      }

      // Fetch confirmed booking details
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (fetchError) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          `Booking created but failed to fetch details: ${fetchError.message}`,
          { bookingId, code: fetchError.code }
        )
      }

      if (!booking) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Booking created but not found in database',
          { bookingId }
        )
      }

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
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.completeBooking unexpected error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        `Unexpected error completing booking: ${error.message}`,
        { lockId, originalError: error }
      )
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

  /**
   * Get event by ID (for public event pages)
   */
  static async getEventById(eventId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (error) throw error
      return data
    } catch (error: any) {
      console.error('BookingService.getEventById error:', error)
      throw error
    }
  }

  /**
   * Get event slots for admin management
   */
  static async getEventSlots(eventId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error: any) {
      console.error('BookingService.getEventSlots error:', error)
      throw error
    }
  }

  /**
   * Generate event slots
   */
  static async generateEventSlots(
    eventId: string,
    startDate: string,
    endDate: string,
    capacityPerSlot: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('generate_event_slots', {
        p_event_id: eventId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_capacity_per_slot: capacityPerSlot
      })

      if (error) throw error
      return data || 0
    } catch (error: any) {
      console.error('BookingService.generateEventSlots error:', error)
      throw error
    }
  }
}