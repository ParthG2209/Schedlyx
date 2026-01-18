// src/components/booking/BookingForm.tsx
// User details form during booking process
// THIS FILE IS DEPRECATED AND NOT INTENDED TO USE

import { useState, useEffect } from 'react'
import { ClockIcon } from '@heroicons/react/24/outline'
import { BookingFormData, SlotAvailability } from '../../types/booking'
import { BookingService } from '../../lib/services/bookingService'

interface BookingFormProps {
  selectedSlot: SlotAvailability
  formData: BookingFormData
  timeRemaining: number
  onUpdateFormData: (data: Partial<BookingFormData>) => void
  onSubmit: () => void
  onCancel: () => void
  loading?: boolean
}

export function BookingForm({
  selectedSlot,
  formData,
  timeRemaining,
  onUpdateFormData,
  onSubmit,
  onCancel,
  loading
}: BookingFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    onUpdateFormData({ [name]: value })
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit()
    }
  }

  // Warn user before time runs out
  useEffect(() => {
    if (timeRemaining === 60) {
      // Show warning at 1 minute
      alert('⚠️ Your reservation will expire in 1 minute!')
    }
  }, [timeRemaining])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerColor = () => {
    if (timeRemaining <= 60) return 'text-red-600'
    if (timeRemaining <= 180) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      {/* Timer Warning */}
      <div className={`bg-yellow-50 border-l-4 border-yellow-400 p-4 ${
        timeRemaining <= 60 ? 'animate-pulse' : ''
      }`}>
        <div className="flex items-center">
          <ClockIcon className={`h-5 w-5 mr-3 ${getTimerColor()}`} />
          <div className="flex-1">
            <p className="text-sm text-gray-900">
              <span className="font-medium">Time remaining: </span>
              <span className={`font-bold ${getTimerColor()}`}>
                {formatTime(timeRemaining)}
              </span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Complete your booking before the timer expires
            </p>
          </div>
        </div>
      </div>

      {/* Selected Slot Summary */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-primary-900 mb-2">
          Selected Time Slot
        </h3>
        <div className="text-sm text-primary-800">
          <p className="font-semibold">
            {BookingService.formatSlotTime(selectedSlot.startTime, selectedSlot.endTime)}
          </p>
          <p className="mt-1">
            {new Date(selectedSlot.startTime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`input-field ${errors.firstName ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`input-field ${errors.lastName ? 'border-red-500' : ''}`}
              disabled={loading}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`input-field ${errors.email ? 'border-red-500' : ''}`}
            disabled={loading}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Confirmation will be sent to this email
          </p>
        </div>

        {/* Phone (Optional) */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="input-field"
            disabled={loading}
          />
        </div>

        {/* Notes (Optional) */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes}
            onChange={handleChange}
            className="input-field"
            placeholder="Any special requirements or questions?"
            disabled={loading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 btn-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            {loading ? 'Confirming...' : 'Confirm Booking'}
          </button>
        </div>
      </form>

      {/* Terms Notice */}
      <div className="text-xs text-gray-500 text-center">
        By confirming, you agree to our Terms of Service and Privacy Policy
      </div>
    </div>
  )
}