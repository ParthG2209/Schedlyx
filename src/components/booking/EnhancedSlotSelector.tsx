// src/components/booking/EnhancedSlotSelector.tsx
// UI-ONLY VERSION - No booking logic, no backend calls
// All logic delegated to booking service from PR #41

import { useState } from 'react'
import { 
  ClockIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface SlotAvailability {
  slotId: string
  startTime: string
  endTime: string
  totalCapacity: number
  availableCount: number
  price: number
}

interface GroupedSlots {
  date: string
  dateObj: Date
  slots: SlotAvailability[]
}

type CapacityLevel = 'high' | 'medium' | 'low' | 'full'

interface EnhancedSlotSelectorProps {
  slots: SlotAvailability[]
  loading?: boolean
  error?: string | null
  lastRefresh?: Date
  onSelectSlot: (slot: SlotAvailability, quantity: number) => void
  onRefresh?: () => void
  maxQuantity?: number
}

export function EnhancedSlotSelector({ 
  slots,
  loading = false,
  error = null,
  lastRefresh,
  onSelectSlot,
  onRefresh,
  maxQuantity = 10
}: EnhancedSlotSelectorProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1)
  const [quantityError, setQuantityError] = useState<string | null>(null)

  const groupSlotsByDate = (slots: SlotAvailability[]): GroupedSlots[] => {
    const grouped: { [key: string]: SlotAvailability[] } = {}

    slots.forEach(slot => {
      const dateObj = new Date(slot.startTime)
      const dateKey = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(slot)
    })

    return Object.entries(grouped).map(([date, slots]) => ({
      date,
      dateObj: new Date(slots[0].startTime),
      slots: slots.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
    })).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
  }

  const groupedSlots = groupSlotsByDate(slots)

  const getCapacityLevel = (available: number, total: number): CapacityLevel => {
    const percentage = (available / total) * 100
    if (percentage === 0) return 'full'
    if (percentage <= 25) return 'low'
    if (percentage <= 50) return 'medium'
    return 'high'
  }

  const getCapacityColor = (level: CapacityLevel): string => {
    switch (level) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-orange-600'
      case 'full': return 'text-red-600'
    }
  }

  const getCapacityBgColor = (level: CapacityLevel, isSelected: boolean): string => {
    if (isSelected) return 'bg-primary-50 border-primary-600'
    
    switch (level) {
      case 'high': return 'bg-green-50 border-green-300 hover:border-green-400'
      case 'medium': return 'bg-yellow-50 border-yellow-300 hover:border-yellow-400'
      case 'low': return 'bg-orange-50 border-orange-300 hover:border-orange-400'
      case 'full': return 'bg-gray-100 border-gray-300 cursor-not-allowed'
    }
  }

  const getCapacityIcon = (level: CapacityLevel) => {
    switch (level) {
      case 'high': return <CheckCircleIcon className="h-4 w-4 text-green-600" />
      case 'medium': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
      case 'low': return <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
      case 'full': return <XCircleIcon className="h-4 w-4 text-red-600" />
    }
  }

  const getCapacityMessage = (level: CapacityLevel, available: number): string => {
    switch (level) {
      case 'high': return `${available} slots available`
      case 'medium': return `${available} slots left`
      case 'low': return `Only ${available} left!`
      case 'full': return 'Fully booked'
    }
  }

  const formatSlotTime = (startTime: string, endTime: string): string => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return `${start.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`
  }

  const handleSlotClick = (slot: SlotAvailability) => {
    if (slot.availableCount === 0 || loading) return
    
    setSelectedSlotId(slot.slotId)
    setQuantityError(null)
    
    // Reset quantity if it exceeds new slot's capacity
    if (selectedQuantity > slot.availableCount) {
      setSelectedQuantity(Math.min(1, slot.availableCount))
    }
  }

  const handleQuantityChange = (newQuantity: number) => {
    const selectedSlot = slots.find(s => s.slotId === selectedSlotId)
    if (!selectedSlot) return
    
    // UI validation only - backend will be the authority
    if (newQuantity > selectedSlot.availableCount) {
      setQuantityError(`Only ${selectedSlot.availableCount} slot(s) appear available`)
    } else {
      setQuantityError(null)
    }
    
    setSelectedQuantity(newQuantity)
  }

  const handleConfirmSelection = () => {
    const slot = slots.find(s => s.slotId === selectedSlotId)
    if (!slot) return
    
    if (selectedQuantity <= 0) {
      setQuantityError('Please select a valid quantity')
      return
    }
    
    onSelectSlot(slot, selectedQuantity)
  }

  const selectedSlot = slots.find(s => s.slotId === selectedSlotId)

  // Loading state
  if (loading && slots.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available slots...</p>
        </div>
      </div>
    )
  }

  // Error state with retry
  if (error && slots.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-red-800 font-medium mb-2">
              Unable to Load Available Slots
            </h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Retrying...' : 'Try Again'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Empty state
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
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-secondary text-sm"
          >
            Refresh
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Select a Time Slot
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {slots.length} slot{slots.length !== 1 ? 's' : ''} available
          </p>
        </div>
        {onRefresh && lastRefresh && (
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </p>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50 flex items-center gap-1"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {/* Capacity Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Availability shown is informational only
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                <span className="text-gray-700">High availability</span>
              </div>
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-700">Medium capacity</span>
              </div>
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
                <span className="text-gray-700">Limited slots</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircleIcon className="h-4 w-4 text-red-600" />
                <span className="text-gray-700">Fully booked</span>
              </div>
            </div>
          </div>
        </div>
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
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.slots.map((slot) => {
              const isSelected = slot.slotId === selectedSlotId
              const capacityLevel = getCapacityLevel(slot.availableCount, slot.totalCapacity)
              const isAvailable = slot.availableCount > 0

              return (
                <button
                  key={slot.slotId}
                  onClick={() => handleSlotClick(slot)}
                  disabled={!isAvailable || loading}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all text-left
                    ${isSelected 
                      ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-600' 
                      : getCapacityBgColor(capacityLevel, false)
                    }
                    ${isAvailable && !loading
                      ? 'cursor-pointer hover:shadow-md' 
                      : 'opacity-60 cursor-not-allowed'
                    }
                  `}
                >
                  {/* Time */}
                  <div className="flex items-center mb-2">
                    <ClockIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatSlotTime(slot.startTime, slot.endTime)}
                    </span>
                  </div>

                  {/* Capacity Badge */}
                  <div className={`
                    inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium
                    border ${capacityLevel === 'full' ? 'bg-gray-100 border-gray-300' : ''}
                  `}>
                    <div className="flex items-center gap-1.5">
                      {getCapacityIcon(capacityLevel)}
                      <UserGroupIcon className="h-3.5 w-3.5" />
                      <span className={getCapacityColor(capacityLevel)}>
                        {getCapacityMessage(capacityLevel, slot.availableCount)}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          capacityLevel === 'high' ? 'bg-green-500' :
                          capacityLevel === 'medium' ? 'bg-yellow-500' :
                          capacityLevel === 'low' ? 'bg-orange-500' :
                          'bg-gray-400'
                        }`}
                        style={{ 
                          width: `${(slot.availableCount / slot.totalCapacity) * 100}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {slot.availableCount} / {slot.totalCapacity} available
                    </p>
                  </div>

                  {/* Price */}
                  {slot.price > 0 && (
                    <div className="mt-2 text-sm font-semibold text-gray-900">
                      ${slot.price.toFixed(2)}
                    </div>
                  )}

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="h-6 w-6 bg-primary-600 rounded-full flex items-center justify-center">
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Quantity Selector and Confirm Button */}
      {selectedSlotId && selectedSlot && (
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-4 shadow-lg rounded-lg">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Selected Slot Summary */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-primary-900 mb-2">
                    Selected Time Slot
                  </h3>
                  <div className="space-y-1 text-sm text-primary-800">
                    <p className="font-semibold">
                      {formatSlotTime(selectedSlot.startTime, selectedSlot.endTime)}
                    </p>
                    <p>
                      {new Date(selectedSlot.startTime).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      {getCapacityIcon(getCapacityLevel(selectedSlot.availableCount, selectedSlot.totalCapacity))}
                      <span className="text-xs">
                        {getCapacityMessage(
                          getCapacityLevel(selectedSlot.availableCount, selectedSlot.totalCapacity),
                          selectedSlot.availableCount
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Number of slots:
              </label>
              <select
                value={selectedQuantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                disabled={loading}
                className="input-field w-32"
              >
                {Array.from(
                  { length: Math.min(maxQuantity, selectedSlot.availableCount) }, 
                  (_, i) => i + 1
                ).map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'slot' : 'slots'}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Error */}
            {quantityError && (
              <div className="text-sm text-orange-600 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {quantityError}
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium text-gray-900">{selectedQuantity}</span>
              </div>
              {selectedSlot.price > 0 && (
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-semibold text-gray-900">
                    ${(selectedSlot.price * selectedQuantity).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirmSelection}
              disabled={loading}
              className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Continue with ${selectedQuantity} Slot${selectedQuantity > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}