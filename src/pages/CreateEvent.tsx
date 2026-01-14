// src/pages/CreateEvent.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export function CreateEvent() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'meeting',
    duration: 30,
    location: '',
    isOnline: false,
    maxAttendees: '10',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    timeSlots: { start: '09:00', end: '17:00' }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          duration: parseInt(formData.duration.toString()),
          location: formData.location,
          is_online: formData.isOnline,
          max_attendees: parseInt(formData.maxAttendees),
          available_days: formData.availableDays,
          time_slots: formData.timeSlots,
          status: 'active',   // FIXED: Ensure visible by RLS
          visibility: 'public' // FIXED: Ensure visible by RLS
        }])
        .select()
        .single()

      if (error) throw error
      alert('Event created! Now generate your availability slots.')
      navigate(`/admin/slots/${data.id}`)
    } catch (err: any) {
      alert(err.message || 'Failed to create event.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Create New Event</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700">Event Title *</label>
          <input name="title" required className="input-field mt-1" value={formData.title} onChange={handleChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea name="description" rows={3} className="input-field mt-1" value={formData.description} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Duration (mins)</label>
            <input name="duration" type="number" className="input-field mt-1" value={formData.duration} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Attendees</label>
            <input name="maxAttendees" type="number" className="input-field mt-1" value={formData.maxAttendees} onChange={handleChange} />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Processing...' : 'Create Event'}
        </button>
      </form>
    </div>
  )
}