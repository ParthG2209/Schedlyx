// src/components/booking/BookingConfirmation.tsx
// Success screen after completing booking


import { CheckCircleIcon, CalendarIcon, EnvelopeIcon, PrinterIcon } from '@heroicons/react/24/outline'
import { ConfirmedBooking } from '../../types/booking'



interface BookingConfirmationProps {
  booking: ConfirmedBooking
  onClose: () => void
}

export function BookingConfirmation({ booking, onClose }: BookingConfirmationProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleAddToCalendar = () => {
    // Generate ICS file for calendar
    const event = {
      title: `Booking Confirmation - ${booking.bookingReference}`,
      start: new Date(booking.date + ' ' + booking.time),
      duration: 60, // Default to 1 hour
      description: `Your booking has been confirmed. Reference: ${booking.bookingReference}`
    }

    // Simple ICS format
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${event.start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:${event.title}
DESCRIPTION:${event.description}
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `booking-${booking.bookingReference}.ics`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Success Icon */}
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <CheckCircleIcon className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Booking Confirmed!
        </h2>
        <p className="mt-2 text-gray-600">
          Your booking has been successfully confirmed
        </p>
      </div>

      {/* Booking Reference */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 text-center">
        <p className="text-sm font-medium text-primary-900 mb-2">
          Booking Reference
        </p>
        <p className="text-3xl font-bold text-primary-600 tracking-wider">
          {booking.bookingReference}
        </p>
        <p className="text-xs text-primary-700 mt-2">
          Save this reference for your records
        </p>
      </div>

      {/* Booking Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 mb-4">
          Booking Details
        </h3>

        <div className="space-y-3">
          {/* Name */}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Name</span>
            <span className="text-sm font-medium text-gray-900">
              {booking.firstName} {booking.lastName}
            </span>
          </div>

          {/* Email */}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Email</span>
            <span className="text-sm font-medium text-gray-900">
              {booking.email}
            </span>
          </div>

          {/* Phone */}
          {booking.phone && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Phone</span>
              <span className="text-sm font-medium text-gray-900">
                {booking.phone}
              </span>
            </div>
          )}

          {/* Date */}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Date</span>
            <span className="text-sm font-medium text-gray-900">
              {new Date(booking.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>

          {/* Time */}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Time</span>
            <span className="text-sm font-medium text-gray-900">
              {booking.time}
            </span>
          </div>

          {/* Status */}
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {booking.status}
            </span>
          </div>
        </div>
      </div>

      {/* Email Confirmation Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <EnvelopeIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Confirmation Email Sent
            </p>
            <p className="text-sm text-blue-700 mt-1">
              A confirmation email with all details has been sent to {booking.email}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={handleAddToCalendar}
          className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <CalendarIcon className="h-5 w-5 mr-2 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            Add to Calendar
          </span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <PrinterIcon className="h-5 w-5 mr-2 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            Print Confirmation
          </span>
        </button>
      </div>

      {/* Done Button */}
      <button
        onClick={onClose}
        className="btn-primary w-full py-3"
      >
        Done
      </button>

      {/* Help Text */}
      <div className="text-center text-xs text-gray-500">
        <p>
          Need to make changes? Contact us with your booking reference
        </p>
      </div>
    </div>
  )
}