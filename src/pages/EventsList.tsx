import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { EventCard } from '../components/EventCard'
import { Event } from '../types'

export function EventsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // FIXED: Mock data with proper UUIDs - replace with real data from Supabase
  const events: Event[] = [
    {
      id: 'd4e5f6a7-b8c9-4012-d4e5-f6a7b8c90123',
      userId: 'user-uuid-1',
      title: 'Product Strategy Workshop',
      description: 'Join us for an interactive workshop where we\'ll dive deep into product strategy, roadmap planning, and user research methodologies.',
      type: 'workshop',
      duration: 120,
      location: 'Conference Room A, Tech Hub',
      isOnline: false,
      maxAttendees: 25,
      requiresApproval: true,
      allowCancellation: true,
      cancellationDeadline: 24,
      bufferTime: 15,
      status: 'active',
      availableDays: ['Monday', 'Wednesday', 'Friday'],
      timeSlots: { start: '09:00', end: '17:00' },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'e5f6a7b8-c9d0-4123-e5f6-a7b8c9d01234',
      userId: 'user-uuid-1',
      title: 'React Advanced Patterns',
      description: 'Deep dive into advanced React patterns including hooks, context, and performance optimization.',
      type: 'webinar',
      duration: 90,
      location: 'https://zoom.us/j/123456789',
      isOnline: true,
      maxAttendees: 100,
      requiresApproval: false,
      allowCancellation: true,
      cancellationDeadline: 2,
      bufferTime: 0,
      status: 'active',
      availableDays: ['Tuesday', 'Thursday'],
      timeSlots: { start: '14:00', end: '18:00' },
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    },
    {
      id: 'f6a7b8c9-d0e1-4234-f6a7-b8c9d0e12345',
      userId: 'user-uuid-1',
      title: 'Team Standup Meeting',
      description: 'Daily team synchronization and progress updates.',
      type: 'meeting',
      duration: 30,
      location: 'Meeting Room B',
      isOnline: false,
      maxAttendees: 10,
      requiresApproval: false,
      allowCancellation: false,
      cancellationDeadline: 0,
      bufferTime: 5,
      status: 'active',
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      timeSlots: { start: '09:00', end: '10:00' },
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z'
    },
    {
      id: 'a7b8c9d0-e1f2-4345-a7b8-c9d0e1f23456',
      userId: 'user-uuid-1',
      title: 'Career Consultation',
      description: 'One-on-one career guidance and mentorship session.',
      type: 'consultation',
      duration: 60,
      location: 'https://meet.google.com/abc-defg-hij',
      isOnline: true,
      maxAttendees: 1,
      requiresApproval: true,
      allowCancellation: true,
      cancellationDeadline: 48,
      bufferTime: 30,
      status: 'active',
      availableDays: ['Wednesday', 'Friday'],
      timeSlots: { start: '10:00', end: '16:00' },
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z'
    },
    {
      id: 'b8c9d0e1-f2a3-4456-b8c9-d0e1f2a34567',
      userId: 'user-uuid-1',
      title: 'Tech Conference 2024',
      description: 'Annual technology conference featuring industry leaders and innovators.',
      type: 'conference',
      duration: 480,
      location: 'Grand Convention Center',
      isOnline: false,
      maxAttendees: 500,
      requiresApproval: false,
      allowCancellation: true,
      cancellationDeadline: 168,
      bufferTime: 0,
      status: 'active',
      availableDays: ['Saturday'],
      timeSlots: { start: '08:00', end: '18:00' },
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z'
    },
    {
      id: 'c9d0e1f2-a3b4-4567-c9d0-e1f2a3b45678',
      userId: 'user-uuid-1',
      title: 'Frontend Developer Interview',
      description: 'Technical interview for frontend developer position.',
      type: 'interview',
      duration: 45,
      location: 'https://teams.microsoft.com/xyz',
      isOnline: true,
      requiresApproval: true,
      allowCancellation: true,
      cancellationDeadline: 24,
      bufferTime: 15,
      status: 'draft',
      availableDays: ['Monday', 'Tuesday', 'Wednesday'],
      timeSlots: { start: '10:00', end: '17:00' },
      createdAt: '2024-01-06T00:00:00Z',
      updatedAt: '2024-01-06T00:00:00Z'
    }
  ]

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || event.type === filterType
    return matchesSearch && matchesType
  })

  const eventTypes = ['all', 'meeting', 'workshop', 'conference', 'consultation', 'interview', 'webinar']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Events</h1>
            <p className="text-gray-600 mt-1">Discover and register for upcoming events</p>
          </div>
          <Link to="/create-event" className="btn-primary flex items-center space-x-2 justify-center">
            <PlusIcon className="h-5 w-5" />
            <span>Create Event</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                className="input-field pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              className="input-field"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
        </p>
      </div>

      {/* Events Grid/List */}
      {filteredEvents.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }>
          {filteredEvents.map(event => (
            <EventCard 
              key={event.id} 
              event={event}
              className={viewMode === 'list' ? 'max-w-4xl' : ''}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'There are no events available at the moment'}
          </p>
          <Link to="/create-event" className="btn-primary inline-flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Your First Event
          </Link>
        </div>
      )}
    </div>
  )
}