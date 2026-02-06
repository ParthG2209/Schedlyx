import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Calendar, Users, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Event } from '../types';

export function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalBookings: 0,
    thisMonthEvents: 0,
  });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        if (!user) return;
        setLoading(true);
        setError(null);

        // 1. Fetch Events created by user
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('organizer_id', user.id)
          .order('date', { ascending: true });

        if (eventsError) throw eventsError;

        // 2. Fetch Bookings for these events to calculate stats
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, event_id, status')
          .in('event_id', eventsData.map(e => e.id));

        if (bookingsError) throw bookingsError;

        // FIX #1: Safe Data Mapping (No more 'as unknown as')
        // We explicitly map the DB response to match your Event interface
        const mappedEvents: Event[] = (eventsData || []).map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || '',
          date: event.date,
          time: event.time,
          location: event.location,
          capacity: event.capacity,
          price: event.price,
          organizer_id: event.organizer_id,
          image_url: event.image_url,
          category: event.category
        }));

        setRecentEvents(mappedEvents.slice(0, 3)); // Show top 3

        // Calculate Stats
        const now = new Date();
        const thisMonth = eventsData.filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        setStats({
          totalEvents: eventsData.length,
          totalBookings: bookingsData?.length || 0,
          thisMonthEvents: thisMonth,
        });

      } catch (err: any) {
        console.error('Error loading dashboard:', err);
        // FIX #2: Set Error State for UI
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // FIX #2: Error Fallback UI
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error loading dashboard: {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        {/* FIX #3: Safe Name Greeting */}
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back{user?.first_name ? `, ${user.first_name}` : ''}!
        </h1>
        <p className="mt-2 text-gray-600">Here's what's happening with your events.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalEvents}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalBookings}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Events This Month</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.thisMonthEvents}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Recent Events</h2>
          <Link to="/events" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center">
            View all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="border-t border-gray-200">
          {recentEvents.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentEvents.map((event) => (
                <li key={event.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <Link to={`/events/${event.id}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={event.image_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'}
                            alt=""
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-indigo-600 truncate">{event.title}</div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="ml-5 flex-shrink-0">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No events created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}