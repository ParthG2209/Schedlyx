import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  CalendarDaysIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'
import { EventCard } from '../components/EventCard'
import { Event } from '../types'

export function Dashboard() {
  // Mock data - replace with real data from Supabase
  const stats = [
    { name: 'Total Events', value: '12', icon: CalendarDaysIcon, change: '+2 this week' },
    { name: 'Total Bookings', value: '89', icon: UserGroupIcon, change: '+12 this week' },
    { name: 'This Month', value: '34', icon: ChartBarIcon, change: '+8 from last month' },
  ]

  const recentEvents: Event[] = [
    {
      id: '1',
      userId: 'user1',
      title: 'Team Standup',
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
      timeSlots: { start: '09:00', end: '17:00' },
      createdAt: '2024-01-10',
      updatedAt: '2024-01-10'
    },
    {
      id: '2',
      userId: 'user1',
      title: 'Product Demo',
      description: 'Showcase our latest product features and improvements.',
      type: 'webinar',
      duration: 60,
      location: 'https://zoom.us/j/123456789',
      isOnline: true,
      maxAttendees: 50,
      requiresApproval: false,
      allowCancellation: true,
      cancellationDeadline: 2,
      bufferTime: 0,
      status: 'active',
      availableDays: ['Tuesday', 'Thursday'],
      timeSlots: { start: '14:00', end: '16:00' },
      createdAt: '2024-01-12',
      updatedAt: '2024-01-12'
    },
    {
      id: '3',
      userId: 'user1',
      title: 'Workshop: React Basics',
      description: 'Learn React fundamentals including components, hooks, and state management.',
      type: 'workshop',
      duration: 120,
      location: 'Tech Hub Conference Room',
      isOnline: false,
      maxAttendees: 25,
      requiresApproval: true,
      allowCancellation: true,
      cancellationDeadline: 24,
      bufferTime: 15,
      status: 'draft',
      availableDays: ['Wednesday', 'Friday'],
      timeSlots: { start: '10:00', end: '17:00' },
      createdAt: '2024-01-14',
      updatedAt: '2024-01-14'
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your events.</p>
          </div>
          <Link to="/create-event" className="btn-primary flex items-center space-x-2">
            <PlusIcon className="h-5 w-5" />
            <span>Create Event</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-green-600">{stat.change}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Events with EventCard */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Events</h2>
          <Link to="/events" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all events →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/create-event" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <PlusIcon className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Create Event</h3>
                <p className="text-gray-600">Set up a new event or booking page</p>
              </div>
            </div>
          </Link>
          
          <Link to="/admin/events" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Events</h3>
                <p className="text-gray-600">Edit and organize your events</p>
              </div>
            </div>
          </Link>

          <Link to="/availability" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Availability</h3>
                <p className="text-gray-600">Set your weekly recurring schedule</p>
              </div>
            </div>
          </Link>
          
          <Link to="/analytics" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
                <p className="text-gray-600">View detailed insights and reports</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}