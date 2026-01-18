import { useAuthStore } from '../stores/authStore'
export { useAuthStore }

export function useAuth() {
  const { 
    user, 
    loading, 
    error,
    signIn, 
    signUp, 
    signInWithGoogle,
    signOut,
    resetPassword,
    clearError
  } = useAuthStore()

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearError
  }
}