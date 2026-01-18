import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Fixed: Changed back from 'implicit' to 'pkce' for better security
    // Fixed: Removed window.localStorage reference to prevent SSR crashes
    storageKey: 'schedlyx-auth'
  }
})

// Auth helpers
export const auth = {
  // Email/Password Sign Up - with email confirmation required
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
    const baseUrl = window.location.origin
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: false
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

// Database helpers
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
  }
}