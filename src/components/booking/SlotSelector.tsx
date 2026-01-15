// src/components/booking/SlotSelector.tsx
// BookMyShow-style slot selection interface
// FIXED: Improved error handling for RPC failures

import { useState, useEffect } from 'react'
import { ClockIcon, UserGroupIcon, CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { SlotAvailability } from '../../types/booking'
import { BookingService } from '../../lib/services/bookingService'

interface SlotSelectorProps {
  eventId: string
  onSelectSlot: (slot: SlotAvailability) => void
  loading?: boolean
}

interface GroupedSlots {
  date: string
  slots: SlotAvailability[]
}

export function SlotSelector({ eventId, onSelectSlot, loading }: SlotSelectorProps) {
  const [slots, setSlots] = useState<SlotAvailability[]>([])
  const [groupedSlots, setGroupedSlots] = useState<GroupedSlots[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSlots()
    
    // Refresh slots every 30 seconds
    const interval = setInterval(loadSlots, 30000)
    return () => clearInterval(interval)
  }, [eventId])

  const loadSlots = async () => {
    try {
      setLoadingSlots(true)
      setError(null)
      const availableSlots = await BookingService.getAvailableSlots(eventId)
      setSlots(availableSlots)
      groupSlotsByDate(availableSlots)
    } catch (err: any) {
      console.error('Failed to load slots:', err)
      setError(err.message || 'Failed to load available slots')
      setSlots([])
      setGroupedSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const groupSlotsByDate = (slots: SlotAvailability[]) => {
    const grouped: { [key: string]: SlotAvailability[] } = {}

    slots.forEach(slot => {
      const date = new Date(slot.startTime).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(slot)
    })

    const result = Object.keys(grouped).map(date => ({
      date,
      slots: grouped[date].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    }))

    setGroupedSlots(result)
  }

  const handleSlotClick = (slot: SlotAvailability) => {
    if (slot.availableCount === 0 || loading) return
    setSelectedSlotId(slot.slotId)
  }

  const handleConfirmSelection = () => {
    const slot = slots.find(s => s.slotId === selectedSlotId)
    if (slot) {
      onSelectSlot(slot)
    }
  }

  const getAvailabilityColor = (availableCount: number, totalCapacity: number) => {
    const percentage = (availableCount / totalCapacity) * 100
    
    if (percentage === 0) return 'bg-gray-300 text-gray-600 cursor-not-allowed'
    if (percentage <= 20) return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
    if (percentage <= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
    return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
  }

  if (loadingSlots) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available slots...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isMigrationError = error.includes('Database function not found') || 
                            error.includes('not configured')
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-medium mb-2">
              Unable to Load Available Slots
            </h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            
            {isMigrationError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-yellow-800 text-sm font-medium mb-2">
                      For Administrators:
                    </p>
                    <p className="text-yellow-700 text-xs mb-2">
                      The booking system database functions are not installed. This prevents users from making reservations.
                    </p>
                    <div className="bg-yellow-100 rounded p-2 mt-2">
                      <p className="text-yellow-800 text-xs font-mono mb-1">
                        Run: <code className="bg-yellow-200 px-1 rounded">supabase db push</code>
                      </p>
                      <p className="text-yellow-800 text-xs font-mono">
                        Or apply: <code className="bg-yellow-200 px-1 rounded">20240102000000_booking_slots_system.sql</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={loadSlots}
              disabled={loadingSlots}
              className="btn-primary disabled:opacity-50"
            >
              {loadingSlots ? 'Retrying...' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
        <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Available Slots
        </h3>
        <p className="text-gray-600 mb-4">
          There are no available time slots for this event at the moment.
        </p>
        <button
          onClick={loadSlots}
          className="btn-secondary text-sm"
        >
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Select a Time Slot
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {slots.length} slot{slots.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <button
          onClick={loadSlots}
          disabled={loadingSlots}
          className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
        >
          {loadingSlots ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Slots by Date */}
      {groupedSlots.map((group) => (
        <div key={group.date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Date Header */}
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-primary-600 mr-2" />
              <h3 className="font-medium text-gray-900">{group.date}</h3>
            </div>
          </div>

          {/* Slots Grid */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {group.slots.map((slot) => {
              const isSelected = slot.slotId === selectedSlotId
              const isAvailable = slot.availableCount > 0
              const availabilityColor = getAvailabilityColor(
                slot.availableCount, 
                slot.totalCapacity
              )

              return (
                <button
                  key={slot.slotId}
                  onClick={() => handleSlotClick(slot)}
                  disabled={!isAvailable || loading}
                  className={`
                    relative p-3 rounded-lg border-2 transition-all text-left
                    ${isSelected 
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600' 
                      : 'border-gray-200'
                    }
                    ${isAvailable && !loading
                      ? 'hover:border-primary-400 cursor-pointer' 
                      : 'opacity-60 cursor-not-allowed'
                    }
                  `}
                >
                  {/* Time */}
                  <div className="flex items-center mb-2">
                    <ClockIcon className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm font-medium text-gray-900">
                      {BookingService.formatSlotTime(slot.startTime, slot.endTime)}
                    </span>
                  </div>

                  {/* Availability Badge */}
                  <div className={`
                    inline-flex items-center px-2 py-1 rounded text-xs font-medium
                    ${availabilityColor}
                  `}>
                    <UserGroupIcon className="h-3 w-3 mr-1" />
                    {isAvailable 
                      ? `${slot.availableCount} left` 
                      : 'Full'
                    }
                  </div>

                  {/* Price (if applicable) */}
                  {slot.price > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      ${slot.price.toFixed(2)}
                    </div>
                  )}

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="h-5 w-5 bg-primary-600 rounded-full flex items-center justify-center">
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Confirm Button */}
      {selectedSlotId && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-lg">
          <button
            onClick={handleConfirmSelection}
            disabled={loading}
            className="btn-primary w-full py-3 text-lg disabled:opacity-50"
          >
            {loading ? 'Reserving...' : 'Continue with Selected Slot'}
          </button>
        </div>
      )}
    </div>
  )
}