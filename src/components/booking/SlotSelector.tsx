// src/components/booking/SlotSelector.tsx
// BookMyShow-style slot selection interface

import { useState, useEffect } from 'react'
import { ClockIcon, UserGroupIcon, CalendarIcon } from '@heroicons/react/24/outline'
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
      const availableSlots = await BookingService.getAvailableSlots(eventId)
      setSlots(availableSlots)
      groupSlotsByDate(availableSlots)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load available slots')
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadSlots}
          className="mt-4 btn-primary"
        >
          Try Again
        </button>
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
        <p className="text-gray-600">
          There are no available time slots for this event at the moment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Select a Time Slot
        </h2>
        <button
          onClick={loadSlots}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Refresh
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
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
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