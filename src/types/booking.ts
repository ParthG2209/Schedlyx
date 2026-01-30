// src/types/booking.ts
// Type definitions for the booking system
// src/types/booking.ts
/**

 * ⚠️  BOOKING ENGINE DOMAIN TYPES - READ BEFORE IMPORTING  ⚠️

 * 
 * OWNERSHIP: Booking Engine (PR #41)
 * RELATED: PR #42 (Backend RPCs - MERGED), PR #40 (Frontend UI - PENDING)
 * 
 *  DO NOT IMPORT THESE TYPES DIRECTLY IN UI COMPONENTS 
 * 
 * WHY THIS MATTERS:
 * These types are tightly coupled to the booking engine service layer.
 * Direct imports in UI create hidden dependencies and type drift issues.
 * 
 * ============================================================================
 * 
 * CORRECT USAGE IN UI COMPONENTS:
 * 
 *    import { useBookingStore } from '@/stores/bookingStore'
 *    
 *    const { selectSlot, confirmBooking } = useBookingStore()
 * 
 * WRONG - Direct service/type imports:
 * 
 *    import { BookingService } from '@/lib/services/bookingService'
 *    import type { SlotAvailability } from '@/types/booking'
 * 
 * ============================================================================
 * 
 * ARCHITECTURE LAYERS (DO NOT SKIP):
 * 
 *    UI Components
 *         ↓
 *    Booking Store (useBookingStore)
 *         ↓
 *    Booking Service
 *         ↓
 *    Types (THIS FILE)
 *         ↓
 *    Database RPCs (PR #42)
 * 
 * ============================================================================
 * 
 * MODIFICATION CHECKLIST:
 * If you change these types, you MUST also update:
 * 1. src/lib/services/bookingService.ts
 * 2.  src/stores/bookingStore.ts
 * 3.  Database migrations (if schema changes)
 * 4.  Run all tests
 * 
 * RELATED FILES:
 * - Service: src/lib/services/bookingService.ts
 * - Store: src/stores/bookingStore.ts
 * - DB Migration: supabase/migrations/20240101000003_booking_system_rpcs.sql
 * - Route Guard: src/components/BookingRouteGuard.tsx
 */



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