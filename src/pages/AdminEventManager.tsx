import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

export function AdminEventManager() {
  const [filter, setFilter] = useState('all') // all, active, draft, past
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data - replace with real data from Supabase
  // FIXED: IDs are now valid UUIDs
  const events = [
    {
      id: 'e12d3a45-67b8-90c1-d2e3-f4a567890abc',
      title: 'Team Standup',
      type: 'meeting',
      status: 'active',
      date: '2024-01-15',
      bookings: 8,
      maxAttendees: 10,
      createdAt: '2024-01-10'
    },
    {
      id: 'a23b4c56-78d9-01e2-f3a4-b5c678901def',
      title: 'Product Demo',
      type: 'presentation',
      status: 'active',
      date: '2024-01-18',
      bookings: 15,
      maxAttendees: 20,
      createdAt: '2024-01-12'
    },
    {
      id: 'b34c5d67-89e0-12f3-a4b5-c6d789012345',
      title: 'Workshop: React Basics',
      type: 'workshop',
      status: 'draft',
      date: '2024-01-22',
      bookings: 0,
      maxAttendees: 25,
      createdAt: '2024-01-14'
    },
    {
      id: 'c45d6e78-90f1-23a4-b5c6-d7e890123456',
      title: 'Client Consultation',
      type: 'consultation',
      status: 'past',
      date: '2024-01-05',
      bookings: 3,
      maxAttendees: 5,
      createdAt: '2024-01-01'
    }
  ]

  const filteredEvents = events.filter(event => {
    const matchesFilter = filter === 'all' || event.status === filter
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'past':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDelete = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      // TODO: Implement delete logic with Supabase
      console.log('Deleting event:', eventId)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Manager</h1>
            <p className="text-gray-600 mt-1">Manage all your events and bookings in one place.</p>
          </div>
          <Link to="/create-event" className="btn-primary flex items-center space-x-2">
            <PlusIcon className="h-5 w-5" />
            <span>Create Event</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Draft Events</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.filter(e => e.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">
                {events.reduce((sum, e) => sum + e.bookings, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex space-x-4">
            {['all', 'active', 'draft', 'past'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search events..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">
                        Created {new Date(event.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-sm text-gray-900">{event.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(event.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {event.bookings}/{event.maxAttendees}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${(event.bookings / event.maxAttendees) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        to={`/event/${event.id}`}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Event"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/edit-event/${event.id}`}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Event"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/analytics/${event.id}`}
                        className="text-green-600 hover:text-green-900"
                        title="View Analytics"
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Event"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new event.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link to="/create-event" className="btn-primary">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Event
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}