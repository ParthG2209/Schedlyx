// src/stores/bookingStore.ts
// Zustand store for managing booking flow state

import { create } from 'zustand'
import { BookingService } from '../lib/services/bookingService'

// Local type definitions for the booking store
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
  lockId: string | null
  lockExpiresAt: string | null
  formData: BookingFormData
  booking: ConfirmedBooking | null
  error: string | null
  loading: boolean
  timeRemaining: number
}

interface BookingStore extends BookingState {
  selectSlot: (slot: SlotAvailability) => Promise<void>
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

export const useBookingStore = create<BookingStore>((set, get) => ({
  // Initial state
  currentStep: 'select-slot',
  selectedSlot: null,
  lockId: null,
  lockExpiresAt: null,
  formData: initialFormData,
  booking: null,
  error: null,
  loading: false,
  timeRemaining: 0,

  // Actions
  selectSlot: async (slot: SlotAvailability) => {
    set({ loading: true, error: null })
    
    try {
      // Create a lock for this slot
      const lockId = await BookingService.createSlotLock(slot.slotId, 1)
      
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      
      set({
        selectedSlot: slot,
        lockId,
        lockExpiresAt: expiresAt,
        currentStep: 'fill-details',
        loading: false,
        error: null
      })
      
      // Start countdown timer
      const intervalId = setInterval(() => {
        const state = get()
        if (state.lockExpiresAt) {
          const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
          
          if (remaining <= 0) {
            clearInterval(intervalId)
            set({
              error: 'Your reservation has expired. Please select a new slot.',
              currentStep: 'select-slot',
              selectedSlot: null,
              lockId: null,
              lockExpiresAt: null,
              timeRemaining: 0
            })
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

  confirmBooking: async () => {
    const { lockId, formData } = get()
    
    if (!lockId) {
      set({ error: 'No active reservation found' })
      return
    }
    
    set({ loading: true, error: null })
    
    try {
      const booking = await BookingService.completeBooking(lockId, formData)
      
      set({
        booking,
        currentStep: 'completed',
        loading: false,
        error: null
      })
    } catch (error: any) {
      console.error('Error confirming booking:', error)
      set({
        loading: false,
        error: error.message || 'Failed to confirm booking. Please try again.'
      })
    }
  },

  cancelBooking: () => {
    const { lockId } = get()
    
    if (lockId) {
      // Release the lock (fire and forget)
      BookingService.releaseSlotLock(lockId).catch(err => {
        console.error('Error releasing lock:', err)
      })
    }
    
    set({
      currentStep: 'select-slot',
      selectedSlot: null,
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