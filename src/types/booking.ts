// src/types/booking.ts
// Type definitions for the booking system

export interface TimeSlot {
  id: string
  eventId: string
  startTime: string
  endTime: string
  totalCapacity: number
  bookedCount: number
  availableCount: number
  status: 'available' | 'full' | 'cancelled'
  isLocked: boolean
  lockedUntil: string | null
  price: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface SlotLock {
  id: string
  slotId: string
  userId: string | null
  sessionId: string
  lockedAt: string
  expiresAt: string
  quantity: number
  isActive: boolean
  releasedAt: string | null
}

export interface BookingAttempt {
  id: string
  eventId: string
  slotId: string | null
  userId: string | null
  email: string | null
  status: 'success' | 'failed' | 'abandoned'
  failureReason: string | null
  attemptedAt: string
}

export interface SlotAvailability {
  slotId: string
  startTime: string
  endTime: string
  totalCapacity: number
  availableCount: number
  price: number
}

export interface BookingFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  notes?: string
}

export interface ConfirmedBooking {
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

export interface BookingState {
  currentStep: 'select-slot' | 'fill-details' | 'confirm' | 'completed'
  selectedSlot: SlotAvailability | null
  lockId: string | null
  lockExpiresAt: string | null
  formData: BookingFormData
  booking: ConfirmedBooking | null
  error: string | null
  loading: boolean
}