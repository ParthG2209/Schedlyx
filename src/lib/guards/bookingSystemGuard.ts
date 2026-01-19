// src/lib/guards/bookingSystemGuard.ts
// FIXED: Added missing supabase import

import { supabase } from '../supabase'

export class BookingSystemGuard {
  private static healthCheckCache: {
    isHealthy: boolean
    checkedAt: number
    error: string | null
  } | null = null

  private static readonly CACHE_DURATION = 60000 // 1 minute

  /**
   * Check if the booking system RPC functions are available
   * This prevents the app from attempting bookings when migrations haven't run
   */
  static async checkBookingSystemHealth(): Promise<{
    isHealthy: boolean
    error: string | null
    missingComponents: string[]
  }> {
    // Check cache
    if (
      this.healthCheckCache &&
      Date.now() - this.healthCheckCache.checkedAt < this.CACHE_DURATION
    ) {
      return {
        isHealthy: this.healthCheckCache.isHealthy,
        error: this.healthCheckCache.error,
        missingComponents: []
      }
    }

    const missingComponents: string[] = []
    let isHealthy = true
    let error: string | null = null

    try {
      // Test 1: Check if get_available_slots exists
      const { error: rpcError1 } = await supabase.rpc('get_available_slots', {
        p_event_id: '00000000-0000-0000-0000-000000000000',
        p_session_id: 'health-check'
      })

      if (rpcError1 && rpcError1.code === 'PGRST202') {
        missingComponents.push('get_available_slots')
        isHealthy = false
      }

      // Test 2: Check if can_book_event exists
      const { error: rpcError2 } = await supabase.rpc('can_book_event', {
        p_event_id: '00000000-0000-0000-0000-000000000000',
        p_quantity: 1
      })

      if (rpcError2 && rpcError2.code === 'PGRST202') {
        missingComponents.push('can_book_event')
        isHealthy = false
      }

      // Test 3: Check if verify_lock exists
      const { error: rpcError3 } = await supabase.rpc('verify_lock', {
        p_lock_id: '00000000-0000-0000-0000-000000000000'
      })

      if (rpcError3 && rpcError3.code === 'PGRST202') {
        missingComponents.push('verify_lock')
        isHealthy = false
      }

      if (!isHealthy) {
        error = `Missing required RPC functions: ${missingComponents.join(', ')}. Please run database migrations.`
      }

    } catch (err: any) {
      isHealthy = false
      error = `Booking system health check failed: ${err.message}`
      console.error('Booking system health check error:', err)
    }

    // Cache result
    this.healthCheckCache = {
      isHealthy,
      checkedAt: Date.now(),
      error
    }

    return { isHealthy, error, missingComponents }
  }

  /**
   * Invalidate the health check cache
   * Call this after running migrations or when you want to force a recheck
   */
  static invalidateCache() {
    this.healthCheckCache = null
  }
}