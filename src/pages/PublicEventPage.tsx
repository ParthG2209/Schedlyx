import { useParams, Link } from 'react-router-dom'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  MapPinIcon, 
  UserGroupIcon 
} from '@heroicons/react/24/outline'

export function PublicEventPage() {
  const { eventId } = useParams()
  
  // TODO: Fetch real event data from Supabase using eventId
  // For now, using mock data
  const event = {
    id: eventId,
    title: 'Product Strategy Workshop',
    description: 'Join us for an interactive workshop where we\'ll dive deep into product strategy, roadmap planning, and user research methodologies. Perfect for product managers, designers, and entrepreneurs.',
    type: 'workshop',
    duration: 120,
    location: 'Conference Room A, Tech Hub',
    isOnline: false,
    maxAttendees: 25,
    currentAttendees: 18,
    date: '2024-01-25',
    time: '14:00',
    organizer: {
      name: 'Sarah Johnson',
      title: 'Senior Product Manager',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
    },
    agenda: [
      { time: '14:00', item: 'Welcome & Introductions' },
      { time: '14:15', item: 'Product Strategy Fundamentals' },
      { time: '15:00', item: 'Hands-on Exercise: Roadmap Planning' },
      { time: '15:45', item: 'Break' },
      { time: '16:00', item: 'User Research Best Practices' },
      { time: '16:30', item: 'Q&A and Wrap-up' }
    ]
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Event Header */}
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
                  <CalendarDaysIcon className="h-5 w-5 mr-2" />
                  {new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  {event.time} ({event.duration} minutes)
                </div>
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  {event.location}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-primary-100 mb-2">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                {event.currentAttendees}/{event.maxAttendees} registered
              </div>
              <Link 
                to={`/book/${eventId}`}
                className="bg-white text-primary-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors inline-block"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-6">
          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
            <p className="text-gray-700 leading-relaxed">{event.description}</p>
          </div>
          
          {/* Organizer */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Organizer</h2>
            <div className="flex items-center">
              <img 
                src={event.organizer.avatar} 
                alt={event.organizer.name}
                className="w-12 h-12 rounded-full mr-4"
              />
              <div>
                <h3 className="font-medium text-gray-900">{event.organizer.name}</h3>
                <p className="text-gray-600">{event.organizer.title}</p>
              </div>
            </div>
          </div>
          
          {/* Agenda */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Agenda</h2>
            <div className="space-y-3">
              {event.agenda.map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-16 text-sm font-medium text-primary-600">
                    {item.time}
                  </div>
                  <div className="text-gray-700">{item.item}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Registration Status */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Registration Status</h3>
                <p className="text-gray-600">
                  {event.maxAttendees - event.currentAttendees} spots remaining
                </p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${(event.currentAttendees / event.maxAttendees) * 100}%` }}
                  />
                </div>
              </div>
              <Link 
                to={`/book/${eventId}`}
                className="btn-primary"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Additional Information */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What to Bring</h3>
          <ul className="space-y-2 text-gray-700">
            <li>• Laptop or notebook for exercises</li>
            <li>• Any current product roadmaps (optional)</li>
            <li>• Questions about your product challenges</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancellation Policy</h3>
          <p className="text-gray-700">
            Free cancellation up to 24 hours before the event. 
            No-shows will be charged the full amount.
          </p>
        </div>
      </div>
    </div>
  )
}