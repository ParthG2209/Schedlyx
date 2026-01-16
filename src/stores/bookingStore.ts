// src/stores/bookingStore.ts
// FIXED: Server-side lock validation, removed client-side timer authority

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

export const useBookingStore = create<BookingStore>((set, get) => ({
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

  // FIXED: Accept quantity parameter
  selectSlot: async (slot: SlotAvailability, quantity: number = 1) => {
    set({ loading: true, error: null })
    
    try {
      // FIXED: Pass quantity to lock creation
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
      
      // FIXED: Client timer is ONLY for UX - not for lock authority
      const intervalId = setInterval(() => {
        const state = get()
        if (state.lockExpiresAt) {
          const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
          
          if (remaining <= 0) {
            clearInterval(intervalId)
            // FIXED: Don't reset state - only update timer display
            set({ timeRemaining: 0 })
          } else {
            set({ timeRemaining: remaining })
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

  // FIXED: Server validates lock before confirming
  confirmBooking: async () => {
    const { lockId, formData } = get()
    
    if (!lockId) {
      set({ error: 'No active reservation found' })
      return
    }
    
    set({ loading: true, error: null })
    
    try {
      // Server will validate lock expiration
      const booking = await BookingService.completeBooking(lockId, formData)
      
      set({
        booking,
        currentStep: 'completed',
        loading: false,
        error: null
      })
    } catch (error: any) {
      console.error('Error confirming booking:', error)
      
      // FIXED: Handle lock expiration from server
      if (error.message?.includes('expired') || error.message?.includes('not found')) {
        set({
          error: 'Your reservation has expired. Please select a new slot.',
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
          error: error.message || 'Failed to confirm booking. Please try again.'
        })
      }
    }
  },

  // FIXED: Verify lock validity with server
  verifyLockValidity: async () => {
    const { lockId } = get()
    
    if (!lockId) return false
    
    try {
      const { isValid, reason } = await BookingService.verifyLock(lockId)
      
      if (!isValid) {
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
    
    if (lockId) {
      BookingService.releaseSlotLock(lockId).catch(err => {
        console.error('Error releasing lock:', err)
      })
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
}))