// src/components/booking/EnhancedBookingForm.tsx
// UI-ONLY VERSION - No validation logic, no timer logic
// All logic delegated to booking service from PR #41

import { useState } from 'react'
import { 
  ExclamationCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface BookingFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  notes?: string
}

interface SlotAvailability {
  slotId: string
  startTime: string
  endTime: string
  totalCapacity: number
  availableCount: number
  price: number
}

interface EnhancedBookingFormProps {
  selectedSlot: SlotAvailability
  selectedQuantity: number
  formData: BookingFormData
  timeRemaining?: number
  onUpdateFormData: (data: Partial<BookingFormData>) => void
  onSubmit: () => void
  onCancel: () => void
  loading?: boolean
}

interface FormErrors {
  [key: string]: string
}

export function EnhancedBookingForm({
  selectedSlot,
  selectedQuantity,
  formData,
  timeRemaining = 0,
  onUpdateFormData,
  onSubmit,
  onCancel,
  loading
}: EnhancedBookingFormProps) {
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = (name: string, value: string): string | null => {
    switch (name) {
      case 'firstName':
        if (!value.trim()) return 'First name is required'
        if (value.trim().length < 2) return 'First name must be at least 2 characters'
        if (!/^[a-zA-Z\s'-]+$/.test(value)) return 'First name contains invalid characters'
        return null

      case 'lastName':
        if (!value.trim()) return 'Last name is required'
        if (value.trim().length < 2) return 'Last name must be at least 2 characters'
        if (!/^[a-zA-Z\s'-]+$/.test(value)) return 'Last name contains invalid characters'
        return null

      case 'email':
        if (!value.trim()) return 'Email is required'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return 'Please enter a valid email address'
        return null

      case 'phone':
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          return 'Please enter a valid phone number'
        }
        return null

      default:
        return null
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    const firstNameError = validateField('firstName', formData.firstName)
    if (firstNameError) newErrors.firstName = firstNameError

    const lastNameError = validateField('lastName', formData.lastName)
    if (lastNameError) newErrors.lastName = lastNameError

    const emailError = validateField('email', formData.email)
    if (emailError) newErrors.email = emailError

    if (formData.phone) {
      const phoneError = validateField('phone', formData.phone)
      if (phoneError) newErrors.phone = phoneError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    onUpdateFormData({ [name]: value })
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }))
    
    // Validate field
    const error = validateField(name, value)
    setErrors(prev => {
      const newErrors = { ...prev }
      if (error) {
        newErrors[name] = error
      } else {
        delete newErrors[name]
      }
      return newErrors
    })
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      notes: true
    })
    
    if (validateForm()) {
      onSubmit()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

  const getTimerColor = () => {
    if (timeRemaining <= 60) return 'text-red-600 bg-red-50 border-red-500'
    if (timeRemaining <= 180) return 'text-yellow-600 bg-yellow-50 border-yellow-500'
    return 'text-green-600 bg-green-50 border-green-500'
  }

  const getTimerIcon = () => {
    if (timeRemaining <= 60) return '🔴'
    if (timeRemaining <= 180) return '🟡'
    return '🟢'
  }

  const isFormValid = Object.keys(errors).length === 0 && 
                      formData.firstName && 
                      formData.lastName && 
                      formData.email

  return (
    <div className="space-y-6">
      {/* Timer Warning - Display only */}
      {timeRemaining > 0 && (
        <div className={`border-l-4 p-4 rounded-r-lg ${getTimerColor()} ${
          timeRemaining <= 60 ? 'animate-pulse' : ''
        }`}>
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {getTimerIcon()} Time remaining: <span className="font-bold text-lg">{formatTime(timeRemaining)}</span>
              </p>
              <p className="text-xs mt-1 opacity-90">
                {timeRemaining <= 60 
                  ? 'Complete your booking now or your slot will be released!'
                  : 'Complete your booking before the timer expires'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Slot Summary */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-primary-900 mb-2 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              Your Reserved Slot
            </h3>
            <div className="space-y-1.5 text-sm text-primary-800">
              <p className="font-semibold text-base">
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
              <p className="text-xs pt-2 border-t border-primary-200">
                Quantity: <span className="font-semibold">{selectedQuantity}</span> slot{selectedQuantity > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Information Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Before you continue
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• All fields marked with * are required</li>
              <li>• A confirmation email will be sent to your email address</li>
              <li>• Your booking reference will be generated upon completion</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
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
              onBlur={handleBlur}
              className={`input-field ${
                touched.firstName && errors.firstName 
                  ? 'border-red-500 focus:ring-red-500' 
                  : touched.firstName && !errors.firstName
                  ? 'border-green-500 focus:ring-green-500'
                  : ''
              }`}
              disabled={loading}
              placeholder="Enter your first name"
            />
            {touched.firstName && errors.firstName && (
              <div className="flex items-center mt-1 text-xs text-red-600">
                <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                {errors.firstName}
              </div>
            )}
            {touched.firstName && !errors.firstName && formData.firstName && (
              <div className="flex items-center mt-1 text-xs text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Looks good!
              </div>
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
              onBlur={handleBlur}
              className={`input-field ${
                touched.lastName && errors.lastName 
                  ? 'border-red-500 focus:ring-red-500' 
                  : touched.lastName && !errors.lastName
                  ? 'border-green-500 focus:ring-green-500'
                  : ''
              }`}
              disabled={loading}
              placeholder="Enter your last name"
            />
            {touched.lastName && errors.lastName && (
              <div className="flex items-center mt-1 text-xs text-red-600">
                <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                {errors.lastName}
              </div>
            )}
            {touched.lastName && !errors.lastName && formData.lastName && (
              <div className="flex items-center mt-1 text-xs text-green-600">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Looks good!
              </div>
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
            onBlur={handleBlur}
            className={`input-field ${
              touched.email && errors.email 
                ? 'border-red-500 focus:ring-red-500' 
                : touched.email && !errors.email
                ? 'border-green-500 focus:ring-green-500'
                : ''
            }`}
            disabled={loading}
            placeholder="your.email@example.com"
          />
          {touched.email && errors.email && (
            <div className="flex items-center mt-1 text-xs text-red-600">
              <ExclamationCircleIcon className="h-4 w-4 mr-1" />
              {errors.email}
            </div>
          )}
          {touched.email && !errors.email && formData.email && (
            <div className="flex items-center mt-1 text-xs text-green-600">
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Confirmation will be sent here
            </div>
          )}
        </div>

        {/* Phone (Optional) */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`input-field ${
              touched.phone && errors.phone 
                ? 'border-red-500 focus:ring-red-500' 
                : ''
            }`}
            disabled={loading}
            placeholder="+1 (555) 123-4567"
          />
          {touched.phone && errors.phone && (
            <div className="flex items-center mt-1 text-xs text-red-600">
              <ExclamationCircleIcon className="h-4 w-4 mr-1" />
              {errors.phone}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            We'll only contact you about this booking
          </p>
        </div>

        {/* Notes (Optional) */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes <span className="text-gray-500 text-xs">(Optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            className="input-field resize-none"
            placeholder="Any special requirements or questions?"
            disabled={loading}
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              Tell us anything we should know
            </p>
            <p className="text-xs text-gray-400">
              {(formData.notes || '').length}/500
            </p>
          </div>
        </div>

        {/* Form Validation Summary */}
        {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-900 mb-2">
                  Please fix the following errors:
                </h4>
                <ul className="text-xs text-red-800 space-y-1">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
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
            disabled={loading || !isFormValid}
            className="flex-1 btn-primary disabled:opacity-50 relative"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Confirming Booking...
              </span>
            ) : (
              `Confirm Booking`
            )}
          </button>
        </div>
      </form>

      {/* Terms Notice */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t">
        <p>
          By confirming, you agree to our{' '}
          <a href="/terms" className="text-primary-600 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}