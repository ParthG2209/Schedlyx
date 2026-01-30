// src/stores/bookingStore.ts
// COMPREHENSIVE FIXES FOR ALL 6 CRITICAL ISSUES
// 
// FIXES APPLIED:
// 1. ✅ Enum consistency - using LOCK_INVALID throughout
// 2. ✅ Quantity enforcement at completion - passed to completeBooking
// 3. ✅ Timer expiry now forces verification and state reset
// 4. ✅ verifyLockValidity forces navigation reset on failure
// 5. ✅ Documentation matches behavior (no auto-cleanup)
// 6. ✅ availableCount clearly marked as UX-only with warnings

import { create } from 'zustand'
import { BookingService, BookingError, BookingErrorType } from '../lib/services/bookingService'

interface SlotAvailability {
  slotId: string
  startTime: string
  endTime: string
  totalCapacity: number
  availableCount: number
  price: number
}

interface BookingFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  notes?: string
}

interface ConfirmedBooking {
  id: string
  bookingReference: string
  eventId: string
  slotId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  date: string
  time: string
  status: string
  confirmedAt: string
  createdAt: string
}

type BookingStep = 'select-slot' | 'fill-details' | 'completed'

interface BookingState {
  currentStep: BookingStep
  selectedSlot: SlotAvailability | null
  selectedQuantity: number
  lockId: string | null
  lockExpiresAt: string | null
  formData: BookingFormData
  booking: ConfirmedBooking | null
  error: string | null
  errorType: BookingErrorType | null
  loading: boolean
  timeRemaining: number
}

interface BookingStore extends BookingState {
  selectSlot: (slot: SlotAvailability, quantity: number) => Promise<void>
  updateFormData: (data: Partial<BookingFormData>) => void
  confirmBooking: () => Promise<void>
  cancelBooking: () => void
  resetBooking: () => void
  clearError: () => void
  verifyLockValidity: () => Promise<boolean>
}

const initialFormData: BookingFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: ''
}

export const useBookingStore = create<BookingStore>((set, get) => {
  // Timer interval ID (stored outside Zustand state to avoid re-renders)
  let timerIntervalId: NodeJS.Timeout | null = null

  return {
    // Initial state
    currentStep: 'select-slot',
    selectedSlot: null,
    selectedQuantity: 1,
    lockId: null,
    lockExpiresAt: null,
    formData: initialFormData,
    booking: null,
    error: null,
    errorType: null,
    loading: false,
    timeRemaining: 0,

    /**
     * FIX #2: Removed client-side availableCount validation from blocking logic
     * FIX #6: Added clear warning that availableCount is UX-only and may be stale
     */
    selectSlot: async (slot: SlotAvailability, quantity: number) => {
      // Basic validation for UX only - server is authority
      if (!Number.isInteger(quantity) || quantity <= 0) {
        set({
          error: `Invalid quantity: ${quantity}. Please select a valid number of seats.`,
          errorType: BookingErrorType.INVALID_QUANTITY
        })
        return
      }

      // FIX #6: UX hint only - NOT a guard
      // WARNING: availableCount may be stale. Server is the only source of truth.
      if (quantity > slot.availableCount) {
        console.warn(
          `[UX Warning] Requested quantity (${quantity}) exceeds displayed availability (${slot.availableCount}). ` +
          `This is a UX hint only. Server will perform authoritative validation.`
        )
        
        set({
          error: `Note: Only ${slot.availableCount} seat${slot.availableCount === 1 ? '' : 's'} appear available. ` +
                 `We'll check with the server...`,
          errorType: null // Not a blocking error - just a warning
        })
      }

      set({ loading: true, error: null, errorType: null })
      
      try {
        // FIX #2: Server is sole authority - no client-side parameters
        // Only pass slotId and quantity - server decides everything else
        const { lockId, expiresAt } = await BookingService.createSlotLock(
          slot.slotId, 
          quantity
          // ❌ REMOVED: slot.availableCount - not sent to server
        )
        
        set({
          selectedSlot: slot,
          selectedQuantity: quantity,
          lockId,
          lockExpiresAt: expiresAt,
          currentStep: 'fill-details',
          loading: false,
          error: null,
          errorType: null
        })
        
        // Clear any existing timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
        }
        
        // FIX #3: Start countdown timer with automatic verification on expiry
        timerIntervalId = setInterval(() => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            set({ timeRemaining: remaining })
            
            // FIX #3: When timer hits zero, force verification and reset
            if (remaining <= 0) {
              console.warn('[Timer Expiry] Lock timer expired - forcing verification')
              
              if (timerIntervalId) {
                clearInterval(timerIntervalId)
                timerIntervalId = null
              }
              
              // Force lock verification to confirm expiry
              get().verifyLockValidity().then(isValid => {
                if (!isValid) {
                  console.error('[Timer Expiry] Lock verification failed - resetting booking flow')
                }
              })
            }
          }
        }, 1000)
        
      } catch (error: any) {
        console.error('Error selecting slot:', error)
        
        if (error instanceof BookingError) {
          set({
            loading: false,
            error: error.message,
            errorType: error.type
          })
        } else {
          set({
            loading: false,
            error: error.message || 'Failed to reserve slot. Please try again.',
            errorType: BookingErrorType.SYSTEM_ERROR
          })
        }
      }
    },

    updateFormData: (data: Partial<BookingFormData>) => {
      set(state => ({
        formData: { ...state.formData, ...data }
      }))
    },

    /**
     * FIX #2: Quantity now properly passed to booking completion
     * Atomic booking confirmation with full quantity validation
     */
    confirmBooking: async () => {
      const { lockId, formData, selectedQuantity } = get()
      
      // FIX #1: Using consistent enum - LOCK_INVALID (not INVALID_LOCK)
      if (!lockId) {
        set({ 
          error: 'No active reservation found',
          errorType: BookingErrorType.LOCK_INVALID
        })
        return
      }
      
      // FIX #2: Validate quantity before submission
      if (!selectedQuantity || selectedQuantity <= 0) {
        set({
          error: 'Invalid booking quantity. Please start over.',
          errorType: BookingErrorType.INVALID_QUANTITY
        })
        return
      }
      
      set({ loading: true, error: null, errorType: null })
      
      try {
        // FIX #2: Pass quantity to completeBooking for server-side validation
        // The backend RPC will re-validate quantity against current capacity
        const booking = await BookingService.completeBooking(
          lockId, 
          formData,
          selectedQuantity  // ✅ FIX #2: Quantity now enforced at completion
        )
        
        // Clear timer on success
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
          timerIntervalId = null
        }
        
        set({
          booking,
          currentStep: 'completed',
          loading: false,
          error: null,
          errorType: null
        })
      } catch (error: any) {
        console.error('Error confirming booking:', error)
        
        if (error instanceof BookingError) {
          if (error.type === BookingErrorType.LOCK_EXPIRED ||
              error.type === BookingErrorType.CAPACITY_CHANGED ||
              error.type === BookingErrorType.CAPACITY_EXCEEDED) {
            
            // Clear timer
            if (timerIntervalId) {
              clearInterval(timerIntervalId)
              timerIntervalId = null
            }
            
            // Reset to slot selection
            set({
              error: error.message,
              errorType: error.type,
              currentStep: 'select-slot',
              selectedSlot: null,
              selectedQuantity: 1,
              lockId: null,
              lockExpiresAt: null,
              timeRemaining: 0,
              loading: false
            })
          } else {
            set({
              loading: false,
              error: error.message,
              errorType: error.type
            })
          }
        } else {
          set({
            loading: false,
            error: error.message || 'Failed to complete booking. Please try again.',
            errorType: BookingErrorType.SYSTEM_ERROR
          })
        }
      }
    },

    /**
     * FIX #4: Enhanced verification with forced UI reset on failure
     * Single canonical lock verification method
     * All verification flows through BookingService
     */
    verifyLockValidity: async () => {
      const { lockId } = get()
      
      if (!lockId) return false
      
      try {
        const { isValid, reason } = await BookingService.verifyLock(lockId)
        
        if (!isValid) {
          console.error('[Lock Verification Failed]', reason)
          
          // Clear timer
          if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
          }
          
          // FIX #4: Force complete reset - no ambiguous mid-step state
          set({
            error: reason || 'Your reservation is no longer valid. Please select a new slot.',
            errorType: BookingErrorType.LOCK_EXPIRED,
            currentStep: 'select-slot',  // ✅ FIX #4: Guaranteed reset to start
            selectedSlot: null,
            selectedQuantity: 1,
            lockId: null,
            lockExpiresAt: null,
            timeRemaining: 0,
            loading: false
          })
          
          return false
        }
        
        return true
      } catch (error: any) {
        console.error('Error verifying lock:', error)
        
        if (error instanceof BookingError) {
          // FIX #4: On error, force reset to prevent stuck states
          if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
          }
          
          set({
            error: error.message,
            errorType: error.type,
            currentStep: 'select-slot',  // ✅ FIX #4: Force reset
            selectedSlot: null,
            selectedQuantity: 1,
            lockId: null,
            lockExpiresAt: null,
            timeRemaining: 0,
            loading: false
          })
        }
        
        return false
      }
    },

    /**
     * User-initiated cancellation only
     * This is explicit user intent - not automatic cleanup
     * Best-effort lock release - server will expire anyway
     */
    cancelBooking: () => {
      const { lockId } = get()
      
      // Best-effort cleanup - errors are logged but not thrown
      // Server will expire lock after timeout anyway
      if (lockId) {
        BookingService.releaseSlotLock(lockId).then(released => {
          if (!released) {
            console.warn('[Cleanup] Failed to release lock - server will expire it automatically')
          }
        }).catch(err => {
          console.warn('[Cleanup] Lock release error (non-critical):', err.message)
        })
      }
      
      // Clear timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
      // Reset to slot selection
      set({
        currentStep: 'select-slot',
        selectedSlot: null,
        selectedQuantity: 1,
        lockId: null,
        lockExpiresAt: null,
        timeRemaining: 0,
        error: null,
        errorType: null
      })
    },

    /**
     * Full reset (e.g., when leaving booking page)
     */
    resetBooking: () => {
      // Clear timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
      // Full reset
      set({
        currentStep: 'select-slot',
        selectedSlot: null,
        selectedQuantity: 1,
        lockId: null,
        lockExpiresAt: null,
        formData: initialFormData,
        booking: null,
        error: null,
        errorType: null,
        loading: false,
        timeRemaining: 0
      })
    },

    clearError: () => {
      set({ error: null, errorType: null })
    }
  }
})