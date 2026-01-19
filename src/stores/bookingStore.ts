// src/stores/bookingStore.ts
// FIXED: Added correct Zustand import and exported store
import { create } from 'zustand'
import { BookingService } from '../lib/services/bookingService'

// Import types from the booking types file
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
}

const initialFormData: BookingFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: ''
}

export const useBookingStore = create<BookingStore>((set, get) => {
  // Timer is stored outside state to avoid re-renders
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
    loading: false,
    timeRemaining: 0,

    // Actions
    selectSlot: async (slot: SlotAvailability, quantity: number = 1) => {
      set({ loading: true, error: null })
      
      try {
        // SERVER-SIDE LOCK CREATION (AUTHORITY)
        const { lockId, expiresAt } = await BookingService.createSlotLock(
          slot.slotId, 
          quantity
        )
        
        set({
          selectedSlot: slot,
          selectedQuantity: quantity,
          lockId,
          lockExpiresAt: expiresAt, // Server time is authority
          currentStep: 'fill-details',
          loading: false,
          error: null
        })
        
        // Clear any existing timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
        }
        
        // UX-ONLY TIMER: For display purposes only
        // Lock validity is ALWAYS determined by server via verifyLock()
        timerIntervalId = setInterval(() => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            
            // Update display only
            set({ timeRemaining: remaining })
            
            // When timer reaches zero, check with server (not client decision)
            if (remaining <= 0) {
              if (timerIntervalId) {
                clearInterval(timerIntervalId)
                timerIntervalId = null
              }
              // Don't auto-reset - let server rejection handle it
            }
          }
        }, 1000)
        
      } catch (error: any) {
        console.error('Error selecting slot:', error)
        set({
          loading: false,
          error: error.message || 'Failed to reserve slot. Please try again.'
        })
      }
    },

    updateFormData: (data: Partial<BookingFormData>) => {
      set(state => ({
        formData: { ...state.formData, ...data }
      }))
    },

    confirmBooking: async () => {
      const { lockId, formData } = get()
      
      if (!lockId) {
        set({ error: 'No active reservation found' })
        return
      }
      
      set({ loading: true, error: null })
      
      try {
        // SERVER VALIDATES LOCK (AUTHORITY)
        // If lock expired/invalid, server will reject
        const booking = await BookingService.completeBooking(lockId, formData)
        
        // Success - clear timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
          timerIntervalId = null
        }
        
        set({
          booking,
          currentStep: 'completed',
          loading: false,
          error: null
        })
      } catch (error: any) {
        console.error('Error confirming booking:', error)
        
        // SERVER REJECTED - likely lock expired or capacity exhausted
        if (error.message?.includes('expired') || 
            error.message?.includes('not found') ||
            error.message?.includes('capacity')) {
          
          if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
          }
          
          // Reset to slot selection - server authority rejected booking
          set({
            error: error.message || 'Your reservation has expired. Please select a new slot.',
            currentStep: 'select-slot',
            selectedSlot: null,
            selectedQuantity: 1,
            lockId: null,
            lockExpiresAt: null,
            timeRemaining: 0,
            loading: false
          })
        } else {
          // Other error - keep state but show error
          set({
            loading: false,
            error: error.message || 'Failed to confirm booking. Please try again.'
          })
        }
      }
    },

    cancelBooking: () => {
      // Clear timer
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
        error: null
      })
    },

    resetBooking: () => {
      // Clear timer
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
        loading: false,
        timeRemaining: 0
      })
    },

    clearError: () => {
      set({ error: null })
    }
  }
})