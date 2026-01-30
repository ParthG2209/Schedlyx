// src/hooks/useAuth.ts
// FIXED: Clear state contract, documented valid states

import { useAuthStore } from '../stores/authStore'

/**
 * AUTH STATE CONTRACT
 * 
 * This hook provides the CANONICAL auth state.
 * All components should use this hook for auth checks.
 * 
 * VALID STATE COMBINATIONS:
 * 
 * 1. Initial Load
 *    - loading: true
 *    - initialized: false
 *    - isAuthenticated: false
 *    - user: null
 * 
 * 2. Not Authenticated (loaded)
 *    - loading: false
 *    - initialized: true
 *    - isAuthenticated: false
 *    - user: null
 * 
 * 3. Authenticated (loaded)
 *    - loading: false
 *    - initialized: true
 *    - isAuthenticated: true
 *    - user: User (non-null)
 * 
 * INVARIANTS:
 * - isAuthenticated === true IMPLIES user !== null
 * - isAuthenticated === false IMPLIES user === null
 * - loading === false IMPLIES initialized === true
 * 
 * INVALID STATES (should never occur):
 * - isAuthenticated: true, user: null
 * - isAuthenticated: false, user: User
 * - loading: false, initialized: false
 */

export interface UseAuthReturn {
  // Core state
  user: any | null
  loading: boolean
  initialized: boolean
  isAuthenticated: boolean
  
  // Error state
  error: any | null
  
  // Verification flow (UX only)
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
}

/**
 * Primary auth hook
 * 
 * Usage:
 * ```tsx
 * const { user, loading, isAuthenticated, signIn } = useAuth()
 * 
 * if (loading) return <Loading />
 * if (!isAuthenticated) return <Login />
 * return <Dashboard user={user} />
 * ```
 */
export function useAuth(): UseAuthReturn {
  const store = useAuthStore()
  
  // Validate state invariants in development
  if (process.env.NODE_ENV === 'development') {
    validateAuthState(store)
  }
  
  return {
    user: store.user,
    loading: store.loading,
    initialized: store.initialized,
    isAuthenticated: store.isAuthenticated,
    error: store.error,
    emailVerificationRequired: store.emailVerificationRequired,
    verificationEmail: store.verificationEmail,
    signIn: store.signIn,
    signUp: store.signUp,
    signInWithGoogle: store.signInWithGoogle,
    signOut: store.signOut,
    resetPassword: store.resetPassword,
    resendVerificationEmail: store.resendVerificationEmail,
    clearError: store.clearError
  }
}

/**
 * Validate auth state invariants
 * Logs warnings in development if state is inconsistent
 */
function validateAuthState(state: any) {
  const violations: string[] = []
  
  // Invariant 1: isAuthenticated implies user exists
  if (state.isAuthenticated && !state.user) {
    violations.push('isAuthenticated is true but user is null')
  }
  
  // Invariant 2: user exists implies isAuthenticated
  if (!state.isAuthenticated && state.user) {
    violations.push('user exists but isAuthenticated is false')
  }
  
  // Invariant 3: not loading implies initialized
  if (!state.loading && !state.initialized) {
    violations.push('loading is false but initialized is false')
  }
  
  // Invariant 4: isAuthenticated matches user presence
  if (state.isAuthenticated !== !!state.user) {
    violations.push(`isAuthenticated (${state.isAuthenticated}) does not match user presence (${!!state.user})`)
  }
  
  if (violations.length > 0) {
    console.error('[useAuth] AUTH STATE VIOLATIONS:', violations)
    console.error('[useAuth] Current state:', {
      loading: state.loading,
      initialized: state.initialized,
      isAuthenticated: state.isAuthenticated,
      hasUser: !!state.user
    })
  }
}

/**
 * Helper: Check if user is in valid authenticated state
 * 
 * Returns true only if:
 * - Auth is initialized
 * - Not loading
 * - User is authenticated
 * - User object exists
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, user, initialized, loading } = useAuth()
  
  return initialized && 
         !loading && 
         isAuthenticated && 
         user !== null
}

/**
 * Helper: Get current user or null
 * 
 * Returns user only if in valid authenticated state
 * Returns null otherwise (including during loading)
 */
export function useCurrentUser() {
  const { user, initialized, loading, isAuthenticated } = useAuth()
  
  if (!initialized || loading || !isAuthenticated) {
    return null
  }
  
  return user
}

/**
 * Helper: Check if auth is still initializing
 */
export function useAuthLoading(): boolean {
  const { loading, initialized } = useAuth()
  return loading || !initialized
}

// Re-export store for advanced use cases
export { useAuthStore }