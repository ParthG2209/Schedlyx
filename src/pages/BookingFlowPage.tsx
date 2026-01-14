// src/pages/BookingFlowPage.tsx
// Main booking flow orchestrator - BookMyShow style
// FIXED: Added better error handling and validation

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useBookingStore } from '../stores/bookingStore'
import { SlotSelector } from '../components/booking/SlotSelector'
import { BookingForm } from '../components/booking/BookingForm'
import { BookingConfirmation } from '../components/booking/BookingConfirmation'


export function BookingFlowPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const {
    currentStep,
    selectedSlot,
    formData,
    booking,
    error,
    loading,
    timeRemaining,
    selectSlot,
    updateFormData,
    confirmBooking,
    cancelBooking,
    resetBooking,
    clearError
  } = useBookingStore()

  useEffect(() => {
    // Validate eventId exists and is a valid UUID
    if (!eventId) {
      console.error('BookingFlowPage: No eventId provided')
      navigate('/')
      return
    }

    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(eventId)) {
      console.error('BookingFlowPage: Invalid UUID format:', eventId)
      // For now, allow it to proceed - the error will be shown in the UI
    }

    // Cleanup on unmount
    return () => {
      if (currentStep !== 'completed') {
        cancelBooking()
      }
    }
  }, [eventId, currentStep, cancelBooking, navigate])

  const handleSelectSlot = async (slot: any) => {
    try {
      clearError()
      await selectSlot(slot)
    } catch (error: any) {
      console.error('BookingFlowPage: Failed to select slot:', error)
    }
  }

  const handleConfirmBooking = async () => {
    try {
      clearError()
      await confirmBooking()
    } catch (error: any) {
      console.error('BookingFlowPage: Failed to confirm booking:', error)
    }
  }

  const handleCancelBooking = () => {
    if (confirm('Are you sure you want to cancel this booking? Your slot reservation will be released.')) {
      cancelBooking()
    }
  }

  const handleBack = () => {
    if (currentStep === 'fill-details') {
      // Release lock and go back to slot selection
      cancelBooking()
    } else {
      navigate(`/event/${eventId}`)
    }
  }

  const handleClose = () => {
    resetBooking()
    navigate(`/event/${eventId}`)
  }

  if (!eventId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium">Invalid Event</p>
          <p className="text-red-600 mt-2">Event ID is missing from the URL.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {currentStep === 'completed' ? 'Back to Event' : 'Back'}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {currentStep === 'select-slot' && 'Select Time Slot'}
                {currentStep === 'fill-details' && 'Enter Details'}
                {currentStep === 'completed' && 'Booking Confirmed'}
              </h1>
              <p className="text-gray-600 mt-1">
                {currentStep === 'select-slot' && 'Choose your preferred time slot'}
                {currentStep === 'fill-details' && 'Complete your booking'}
                {currentStep === 'completed' && 'Your booking has been confirmed'}
              </p>
            </div>

            {/* Progress Steps */}
            {currentStep !== 'completed' && (
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-16 rounded-full ${
                  currentStep === 'select-slot' ? 'bg-primary-600' : 'bg-gray-300'
                }`} />
                <div className={`h-2 w-16 rounded-full ${
                  currentStep === 'fill-details' ? 'bg-primary-600' : 'bg-gray-300'
                }`} />
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                {error.includes('RPC') && (
                  <p className="text-xs text-red-600 mt-2">
                    Tip: Make sure the database migration has been run successfully.
                  </p>
                )}
              </div>
              <button
                onClick={clearError}
                className="ml-3 text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            {/* Step 1: Select Slot */}
            {currentStep === 'select-slot' && (
              <SlotSelector
                eventId={eventId}
                onSelectSlot={handleSelectSlot}
                loading={loading}
              />
            )}

            {/* Step 2: Fill Details */}
            {currentStep === 'fill-details' && selectedSlot && (
              <BookingForm
                selectedSlot={selectedSlot}
                formData={formData}
                timeRemaining={timeRemaining}
                onUpdateFormData={updateFormData}
                onSubmit={handleConfirmBooking}
                onCancel={handleCancelBooking}
                loading={loading}
              />
            )}

            {/* Step 3: Confirmation */}
            {currentStep === 'completed' && booking && (
              <BookingConfirmation
                booking={booking}
                onClose={handleClose}
              />
            )}
          </div>
        </div>

        {/* Help Section */}
        {currentStep !== 'completed' && (
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Need help? <a href="/support" className="text-primary-600 hover:text-primary-700">Contact Support</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}