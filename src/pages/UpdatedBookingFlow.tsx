// src/pages/UpdatedBookingFlowPage.tsx
// Updated booking flow using enhanced components with better UX

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useBookingStore } from '../stores/bookingStore'
import { EnhancedSlotSelector } from '../components/booking/EnhancedSlotSelector'
import { EnhancedBookingForm } from '../components/booking/EnhancedBookingForm'
import { EnhancedBookingConfirmation } from '../components/booking/EnhancedBookingConfirmation'

export function UpdatedBookingFlowPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const {
    currentStep,
    selectedSlot,
    selectedQuantity,
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
    if (!eventId) {
      console.error('BookingFlowPage: No eventId provided')
      navigate('/')
      return
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(eventId)) {
      console.error('BookingFlowPage: Invalid UUID format:', eventId)
    }
  }, [eventId, navigate])

  const handleSelectSlot = async (slot: any, quantity: number) => {
    try {
      clearError()
      await selectSlot(slot, quantity)
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
      if (confirm('Going back will release your slot reservation. Continue?')) {
        cancelBooking()
      }
    } else {
      navigate(`/event/${eventId}`)
    }
  }

  const handleClose = () => {
    resetBooking()
    navigate(`/event/${eventId}`)
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'select-slot': return 'Select Time Slot'
      case 'fill-details': return 'Enter Your Details'
      case 'completed': return 'Booking Confirmed'
      default: return 'Book Your Spot'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'select-slot': return 'Choose your preferred time slot'
      case 'fill-details': return 'Complete your booking information'
      case 'completed': return 'Your booking has been confirmed'
      default: return ''
    }
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            {currentStep === 'completed' ? 'Back to Event' : 'Back'}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {getStepTitle()}
              </h1>
              <p className="text-gray-600 mt-1">
                {getStepDescription()}
              </p>
            </div>

            {/* Progress Steps */}
            {currentStep !== 'completed' && (
              <div className="hidden md:flex items-center space-x-2">
                {/* Step 1 */}
                <div className="flex items-center">
                  <div className={`
                    h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm
                    ${currentStep === 'select-slot' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-green-500 text-white'
                    }
                  `}>
                    {currentStep === 'select-slot' ? '1' : '✓'}
                  </div>
                  <span className={`
                    ml-2 text-sm font-medium
                    ${currentStep === 'select-slot' ? 'text-gray-900' : 'text-gray-500'}
                  `}>
                    Select Slot
                  </span>
                </div>

                {/* Connector */}
                <div className="h-0.5 w-12 bg-gray-300 mx-2"></div>

                {/* Step 2 */}
                <div className="flex items-center">
                  <div className={`
                    h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm
                    ${currentStep === 'fill-details' 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-300 text-gray-600'
                    }
                  `}>
                    2
                  </div>
                  <span className={`
                    ml-2 text-sm font-medium
                    ${currentStep === 'fill-details' ? 'text-gray-900' : 'text-gray-500'}
                  `}>
                    Your Details
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-900">Error</h3>
                <p className="text-sm text-red-800 mt-1">{error}</p>
                {error.includes('RPC') && (
                  <p className="text-xs text-red-700 mt-2">
                    💡 Tip: Make sure the database migration has been run successfully.
                  </p>
                )}
              </div>
              <button
                onClick={clearError}
                className="ml-3 text-red-400 hover:text-red-600"
                aria-label="Dismiss error"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-6 md:p-8">
            {/* Step 1: Select Slot */}
            {currentStep === 'select-slot' && (
              <EnhancedSlotSelector
                eventId={eventId}
                onSelectSlot={handleSelectSlot}
                loading={loading}
              />
            )}

            {/* Step 2: Fill Details */}
            {currentStep === 'fill-details' && selectedSlot && (
              <EnhancedBookingForm
                selectedSlot={selectedSlot}
                selectedQuantity={selectedQuantity}
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
              <EnhancedBookingConfirmation
                booking={booking}
                onClose={handleClose}
              />
            )}
          </div>
        </div>

        {/* Help Section */}
        {currentStep !== 'completed' && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a 
                href="/support" 
                className="text-primary-600 hover:text-primary-700 font-medium underline"
              >
                Contact Support
              </a>
            </p>
          </div>
        )}

        {/* Trust Indicators */}
        {currentStep === 'select-slot' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-green-600 text-2xl mb-2">🔒</div>
              <h4 className="font-semibold text-gray-900 text-sm">Secure Booking</h4>
              <p className="text-xs text-gray-600 mt-1">Your data is protected</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-blue-600 text-2xl mb-2">⚡</div>
              <h4 className="font-semibold text-gray-900 text-sm">Instant Confirmation</h4>
              <p className="text-xs text-gray-600 mt-1">Immediate email receipt</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-purple-600 text-2xl mb-2">📅</div>
              <h4 className="font-semibold text-gray-900 text-sm">Calendar Ready</h4>
              <p className="text-xs text-gray-600 mt-1">Add to your calendar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}