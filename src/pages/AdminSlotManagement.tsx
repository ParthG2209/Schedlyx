// src/pages/AdminSlotManagement.tsx
// Admin interface for managing event slots

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PlusIcon, CalendarIcon, UsersIcon } from '@heroicons/react/24/outline'
import { TimeSlot } from '../types/booking'
import { BookingService } from '../lib/services/bookingService'

export function AdminSlotManagement() {
  const { eventId } = useParams<{ eventId: string }>()
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    startDate: '',
    endDate: '',
    capacityPerSlot: 10
  })

  useEffect(() => {
    if (eventId) {
      loadSlots()
    }
  }, [eventId])

  const loadSlots = async () => {
    if (!eventId) return

    try {
      setLoading(true)
      const data = await BookingService.getEventSlots(eventId)
      setSlots(data)
    } catch (error) {
      console.error('Failed to load slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSlots = async () => {
    if (!eventId || !generateForm.startDate || !generateForm.endDate) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      const count = await BookingService.generateEventSlots(
        eventId,
        generateForm.startDate,
        generateForm.endDate,
        generateForm.capacityPerSlot
      )

      alert(`Successfully generated ${count} time slots`)
      setShowGenerateForm(false)
      loadSlots()
    } catch (error: any) {
      alert(`Failed to generate slots: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'full':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCapacityColor = (available: number, total: number) => {
    const percentage = (available / total) * 100
    if (percentage === 0) return 'text-red-600'
    if (percentage <= 25) return 'text-orange-600'
    if (percentage <= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading && slots.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Slot Management</h1>
            <p className="text-gray-600 mt-1">
              Manage time slots and capacity for your event
            </p>
          </div>
          <button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Generate Slots
          </button>
        </div>
      </div>

      {/* Generate Form */}
      {showGenerateForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Generate Time Slots
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={generateForm.startDate}
                onChange={(e) => setGenerateForm(prev => ({ ...prev, startDate: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={generateForm.endDate}
                onChange={(e) => setGenerateForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity Per Slot
              </label>
              <input
                type="number"
                min="1"
                value={generateForm.capacityPerSlot}
                onChange={(e) => setGenerateForm(prev => ({ ...prev, capacityPerSlot: parseInt(e.target.value) }))}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleGenerateSlots}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              Generate
            </button>
            <button
              onClick={() => setShowGenerateForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Slots</p>
              <p className="text-2xl font-bold text-gray-900">{slots.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">
                {slots.filter(s => s.status === 'available').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Full</p>
              <p className="text-2xl font-bold text-gray-900">
                {slots.filter(s => s.status === 'full').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Booked</p>
              <p className="text-2xl font-bold text-gray-900">
                {slots.reduce((sum, s) => sum + s.bookedCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Slots Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slots.map((slot) => (
                <tr key={slot.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(slot.startTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {BookingService.formatSlotTime(slot.startTime, slot.endTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {slot.totalCapacity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {slot.bookedCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-semibold ${getCapacityColor(slot.availableCount, slot.totalCapacity)}`}>
                      {slot.availableCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(slot.status)}`}>
                      {slot.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {slots.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No slots created</h3>
            <p className="mt-1 text-sm text-gray-500">
              Generate time slots to start accepting bookings
            </p>
          </div>
        )}
      </div>
    </div>
  )
}