import { useState, useCallback } from 'react'
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline'

export function CreateEvent() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'meeting', // meeting, workshop, conference
    duration: 30,
    location: '',
    isOnline: false,
    maxAttendees: '',
    requiresApproval: false,
    allowCancellation: true,
    cancellationDeadline: 24,
    bufferTime: 0,
    availableDays: [] as string[],
    timeSlots: {
      start: '09:00',
      end: '17:00'
    }
  })

  // Prevent duplicate submissions
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      // TODO: Implement event creation with Supabase
      console.log('Creating event:', formData)
      // Add actual API call here
    } catch (error) {
      console.error('Error creating event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isSubmitting])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }))
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
        <p className="text-gray-600 mt-1">Set up a new event or booking page for your audience.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Event Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="input-field mt-1"
                placeholder="e.g., Team Standup, Product Demo"
                value={formData.title}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="input-field mt-1"
                placeholder="Describe what this event is about..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Event Type
                </label>
                <select
                  id="type"
                  name="type"
                  className="input-field mt-1"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="meeting">Meeting</option>
                  <option value="workshop">Workshop</option>
                  <option value="conference">Conference</option>
                  <option value="consultation">Consultation</option>
                  <option value="interview">Interview</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  min="15"
                  max="480"
                  step="15"
                  className="input-field mt-1"
                  value={formData.duration}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location & Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Settings</h2>
          
          <div className="space-y-6">
            <div className="flex items-center">
              <input
                id="isOnline"
                name="isOnline"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.isOnline}
                onChange={handleChange}
              />
              <label htmlFor="isOnline" className="ml-2 block text-sm text-gray-900">
                This is an online event
              </label>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                {formData.isOnline ? 'Meeting Link' : 'Location'}
              </label>
              <input
                type="text"
                id="location"
                name="location"
                className="input-field mt-1"
                placeholder={formData.isOnline ? 'https://zoom.us/j/...' : 'Office address or venue'}
                value={formData.location}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="maxAttendees" className="block text-sm font-medium text-gray-700">
                  Max Attendees
                </label>
                <input
                  type="number"
                  id="maxAttendees"
                  name="maxAttendees"
                  min="1"
                  className="input-field mt-1"
                  placeholder="Leave empty for unlimited"
                  value={formData.maxAttendees}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="bufferTime" className="block text-sm font-medium text-gray-700">
                  Buffer Time (minutes)
                </label>
                <input
                  type="number"
                  id="bufferTime"
                  name="bufferTime"
                  min="0"
                  max="60"
                  step="5"
                  className="input-field mt-1"
                  value={formData.bufferTime}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            <ClockIcon className="h-5 w-5 inline mr-2" />
            Availability
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Available Days
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {days.map(day => (
                  <label key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      checked={formData.availableDays.includes(day)}
                      onChange={() => handleDayToggle(day)}
                    />
                    <span className="ml-2 text-sm text-gray-900">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  className="input-field mt-1"
                  value={formData.timeSlots.start}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    timeSlots: { ...prev.timeSlots, start: e.target.value }
                  }))}
                />
              </div>
              
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  className="input-field mt-1"
                  value={formData.timeSlots.end}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    timeSlots: { ...prev.timeSlots, end: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Booking Options */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Options</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="requiresApproval"
                name="requiresApproval"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.requiresApproval}
                onChange={handleChange}
              />
              <label htmlFor="requiresApproval" className="ml-2 block text-sm text-gray-900">
                Require approval for bookings
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="allowCancellation"
                name="allowCancellation"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.allowCancellation}
                onChange={handleChange}
              />
              <label htmlFor="allowCancellation" className="ml-2 block text-sm text-gray-900">
                Allow cancellations
              </label>
            </div>
            
            {formData.allowCancellation && (
              <div className="ml-6">
                <label htmlFor="cancellationDeadline" className="block text-sm font-medium text-gray-700">
                  Cancellation deadline (hours before event)
                </label>
                <input
                  type="number"
                  id="cancellationDeadline"
                  name="cancellationDeadline"
                  min="0"
                  max="168"
                  className="input-field mt-1 max-w-xs"
                  value={formData.cancellationDeadline}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button type="button" className="btn-secondary" disabled={isSubmitting}>
            Save as Draft
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  )
}