// src/lib/supabase.ts
// FIXED: Proper storage key migration from custom to default

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * MIGRATION: Handle storage key change
 * 
 * Previous versions used custom storageKey
 * Now using default Supabase keys
 * 
 * This function migrates existing sessions
 */
function migrateStorageKeys() {
  if (typeof window === 'undefined') return

  try {
    const oldStorageKey = 'schedlyx-auth-token' // Previous custom key
    const defaultStorageKey = 'sb-auth-token' // Supabase default

    // Check if old key exists
    const oldSession = localStorage.getItem(oldStorageKey)

    if (oldSession && !localStorage.getItem(defaultStorageKey)) {
      console.log('[Supabase] Migrating session from old storage key')

      // Copy to default key
      localStorage.setItem(defaultStorageKey, oldSession)

      // Remove old key after successful migration
      localStorage.removeItem(oldStorageKey)

      console.log('[Supabase] Session migration complete')
    }
  } catch (error) {
    console.error('[Supabase] Storage migration failed:', error)
    // Non-fatal - user can sign in again
  }
}

// Run migration before creating client
migrateStorageKeys()

/**
 * Supabase Client Configuration
 * 
 * FIXED:
 * - Uses default storage keys (no custom storageKey)
 * - Proper PKCE flow for OAuth
 * - Session persistence enabled
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // FIXED: No custom storageKey - use Supabase defaults
    // This ensures compatibility with all auth flows
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
})

/**
 * Auth Helper Functions
 */
export const auth = {
  // Email/Password Sign Up
  signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (error) throw error
    return data
  },

  // Email/Password Sign In
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  },

  // Google OAuth Sign In
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })

    if (error) throw error
    return data
  },

  // Sign Out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get Current User
  getCurrentUser: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data
  },

  // Get Session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data
  },

  // Reset Password
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })

    if (error) throw error
    return data
  },

  // Update Password
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
    return data
  },

  // Resend confirmation email
  resendConfirmationEmail: async (email: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) throw error
    return data
  },

  // Listen for Auth State Changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

/**
 * Database Helper Functions
 */
export const db = {
  // Events
  getEvents: async (userId?: string) => {
    let query = supabase.from('events').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    }
    return await query
  },

  getEvent: async (id: string) => {
    return await supabase.from('events').select('*').eq('id', id).single()
  },

  createEvent: async (eventData: any) => {
    return await supabase.from('events').insert(eventData).select().single()
  },

  updateEvent: async (id: string, eventData: any) => {
    return await supabase.from('events').update(eventData).eq('id', id).select().single()
  },

  deleteEvent: async (id: string) => {
    return await supabase.from('events').delete().eq('id', id)
  },

  // Bookings
  getBookings: async (eventId?: string, userId?: string) => {
    let query = supabase.from('bookings').select('*')
    if (eventId) {
      query = query.eq('event_id', eventId)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    return await query
  },

  createBooking: async (bookingData: any) => {
    return await supabase.from('bookings').insert(bookingData).select().single()
  },

  updateBooking: async (id: string, bookingData: any) => {
    return await supabase.from('bookings').update(bookingData).eq('id', id).select().single()
  },

  deleteBooking: async (id: string) => {
    return await supabase.from('bookings').delete().eq('id', id)
  },

  // Get booking by reference with related event and slot data
  getBookingByReference: async (bookingReference: string) => {
    return await supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        first_name,
        last_name,
        email,
        phone,
        notes,
        status,
        confirmed_at,
        created_at,
        event:events (
          id,
          title,
          description,
          type,
          duration,
          location,
          is_online
        ),
        slot:time_slots (
          id,
          start_time,
          end_time,
          price,
          currency
        )
      `)
      .eq('booking_reference', bookingReference)
      .single()
  }
}

/**
 * Session Cleanup Utility
 * Call this if you suspect corrupted session state
 */
export function clearAllAuthStorage() {
  try {
    // Clear all possible auth storage keys
    const keysToRemove = [
      'sb-auth-token',
      'schedlyx-auth-token', // Old custom key
      'supabase.auth.token',
      'schedlyx_signup_timestamp', // Cleanup old markers
      'schedlyx_signup_email',
      'schedlyx_oauth_signup'
    ]

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      } catch (e) {
        // Silent fail - storage might not be available
      }
    })

    console.log('[Supabase] Auth storage cleared')
  } catch (error) {
    console.error('[Supabase] Failed to clear auth storage:', error)
  }
}