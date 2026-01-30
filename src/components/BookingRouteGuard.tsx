// src/components/BookingRouteGuard.tsx
// FIX #5: Documentation now matches actual behavior
// 
// BEHAVIOR: NO automatic route-based cleanup
// Lock cleanup happens ONLY via:
// 1. Explicit Cancel button (user intent)
// 2. Server expiry after 10 minutes (automatic)
// 3. Successful booking completion
// 
// This component ONLY handles visibility-based verification
// Does NOT automatically release locks on route changes

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useBookingStore } from '../stores/bookingStore'

/**
 * BookingRouteGuard
 * 
 * FIX #5: Corrected documentation to match behavior
 * 
 * PURPOSE:
 * - Verifies lock validity when user returns to tab (visibility change)
 * - Does NOT automatically release locks on navigation
 * 
 * CLEANUP PHILOSOPHY:
 * ✅ User intent: Cancel button releases lock immediately
 * ✅ Server authority: Locks expire after 10 minutes automatically
 * ❌ NO heuristic cleanup: Route changes are NOT treated as abandonment
 * 
 * WHY NO AUTO-CLEANUP:
 * - Route changes don't always mean user intent to abandon booking
 * - Can trigger on new tabs, feature flags, or unexpected navigation
 * - Server expiry (10 min) is sufficient cleanup mechanism
 * - User can explicitly cancel via Cancel button if needed
 * 
 * USAGE:
 * Place this component at the root of your app (in App.tsx)
 * 
 * ```tsx
 * <BrowserRouter>
 *   <BookingRouteGuard />
 *   <Routes>
 *     ...
 *   </Routes>
 * </BrowserRouter>
 * ```
 */
export function BookingRouteGuard() {

  const { lockId, currentStep, verifyLockValidity } = useBookingStore()

  useEffect(() => {
    // FIX #3 & #4: Only verify lock validity when user returns to tab
    // This handles cases where user left tab and lock may have expired
    const handleVisibilityChange = () => {
      if (!document.hidden && lockId && currentStep === 'fill-details') {
        console.log('[BookingRouteGuard] Tab visible - verifying lock validity')
        verifyLockValidity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [lockId, currentStep, verifyLockValidity])

  // FIX #5: NO automatic cleanup on route change
  // This was causing valid locks to be released when:
  // - User opened link in new tab
  // - Router briefly changed routes during navigation
  // - Feature flags switched UI paths
  // 
  // Lock cleanup now happens ONLY via:
  // 1. Explicit Cancel button (user intent)
  // 2. Server expiry after 10 minutes (automatic)
  // 3. Successful booking completion

  return null
}

/**
 * useBookingCleanup
 * 
 * FIX #5: Removed automatic cleanup hook
 * 
 * This hook previously released locks on component unmount,
 * but that's too aggressive and caused race conditions.
 * 
 * Lock cleanup now follows this strategy:
 * - User clicks Cancel → immediate release
 * - User completes booking → lock consumed
 * - User abandons flow → server expires lock after 10 min
 * 
 * @deprecated Use explicit cancelBooking() from store instead
 */
export function useBookingCleanup() {
  // No-op - cleanup is manual only
  console.warn('[Deprecated] useBookingCleanup is deprecated - use cancelBooking() explicitly')
}