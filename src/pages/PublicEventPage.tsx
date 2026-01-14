// src/pages/PublicEventPage.tsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  MapPinIcon, 
  UserGroupIcon 
} from '@heroicons/react/24/outline'
import { BookingService } from '../lib/services/bookingService'

export function PublicEventPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (eventId) {
      loadEvent()
    }
  }, [eventId])

  const loadEvent = async () => {
    try {
      setLoading(true)
      const data = await BookingService.getEventById(eventId!)
      if (!data) {
        setError('Event not found. It may be private or in draft status.')
      } else {
        setEvent(data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load event details.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
        <p className="text-gray-600 mb-8">{error}</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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
            <div className="text-right">
              <Link 
                to={`/book/${event.id}`}
                className="bg-white text-primary-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors inline-block"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>
          
          {event.organizer && (
            <div className="mb-8 border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Organizer</h2>
              <div className="flex items-center">
                {event.organizer.avatar_url && (
                  <img src={event.organizer.avatar_url} className="w-12 h-12 rounded-full mr-4" />
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

          <div className="bg-gray-50 rounded-lg p-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ready to join?</h3>
              <p className="text-gray-600">Secure your spot by selecting a time slot.</p>
            </div>
            <Link to={`/book/${event.id}`} className="btn-primary">
              Book Your Slot
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}