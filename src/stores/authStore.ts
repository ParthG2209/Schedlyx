// src/stores/authStore.ts
// FIXED: Canonical auth state with clear invariants, no localStorage dependencies

import { create } from 'zustand'
import { User } from '../types'
import { auth } from '../lib/supabase'

/**
 * CANONICAL AUTH STATE INVARIANTS
 * 
 * Valid state combinations:
 * 1. loading=true, user=null, initialized=false → Initial load
 * 2. loading=false, user=null, initialized=true → Not authenticated
 * 3. loading=false, user=User, initialized=true → Authenticated
 * 
 * INVALID combinations (should never occur):
 * - loading=false, user=User, initialized=false
 * - loading=true, user=User (partial load)
 * - Any state with inconsistent isAuthenticated
 */

export enum AuthErrorType {
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  OAUTH_CANCELLED = 'OAUTH_CANCELLED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNKNOWN = 'UNKNOWN'
}

export interface ClassifiedError {
  type: AuthErrorType
  message: string
  userMessage: string
  retryable: boolean
}

interface AuthState {
  // Core state (CANONICAL)
  user: User | null
  loading: boolean
  initialized: boolean
  
  // Derived state (computed from core)
  isAuthenticated: boolean
  
  // Error state
  error: ClassifiedError | null
  
  // Verification flow state (UX only, not auth-gating)
  emailVerificationRequired: boolean
  verificationEmail: string | null
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendVerificationEmail: (email: string) => Promise<void>
  clearError: () => void
  clearVerificationState: () => void
  
  // Internal state management
  _setAuthState: (state: Partial<Pick<AuthState, 'user' | 'loading' | 'initialized' | 'isAuthenticated'>>) => void
  _assertValidState: () => void
}

/**
 * Classify authentication errors
 */
function classifyError(error: any): ClassifiedError {
  const message = error?.message?.toLowerCase() || ''
  
  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return {
      type: AuthErrorType.EMAIL_NOT_VERIFIED,
      message: error.message,
      userMessage: 'Please verify your email address before signing in.',
      retryable: false
    }
  }
  
  if (message.includes('invalid') || message.includes('incorrect')) {
    return {
      type: AuthErrorType.INVALID_CREDENTIALS,
      message: error.message,
      userMessage: 'Invalid email or password.',
      retryable: true
    }
  }
  
  if (message.includes('cancelled') || message.includes('user_cancelled')) {
    return {
      type: AuthErrorType.OAUTH_CANCELLED,
      message: error.message,
      userMessage: 'Sign in was cancelled.',
      retryable: true
    }
  }
  
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      message: error.message,
      userMessage: 'Network error. Please check your connection.',
      retryable: true
    }
  }
  
  if (message.includes('expired') || message.includes('jwt')) {
    return {
      type: AuthErrorType.SESSION_EXPIRED,
      message: error.message,
      userMessage: 'Your session has expired. Please sign in again.',
      retryable: true
    }
  }
  
  return {
    type: AuthErrorType.UNKNOWN,
    message: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred.',
    retryable: true
  }
}

/**
 * Convert Supabase user to app User
 */
const supabaseUserToAppUser = (supabaseUser: any): User => {
  const metadata = supabaseUser.user_metadata || {}
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName: metadata.firstName || metadata.first_name || metadata.given_name || '',
    lastName: metadata.lastName || metadata.last_name || metadata.family_name || '',
    avatar: metadata.avatar || metadata.avatar_url || metadata.picture,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at || supabaseUser.created_at
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // CANONICAL INITIAL STATE
  user: null,
  loading: true,
  initialized: false,
  isAuthenticated: false,
  error: null,
  emailVerificationRequired: false,
  verificationEmail: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const { user, session } = await auth.signIn(email, password)
      
      if (user && session) {
        get()._setAuthState({
          user: supabaseUserToAppUser(user),
          loading: false,
          initialized: true,
          isAuthenticated: true
        })
        set({ 
          emailVerificationRequired: false,
          verificationEmail: null
        })
      }
    } catch (error: any) {
      const classified = classifyError(error)
      
      if (classified.type === AuthErrorType.EMAIL_NOT_VERIFIED) {
        set({ 
          loading: false,
          error: classified,
          emailVerificationRequired: true,
          verificationEmail: email
        })
      } else {
        set({ 
          loading: false,
          error: classified,
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
      
      // Email confirmation required (most common flow)
      if (user && !session) {
        set({ 
          user: null,
          loading: false,
          initialized: true,
          isAuthenticated: false,
          emailVerificationRequired: true,
          verificationEmail: email
        })
      } 
      // Instant login (some configurations)
      else if (user && session) {
        get()._setAuthState({
          user: supabaseUserToAppUser(user),
          loading: false,
          initialized: true,
          isAuthenticated: true
        })
        set({ 
          emailVerificationRequired: false,
          verificationEmail: null
        })
      }
    } catch (error: any) {
      const classified = classifyError(error)
      set({ 
        loading: false,
        error: classified,
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
      // OAuth redirect - state will update on callback
    } catch (error: any) {
      const classified = classifyError(error)
      set({ loading: false, error: classified })
      throw error
    }
  },

  signOut: async () => {
    set({ loading: true, error: null })
    try {
      await auth.signOut()
      get()._setAuthState({
        user: null,
        loading: false,
        initialized: true,
        isAuthenticated: false
      })
      set({ 
        emailVerificationRequired: false,
        verificationEmail: null
      })
    } catch (error: any) {
      const classified = classifyError(error)
      set({ loading: false, error: classified })
      throw error
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null })
    try {
      await auth.resetPassword(email)
      set({ loading: false })
    } catch (error: any) {
      const classified = classifyError(error)
      set({ loading: false, error: classified })
      throw error
    }
  },

  resendVerificationEmail: async (email: string) => {
    set({ loading: true, error: null })
    try {
      await auth.resendConfirmationEmail(email)
      set({ loading: false })
    } catch (error: any) {
      const classified = classifyError(error)
      set({ loading: false, error: classified })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },

  clearVerificationState: () => {
    set({ 
      emailVerificationRequired: false,
      verificationEmail: null
    })
  },

  // INTERNAL: Set auth state with validation
  _setAuthState: (newState) => {
    set(newState)
    get()._assertValidState()
  },

  // INTERNAL: Assert state invariants
  _assertValidState: () => {
    const state = get()
    
    // Invariant: isAuthenticated must match user presence
    if (state.isAuthenticated !== !!state.user) {
      console.error('[AuthStore] INVALID STATE: isAuthenticated/user mismatch', {
        isAuthenticated: state.isAuthenticated,
        hasUser: !!state.user
      })
    }
    
    // Invariant: initialized must be true when loading is false
    if (!state.loading && !state.initialized) {
      console.error('[AuthStore] INVALID STATE: not loading but not initialized')
    }
    
    // Invariant: if authenticated, must have user
    if (state.isAuthenticated && !state.user) {
      console.error('[AuthStore] INVALID STATE: authenticated without user')
      // Auto-fix
      set({ isAuthenticated: false })
    }
  }
}))

/**
 * Initialize auth listener
 * DETERMINISTIC: No fallbacks or timeouts
 */
if (typeof window !== 'undefined') {
  auth.onAuthStateChange((event, session) => {
    console.log('[AuthStore] Auth event:', event)
    
    const store = useAuthStore.getState()
    
    if (event === 'INITIAL_SESSION') {
      if (session?.user) {
        store._setAuthState({
          user: supabaseUserToAppUser(session.user),
          loading: false,
          initialized: true,
          isAuthenticated: true
        })
      } else {
        store._setAuthState({
          user: null,
          loading: false,
          initialized: true,
          isAuthenticated: false
        })
      }
    } else if (event === 'SIGNED_IN' && session?.user) {
      store._setAuthState({
        user: supabaseUserToAppUser(session.user),
        loading: false,
        initialized: true,
        isAuthenticated: true
      })
      useAuthStore.setState({ 
        emailVerificationRequired: false,
        verificationEmail: null
      })
    } else if (event === 'SIGNED_OUT') {
      store._setAuthState({
        user: null,
        loading: false,
        initialized: true,
        isAuthenticated: false
      })
      useAuthStore.setState({ 
        emailVerificationRequired: false,
        verificationEmail: null
      })
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      store._setAuthState({
        user: supabaseUserToAppUser(session.user),
        loading: false,
        initialized: true,
        isAuthenticated: true
      })
    } else if (event === 'USER_UPDATED' && session?.user) {
      store._setAuthState({
        user: supabaseUserToAppUser(session.user),
        loading: false,
        initialized: true,
        isAuthenticated: true
      })
    }
  })
}