// src/pages/BookingConfirmed.tsx
// Booking confirmation page - displays booking details after successful booking

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
    CheckCircleIcon,
    CalendarIcon,
    ClockIcon,
    EnvelopeIcon,
    PrinterIcon,
    ShareIcon,
    UserIcon,
    DocumentDuplicateIcon,
    MapPinIcon,
    ArrowLeftIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { db } from '../lib/supabase'

interface BookingDetails {
    id: string
    booking_reference: string
    first_name: string
    last_name: string
    email: string
    phone: string | null
    notes: string | null
    status: string
    confirmed_at: string
    created_at: string
    event: {
        id: string
        title: string
        description: string
        type: string
        duration: number
        location: string | null
        is_online: boolean
    } | null
    slot: {
        id: string
        start_time: string
        end_time: string
        price: number
        currency: string
    } | null
}

export function BookingConfirmed() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [booking, setBooking] = useState<BookingDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [downloading, setDownloading] = useState(false)

    const bookingRef = searchParams.get('ref')

    useEffect(() => {
        if (!bookingRef) {
            setError('No booking reference provided')
            setLoading(false)
            return
        }

        fetchBookingDetails()
    }, [bookingRef])

    const fetchBookingDetails = async () => {
        if (!bookingRef) return

        try {
            setLoading(true)
            setError(null)

            const { data, error: fetchError } = await db.getBookingByReference(bookingRef)

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    setError('Booking not found. Please check your booking reference.')
                } else {
                    throw fetchError
                }
                return
            }

            setBooking(data as unknown as BookingDetails)
        } catch (err) {
            console.error('Error fetching booking:', err)
            setError('Failed to load booking details. Please try again later.')
        } finally {
            setLoading(false)
        }
    }

    const handleCopyReference = async () => {
        if (!booking) return

        try {
            await navigator.clipboard.writeText(booking.booking_reference)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const handleAddToCalendar = () => {
        if (!booking || !booking.slot) return

        setDownloading(true)

        try {
            const startDate = new Date(booking.slot.start_time)
            const endDate = new Date(booking.slot.end_time)

            const formatDateForICS = (date: Date) => {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
            }

            const eventTitle = booking.event?.title || 'Scheduled Event'
            const eventLocation = booking.event?.location || ''
            const eventDescription = `Booking Reference: ${booking.booking_reference}\\n${booking.event?.description || ''}`

            const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Schedlyx//Booking System//EN
BEGIN:VEVENT
UID:${booking.id}@schedlyx.app
DTSTAMP:${formatDateForICS(new Date())}
DTSTART:${formatDateForICS(startDate)}
DTEND:${formatDateForICS(endDate)}
SUMMARY:${eventTitle}
DESCRIPTION:${eventDescription}
LOCATION:${eventLocation}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`

            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `booking-${booking.booking_reference}.ics`
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
        if (!booking) return

        const shareData = {
            title: 'My Booking Confirmation',
            text: `My booking is confirmed! Reference: ${booking.booking_reference}`,
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading your booking details...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error || !booking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 py-12 px-4">
                <div className="max-w-lg mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                            <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">Booking Not Found</h1>
                        <p className="text-gray-600 mb-6">
                            {error || 'We couldn\'t find a booking with that reference. Please check your confirmation email and try again.'}
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/')}
                                className="btn-primary w-full py-3"
                            >
                                Return to Home
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-secondary w-full py-3"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-primary-50 py-8 sm:py-12 px-4">
            <div className="max-w-2xl mx-auto print:max-w-full">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors print:hidden"
                >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Back to Home</span>
                </button>

                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                        <div className="relative mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-br from-green-100 to-green-200 border-4 border-green-300 shadow-lg">
                            <CheckCircleIcon className="h-14 w-14 text-green-600" />
                        </div>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-6">
                        Booking Confirmed!
                    </h1>
                    <p className="mt-3 text-lg text-gray-600">
                        Your spot has been successfully reserved
                    </p>
                </div>

                {/* Booking Reference Card */}
                <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-2xl p-6 sm:p-8 shadow-2xl mb-6 text-white relative overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10 text-center">
                        <p className="text-sm font-medium text-primary-100 mb-3 uppercase tracking-widest">
                            Your Booking Reference
                        </p>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
                            <p className="text-3xl sm:text-4xl font-bold tracking-widest font-mono text-white">
                                {booking.booking_reference}
                            </p>
                        </div>
                        <button
                            onClick={handleCopyReference}
                            className="inline-flex items-center px-5 py-2.5 bg-white text-primary-700 rounded-lg hover:bg-primary-50 transition-all font-medium shadow-md hover:shadow-lg"
                        >
                            <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                            {copied ? '✓ Copied!' : 'Copy Reference'}
                        </button>
                        <p className="text-xs text-primary-100 mt-4">
                            Save this reference – you'll need it for any changes or inquiries
                        </p>
                    </div>
                </div>

                {/* Event Details Card */}
                {booking.event && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                            <CalendarIcon className="h-6 w-6 mr-3 text-primary-600" />
                            Event Details
                        </h2>

                        <div className="space-y-5">
                            <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-5">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{booking.event.title}</h3>
                                {booking.event.description && (
                                    <p className="text-gray-600 text-sm">{booking.event.description}</p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                                        {booking.event.type}
                                    </span>
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                        {booking.event.duration} minutes
                                    </span>
                                </div>
                            </div>

                            {/* Date & Time */}
                            {booking.slot && (
                                <div className="flex items-start py-4 border-b border-gray-100">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                        <CalendarIcon className="h-5 w-5 text-primary-600" />
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <p className="text-sm text-gray-500 font-medium">Date & Time</p>
                                        <p className="text-base font-semibold text-gray-900 mt-1">
                                            {formatDate(booking.slot.start_time)}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                                            <ClockIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                                            {formatTime(booking.slot.start_time)} – {formatTime(booking.slot.end_time)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Location */}
                            {booking.event.location && (
                                <div className="flex items-start py-4 border-b border-gray-100">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <MapPinIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <p className="text-sm text-gray-500 font-medium">Location</p>
                                        <p className="text-base font-semibold text-gray-900 mt-1">
                                            {booking.event.is_online ? '🌐 Online Event' : booking.event.location}
                                        </p>
                                        {booking.event.is_online && booking.event.location && (
                                            <a
                                                href={booking.event.location}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-primary-600 hover:text-primary-700 underline mt-1 inline-block"
                                            >
                                                Join Meeting Link
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Price */}
                            {booking.slot && booking.slot.price > 0 && (
                                <div className="flex items-start py-4">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                                        <span className="text-lg font-bold text-green-600">$</span>
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <p className="text-sm text-gray-500 font-medium">Price</p>
                                        <p className="text-base font-semibold text-gray-900 mt-1">
                                            {new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency: booking.slot.currency
                                            }).format(booking.slot.price)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Your Information Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                        <UserIcon className="h-6 w-6 mr-3 text-primary-600" />
                        Your Information
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center py-3 border-b border-gray-100">
                            <UserIcon className="h-5 w-5 text-gray-400 mr-4" />
                            <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-semibold text-gray-900">{booking.first_name} {booking.last_name}</p>
                            </div>
                        </div>

                        <div className="flex items-center py-3 border-b border-gray-100">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-4" />
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-semibold text-gray-900">{booking.email}</p>
                            </div>
                        </div>

                        {booking.phone && (
                            <div className="flex items-center py-3 border-b border-gray-100">
                                <svg className="h-5 w-5 text-gray-400 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-semibold text-gray-900">{booking.phone}</p>
                                </div>
                            </div>
                        )}

                        {booking.notes && (
                            <div className="flex items-start py-3">
                                <svg className="h-5 w-5 text-gray-400 mr-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div>
                                    <p className="text-sm text-gray-500">Notes</p>
                                    <p className="font-medium text-gray-700">{booking.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Status Badge */}
                        <div className="pt-4">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : booking.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                <CheckCircleIcon className="h-4 w-4 mr-2" />
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Email Confirmation Notice */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className="text-base font-bold text-blue-900">
                                📧 Confirmation Email Sent
                            </h3>
                            <p className="text-sm text-blue-800 mt-2">
                                We've sent a detailed confirmation email to{' '}
                                <span className="font-semibold">{booking.email}</span>
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                                Please check your spam folder if you don't see it within a few minutes
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 print:hidden">
                    <button
                        onClick={handleAddToCalendar}
                        disabled={downloading || !booking.slot}
                        className="flex items-center justify-center px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <CalendarIcon className="h-5 w-5 mr-2 text-gray-500 group-hover:text-primary-600" />
                        <span className="text-sm font-semibold text-gray-700 group-hover:text-primary-700">
                            {downloading ? 'Downloading...' : 'Add to Calendar'}
                        </span>
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center justify-center px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all hover:shadow-md group"
                    >
                        <PrinterIcon className="h-5 w-5 mr-2 text-gray-500 group-hover:text-primary-600" />
                        <span className="text-sm font-semibold text-gray-700 group-hover:text-primary-700">
                            Print Details
                        </span>
                    </button>

                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center px-4 py-4 bg-white border-2 border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all hover:shadow-md group"
                    >
                        <ShareIcon className="h-5 w-5 mr-2 text-gray-500 group-hover:text-primary-600" />
                        <span className="text-sm font-semibold text-gray-700 group-hover:text-primary-700">
                            Share
                        </span>
                    </button>
                </div>

                {/* Done Button */}
                <Link
                    to="/"
                    className="block w-full bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 text-white text-center font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all print:hidden"
                >
                    Done – Return to Home
                </Link>

                {/* Help Footer */}
                <div className="text-center text-sm text-gray-500 pt-8 pb-4">
                    <p className="mb-2">
                        Need to make changes or have questions?
                    </p>
                    <p className="text-xs">
                        Contact us with your booking reference:{' '}
                        <span className="font-mono font-bold text-primary-600">
                            {booking.booking_reference}
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
        </div>
    )
}
