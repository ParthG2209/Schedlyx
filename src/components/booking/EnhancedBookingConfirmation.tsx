// src/components/booking/EnhancedBookingConfirmation.tsx
// Enhanced confirmation screen with QR code and better UX
// THIS FILE IS DEPRECATED AND NOT INTENDED TO USE
import { useState } from 'react'
import { 
  CheckCircleIcon, 
  CalendarIcon, 
  EnvelopeIcon, 
  PrinterIcon,
  ShareIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { ConfirmedBooking } from '../../types/booking'

interface EnhancedBookingConfirmationProps {
  booking: ConfirmedBooking
  onClose: () => void
}

export function EnhancedBookingConfirmation({ 
  booking, 
  onClose 
}: EnhancedBookingConfirmationProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(booking.bookingReference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleAddToCalendar = () => {
    setDownloading(true)
    
    try {
      const dateOnly = booking.date.replace(/-/g, '')
      const timeOnly = booking.time.replace(/:/g, '').substring(0, 6)
      const startTimestamp = `${dateOnly}T${timeOnly}Z`
      
      const event = {
        title: `Booking ${booking.bookingReference}`,
        description: `Your booking has been confirmed. Reference: ${booking.bookingReference}`
      }

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Schedlyx//Booking System//EN
BEGIN:VEVENT
UID:${booking.id}@schedlyx.app
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startTimestamp}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `booking-${booking.bookingReference}.ics`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to create calendar event:', err)
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    const shareData = {
      title: 'My Booking Confirmation',
      text: `My booking is confirmed! Reference: ${booking.bookingReference}`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        console.error('Error sharing:', err)
      }
    } else {
      handleCopyReference()
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto print:max-w-full">
      {/* Success Animation */}
      <div className="text-center">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 border-4 border-green-200">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mt-6">
          Booking Confirmed!
        </h2>
        <p className="mt-2 text-lg text-gray-600">
          Your spot has been successfully reserved
        </p>
      </div>

      {/* Booking Reference Card */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200 rounded-xl p-6 shadow-lg">
        <div className="text-center">
          <p className="text-sm font-medium text-primary-900 mb-3 uppercase tracking-wide">
            Your Booking Reference
          </p>
          <div className="bg-white rounded-lg p-4 mb-4 shadow-inner">
            <p className="text-4xl font-bold text-primary-600 tracking-wider font-mono">
              {booking.bookingReference}
            </p>
          </div>
          <button
            onClick={handleCopyReference}
            className="inline-flex items-center px-4 py-2 bg-white text-primary-700 rounded-lg hover:bg-gray-50 transition-colors border border-primary-200"
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            {copied ? '✓ Copied!' : 'Copy Reference'}
          </button>
          <p className="text-xs text-primary-700 mt-3">
            Please save this reference number for your records
          </p>
        </div>
      </div>

      {/* Booking Details Card */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
        <h3 className="font-semibold text-gray-900 mb-5 text-lg flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-primary-600" />
          Booking Details
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div className="flex items-start py-3 border-b border-gray-100">
            <UserIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-base font-semibold text-gray-900 mt-1">
                {booking.firstName} {booking.lastName}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start py-3 border-b border-gray-100">
            <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-base font-semibold text-gray-900 mt-1">
                {booking.email}
              </p>
            </div>
          </div>

          {/* Phone */}
          {booking.phone && (
            <div className="flex items-start py-3 border-b border-gray-100">
              <svg className="h-5 w-5 text-gray-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-base font-semibold text-gray-900 mt-1">
                  {booking.phone}
                </p>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="flex items-start py-3 border-b border-gray-100">
            <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">Date & Time</p>
              <p className="text-base font-semibold text-gray-900 mt-1">
                {new Date(booking.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1 flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                {booking.time}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-start py-3">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600">Status</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mt-1">
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Email Confirmation Notice */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <EnvelopeIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-semibold text-blue-900">
              📧 Confirmation Email Sent
            </h3>
            <p className="text-sm text-blue-800 mt-2">
              A detailed confirmation email with all booking information has been sent to{' '}
              <span className="font-semibold">{booking.email}</span>
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Please check your spam folder if you don't see it in your inbox within a few minutes
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:hidden">
        <button
          onClick={handleAddToCalendar}
          disabled={downloading}
          className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all hover:shadow-md disabled:opacity-50"
        >
          <CalendarIcon className="h-5 w-5 mr-2 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            {downloading ? 'Downloading...' : 'Add to Calendar'}
          </span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all hover:shadow-md"
        >
          <PrinterIcon className="h-5 w-5 mr-2 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            Print Details
          </span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all hover:shadow-md"
        >
          <ShareIcon className="h-5 w-5 mr-2 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">
            Share
          </span>
        </button>
      </div>

      {/* Done Button */}
      <button
        onClick={onClose}
        className="btn-primary w-full py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all print:hidden"
      >
        Done
      </button>

      {/* Help Footer */}
      <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200">
        <p className="mb-2">
          Need to make changes or have questions?
        </p>
        <p className="text-xs text-gray-500">
          Contact us with your booking reference:{' '}
          <span className="font-mono font-semibold text-primary-600">
            {booking.bookingReference}
          </span>
        </p>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          .print\\:max-w-full {
            max-width: 100% !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}