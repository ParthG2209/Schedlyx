// src/stores/bookingStore.ts
// FIX #2, #3, #4, #5, #7: Simplified lock lifecycle and removed problematic cleanup

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
     * FIX #1: Removed client-side availableCount validation
     * Server is the ONLY authority - client validation is UX hint only
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

      // UX hint only - not a guard
      if (quantity > slot.availableCount) {
        set({
          error: `Only ${slot.availableCount} seat${slot.availableCount === 1 ? '' : 's'} appear available. Attempting to reserve...`,
          errorType: null
        })
      }

      set({ loading: true, error: null, errorType: null })
      
      try {
        // FIX #1: Server decides capacity - no client-side parameters
        const { lockId, expiresAt } = await BookingService.createSlotLock(
          slot.slotId, 
          quantity
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
        
        // Start countdown timer (UX-only)
        timerIntervalId = setInterval(() => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            set({ timeRemaining: remaining })
            
            if (remaining <= 0) {
              if (timerIntervalId) {
                clearInterval(timerIntervalId)
                timerIntervalId = null
              }
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
     * Atomic booking confirmation
     */
    confirmBooking: async () => {
      const { lockId, formData, selectedQuantity } = get()
      
      if (!lockId) {
        set({ 
          error: 'No active reservation found',
          errorType: BookingErrorType.LOCK_INVALID
        })
        return
      }
      
      if (!selectedQuantity || selectedQuantity <= 0) {
        set({
          error: 'Invalid booking quantity. Please start over.',
          errorType: BookingErrorType.INVALID_QUANTITY
        })
        return
      }
      
      set({ loading: true, error: null, errorType: null })
      
      try {
        const booking = await BookingService.completeBooking(lockId, formData)
        
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
     * FIX #4: Single canonical lock verification method
     * All verification flows through BookingService
     */
    verifyLockValidity: async () => {
      const { lockId } = get()
      
      if (!lockId) return false
      
      try {
        const { isValid, reason } = await BookingService.verifyLock(lockId)
        
        if (!isValid) {
          // Clear timer
          if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
          }
          
          // Reset state
          set({
            error: reason || 'Your reservation is no longer valid',
            errorType: BookingErrorType.LOCK_EXPIRED,
            currentStep: 'select-slot',
            selectedSlot: null,
            selectedQuantity: 1,
            lockId: null,
            lockExpiresAt: null,
            timeRemaining: 0
          })
          return false
        }
        
        return true
      } catch (error: any) {
        console.error('Error verifying lock:', error)
        
        if (error instanceof BookingError) {
          set({
            error: error.message,
            errorType: error.type
          })
        }
        
        return false
      }
    },

    /**
     * FIX #2, #5: User-initiated cancellation only
     * This is explicit user intent - not automatic cleanup
     */
    cancelBooking: () => {
      const { lockId } = get()
      
      // FIX #5: Best-effort cleanup - errors are logged but not thrown
      // Server will expire lock after timeout anyway
      if (lockId) {
        BookingService.releaseSlotLock(lockId).then(released => {
          if (!released) {
            console.warn('Failed to release lock - server will expire it')
          }
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