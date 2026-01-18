// src/stores/bookingStore.ts
// FIXED: Clear timer semantics, consistent lock authority, single state flow

import { create } from 'zustand'
import { BookingService } from '../lib/services/bookingService'

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
    loading: false,
    timeRemaining: 0,

    selectSlot: async (slot: SlotAvailability, quantity: number = 1) => {
      set({ loading: true, error: null })
      
      try {
        // Create server-side lock
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
          error: null
        })
        
        // Clear any existing timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
        }
        
        // TIMER IS UX-ONLY: Shows remaining time but doesn't control lock validity
        // Lock validity is ALWAYS determined by the server
        timerIntervalId = setInterval(() => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            
            // Update timer display
            set({ timeRemaining: remaining })
            
            // Optional: Show warning when time is low (UX only)
            if (remaining === 60) {
              console.warn('⚠️ Lock expires in 1 minute')
            }
            
            // When timer reaches zero, stop updating (but don't reset state)
            // State reset only happens on server rejection or explicit cancel
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
        // Server validates lock expiration - this is the ONLY authority
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
          error: null
        })
      } catch (error: any) {
        console.error('Error confirming booking:', error)
        
        // Server rejected the booking (lock expired or capacity exhausted)
        if (error.message?.includes('expired') || 
            error.message?.includes('not found') ||
            error.message?.includes('capacity')) {
          
          // Clear timer
          if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
          }
          
          // Reset to slot selection - lock is invalid
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
        return false
      }
    },

    cancelBooking: () => {
      const { lockId } = get()
      
      // Release lock on server
      if (lockId) {
        BookingService.releaseSlotLock(lockId).catch(err => {
          console.error('Error releasing lock:', err)
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
        error: null
      })
    },

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
        loading: false,
        timeRemaining: 0
      })
    },

    clearError: () => {
      set({ error: null })
    }
  }
})