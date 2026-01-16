// src/pages/PublicEventPage.tsx
// FIXED: Pre-flight booking eligibility check

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ClockIcon, 
  MapPinIcon,
  ExclamationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { BookingService } from '../lib/services/bookingService'

export function PublicEventPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState<any>(null)
  const [canBook, setCanBook] = useState<boolean>(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (eventId) {
      loadEventAndCheckEligibility()
    }
  }, [eventId])

  const loadEventAndCheckEligibility = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load event details
      const data = await BookingService.getEventById(eventId!)
      
      if (!data) {
        setError('Event not found.')
        setEvent(null)
        setCanBook(false)
        return
      }
      
      // FIXED: Check event status
      if (data.status !== 'active') {
        setBookingError('This event is not currently available for booking.')
        setCanBook(false)
        setEvent(data)
        return
      }
      
      // FIXED: Check visibility
      if (data.visibility !== 'public' && data.visibility !== 'protected') {
        setBookingError('This event is not publicly available.')
        setCanBook(false)
        setEvent(data)
        return
      }
      
      // FIXED: Use RPC to check booking eligibility
      const eligibility = await BookingService.canBookEvent(eventId!)
      
      if (!eligibility.canBook) {
        setBookingError(eligibility.reason || 'Booking is not available')
        setCanBook(false)
        setAvailableSlots(0)
        setEvent(data)
        return
      }
      
      // All checks passed
      setCanBook(true)
      setBookingError(null)
      setAvailableSlots(eligibility.availableSlots)
      setEvent(data)
      
    } catch (err: any) {
      console.error('Failed to load event:', err)
      setError(err.message || 'Failed to load event details.')
      setEvent(null)
      setCanBook(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
        <p className="text-gray-600 mb-8">{error || 'The event you are looking for does not exist.'}</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </span>
              <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-primary-100">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  {event.duration} minutes
                </div>
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  {event.is_online ? 'Online' : event.location}
                </div>
              </div>
            </div>
            
            {/* FIXED: Conditional register button */}
            <div className="text-right">
              {canBook ? (
                <Link 
                  to={`/book/${event.id}`}
                  className="bg-white text-primary-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors inline-block"
                >
                  Register Now
                </Link>
              ) : (
                <button
                  disabled
                  className="bg-gray-300 text-gray-500 font-semibold px-6 py-3 rounded-lg cursor-not-allowed inline-block"
                >
                  Unavailable
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-6 py-6">
          {/* Booking Status Banner */}
          {!canBook && bookingError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationCircleIcon className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    Booking Unavailable
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {bookingError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {canBook && availableSlots > 0 && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-green-800">
                    Slots Available
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    {availableSlots} time slot{availableSlots !== 1 ? 's' : ''} available for booking
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* About */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>
          
          {/* Organizer */}
          {event.organizer && (
            <div className="mb-8 border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Organizer</h2>
              <div className="flex items-center">
                {event.organizer.avatar_url && (
                  <img src={event.organizer.avatar_url} alt="Organizer" className="w-12 h-12 rounded-full mr-4" />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">
                    {event.organizer.first_name} {event.organizer.last_name}
                  </h3>
                  <p className="text-gray-600">{event.organizer.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* FIXED: Conditional booking CTA */}
          <div className="bg-gray-50 rounded-lg p-6">
            {canBook ? (
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Ready to join?</h3>
                  <p className="text-gray-600">
                    {availableSlots} slot{availableSlots !== 1 ? 's' : ''} available
                  </p>
                </div>
                <Link to={`/book/${event.id}`} className="btn-primary">
                  Book Your Slot
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Booking Currently Unavailable
                </h3>
                <p className="text-gray-600 mb-4">
                  {bookingError || 'This event is not available for booking at this time.'}
                </p>
                <button
                  onClick={loadEventAndCheckEligibility}
                  disabled={loading}
                  className="btn-secondary"
                >
                  {loading ? 'Checking...' : 'Check Again'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}