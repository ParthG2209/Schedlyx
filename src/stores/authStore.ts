// src/stores/authStore.ts
import { create } from 'zustand'
import { User } from '../types'
import { auth } from '../lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  emailVerificationRequired: boolean
  verificationEmail: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendVerificationEmail: (email: string) => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearVerificationState: () => void
}

/**
 * Safe user metadata extraction
 * Handles missing or malformed user metadata gracefully
 */
const extractUserMetadata = (user: any): Pick<User, 'firstName' | 'lastName' | 'avatar'> => {
  const metadata = user.user_metadata || {}
  
  return {
    firstName: metadata.firstName || 
               metadata.first_name || 
               metadata.given_name || 
               '',
    lastName: metadata.lastName || 
              metadata.last_name || 
              metadata.family_name || 
              '',
    avatar: metadata.avatar || 
            metadata.avatar_url || 
            metadata.picture || 
            undefined
  }
}

/**
 * Convert Supabase user to app User type
 */
const supabaseUserToAppUser = (supabaseUser: any): User => {
  const { firstName, lastName, avatar } = extractUserMetadata(supabaseUser)
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName,
    lastName,
    avatar,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at || supabaseUser.created_at
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  emailVerificationRequired: false,
  verificationEmail: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const { user, session } = await auth.signIn(email, password)
      
      if (user && session) {
        set({ 
          user: supabaseUserToAppUser(user),
          loading: false,
          error: null,
          emailVerificationRequired: false,
          verificationEmail: null
        })
      }
    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
        set({ 
          loading: false, 
          error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          emailVerificationRequired: true,
          verificationEmail: email
        })
      } else {
        set({ 
          loading: false, 
          error: error.message || 'Failed to sign in',
          emailVerificationRequired: false,
          verificationEmail: null
        })
      }
      throw error
    }
  },

  signUp: async (email: string, password: string, metadata = {}) => {
    set({ loading: true, error: null })
    try {
      const { user, session } = await auth.signUp(email, password, metadata)
      
      if (user && !session) {
        set({ 
          user: null,
          loading: false,
          error: null,
          emailVerificationRequired: true,
          verificationEmail: email
        })
      } else if (user && session) {
        set({ 
          user: supabaseUserToAppUser(user),
          loading: false,
          error: null,
          emailVerificationRequired: false,
          verificationEmail: null
        })
      }
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to sign up',
        emailVerificationRequired: false,
        verificationEmail: null
      })
      throw error
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null })
    try {
      await auth.signInWithGoogle()
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to sign in with Google',
        emailVerificationRequired: false,
        verificationEmail: null
      })
      throw error
    }
  },

  signOut: async () => {
    set({ loading: true, error: null })
    try {
      await auth.signOut()
      set({ 
        user: null, 
        loading: false, 
        error: null,
        emailVerificationRequired: false,
        verificationEmail: null
      })
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to sign out',
        emailVerificationRequired: false,
        verificationEmail: null
      })
      throw error
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null })
    try {
      await auth.resetPassword(email)
      set({ loading: false, error: null })
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to send reset password email' 
      })
      throw error
    }
  },

  resendVerificationEmail: async (email: string) => {
    set({ loading: true, error: null })
    try {
      await auth.resendConfirmationEmail(email)
      set({ loading: false, error: null })
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to resend verification email' 
      })
      throw error
    }
  },

  setUser: (user: User | null) => {
    set({ 
      user, 
      loading: false,
      emailVerificationRequired: false,
      verificationEmail: null
    })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  clearVerificationState: () => {
    set({ 
      emailVerificationRequired: false,
      verificationEmail: null
    })
  }
}))

/**
 * Initialize auth state on client side only
 * FIXED: Removed auth.getSession() block - rely only on onAuthStateChange
 */
if (typeof window !== 'undefined') {
  // Listen for auth changes - this is the single source of truth
  auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      // Handle initial session load
      if (session?.user) {
        useAuthStore.getState().setUser(supabaseUserToAppUser(session.user))
      } else {
        useAuthStore.getState().clearVerificationState()
        useAuthStore.getState().setLoading(false)
      }
    } else if (event === 'SIGNED_IN' && session?.user) {
      useAuthStore.getState().setUser(supabaseUserToAppUser(session.user))
      useAuthStore.getState().clearVerificationState()
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null)
      useAuthStore.getState().clearVerificationState()
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      useAuthStore.getState().setUser(supabaseUserToAppUser(session.user))
    } else if (event === 'USER_UPDATED' && session?.user) {
      useAuthStore.getState().setUser(supabaseUserToAppUser(session.user))
    }
  })
}