// src/stores/bookingStore.ts
// UPDATED: Uses aligned BookingErrorType enum values
import { create } from 'zustand'
import { BookingService, BookingError, BookingErrorType } from '../lib/services/bookingService'
import type { 
  SlotAvailability, 
  BookingFormData, 
  ConfirmedBooking 
} from '../types/booking'

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
  verifyingLock: boolean
}

interface BookingStore extends BookingState {
  selectSlot: (slot: SlotAvailability, quantity: number) => Promise<void>
  updateFormData: (data: Partial<BookingFormData>) => void
  confirmBooking: () => Promise<void>
  cancelBooking: () => void
  resetBooking: () => void
  clearError: () => void
}

const initialFormData: BookingFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: ''
}

export const useBookingStore = create<BookingStore>((set, get) => {
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
    verifyingLock: false,

    selectSlot: async (slot: SlotAvailability, quantity: number) => {
      if (!Number.isInteger(quantity) || quantity < 1) {
        set({
          error: 'Invalid quantity: must be a positive integer',
          errorType: BookingErrorType.INVALID_QUANTITY,
          loading: false
        })
        return
      }

      if (quantity > slot.availableCount) {
        set({
          error: `Only ${slot.availableCount} slot${slot.availableCount === 1 ? '' : 's'} available, but ${quantity} requested`,
          errorType: BookingErrorType.CAPACITY_EXCEEDED, // ✓ ALIGNED
          loading: false
        })
        return
      }

      set({ loading: true, error: null, errorType: null })
      
      try {
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
        
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
        }
        
        // Timer with server verification
        timerIntervalId = setInterval(async () => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            
            set({ timeRemaining: remaining })
            
            // When timer hits zero, verify with server
            if (remaining <= 0 && !state.verifyingLock) {
              if (timerIntervalId) {
                clearInterval(timerIntervalId)
                timerIntervalId = null
              }
              
              set({ verifyingLock: true })
              
              try {
                const lockStatus = await BookingService.verifyLock(state.lockId!)
                
                if (!lockStatus.isValid) {
                  // Server confirmed expiration
                  set({
                    error: 'Your reservation has expired. Please select a new slot.',
                    errorType: BookingErrorType.LOCK_EXPIRED, // ✓ ALIGNED
                    verifyingLock: false
                  })
                } else {
                  // Lock still valid - update from server
                  set({
                    lockExpiresAt: lockStatus.expiresAt,
                    timeRemaining: BookingService.getTimeRemaining(lockStatus.expiresAt!),
                    verifyingLock: false
                  })
                  
                  if (lockStatus.expiresAt) {
                    timerIntervalId = setInterval(() => {
                      const currentRemaining = BookingService.getTimeRemaining(lockStatus.expiresAt!)
                      set({ timeRemaining: currentRemaining })
                    }, 1000)
                  }
                }
              } catch (error) {
                set({
                  error: 'Unable to verify reservation status. Please try again.',
                  errorType: BookingErrorType.SYSTEM_ERROR,
                  verifyingLock: false
                })
              }
            }
          }
        }, 1000)
        
      } catch (error: any) {
        console.error('Error selecting slot:', error)
        
        let errorMessage = 'Failed to reserve slot. Please try again.'
        let errorType = BookingErrorType.SYSTEM_ERROR
        
        if (error instanceof BookingError) {
          errorMessage = error.message
          errorType = error.type
          
          if (error.details) {
            console.error('Error details:', error.details)
          }
        }
        
        set({
          loading: false,
          error: errorMessage,
          errorType: errorType
        })
      }
    },

    updateFormData: (data: Partial<BookingFormData>) => {
      set(state => ({
        formData: { ...state.formData, ...data }
      }))
    },

    confirmBooking: async () => {
      const { lockId, formData, selectedSlot} = get()
      
      if (!lockId) {
        set({ 
          error: 'No active reservation found. Please select a slot.',
          errorType: BookingErrorType.INVALID_LOCK // ✓ ALIGNED (was LOCK_INVALID)
        })
        return
      }

      if (!selectedSlot) {
        set({ 
          error: 'No slot selected. Please start over.',
          errorType: BookingErrorType.SYSTEM_ERROR
        })
        return
      }

      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        set({ 
          error: 'Please fill in all required fields.',
          errorType: BookingErrorType.SYSTEM_ERROR
        })
        return
      }
      
      set({ loading: true, error: null, errorType: null })
      
      try {
        const booking = await BookingService.completeBooking(lockId, formData)
        
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
        
        let errorMessage = 'Failed to confirm booking. Please try again.'
        let errorType = BookingErrorType.SYSTEM_ERROR
        let shouldReset = false
        
        if (error instanceof BookingError) {
          errorMessage = error.message
          errorType = error.type
          
          // FIXED: Check for aligned enum values
          if (
            errorType === BookingErrorType.LOCK_EXPIRED ||
            errorType === BookingErrorType.SLOT_FULL ||
            errorType === BookingErrorType.INVALID_LOCK || // ✓ ALIGNED (was LOCK_INVALID)
            errorType === BookingErrorType.CAPACITY_EXCEEDED // ✓ ALIGNED (was CAPACITY_CHANGED)
          ) {
            shouldReset = true
          }
          
          if (error.details) {
            console.error('Error details:', error.details)
          }
        }
        
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
          timerIntervalId = null
        }
        
        if (shouldReset) {
          set({
            error: errorMessage,
            errorType: errorType,
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
            error: errorMessage,
            errorType: errorType
          })
        }
      }
    },

    cancelBooking: () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
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

    resetBooking: () => {
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
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