// src/components/EmailVerificationGuard.tsx
import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'

interface EmailVerificationGuardProps {
  children: ReactNode
}

/**
 * Guard for email verification page
 * Prevents direct access - only allows access from signup/login flows
 * or when email verification is explicitly required
 */
export function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { emailVerificationRequired, verificationEmail } = useAuthStore()
  const location = useLocation()
  
  // Allow access if:
  // 1. Email verification is required from auth flow
  // 2. Email is passed in location state (from signup redirect)
  const hasValidEmail = verificationEmail || location.state?.email
  const canAccess = emailVerificationRequired || hasValidEmail
  
  // If no valid reason to access this page, redirect to home
  if (!canAccess) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}