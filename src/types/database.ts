
// Database types matching the Supabase schema
// Auto-generated types for type-safe database queries

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      events: {
        Row: Event
        Insert: EventInsert
        Update: EventUpdate
      }
      event_sessions: {
        Row: EventSession
        Insert: EventSessionInsert
        Update: EventSessionUpdate
      }
      bookings: {
        Row: Booking
        Insert: BookingInsert
        Update: BookingUpdate
      }
      waitlist: {
        Row: WaitlistEntry
        Insert: WaitlistInsert
        Update: WaitlistUpdate
      }
      availabilities: {
        Row: Availability
        Insert: AvailabilityInsert
        Update: AvailabilityUpdate
      }
      availability_overrides: {
        Row: AvailabilityOverride
        Insert: AvailabilityOverrideInsert
        Update: AvailabilityOverrideUpdate
      }
      calendar_integrations: {
        Row: CalendarIntegration
        Insert: CalendarIntegrationInsert
        Update: CalendarIntegrationUpdate
      }
      notifications: {
        Row: Notification
        Insert: NotificationInsert
        Update: NotificationUpdate
      }
      event_analytics: {
        Row: EventAnalytics
        Insert: EventAnalyticsInsert
        Update: EventAnalyticsUpdate
      }
      audit_log: {
        Row: AuditLog
        Insert: AuditLogInsert
        Update: never
      }
    }
    Functions: {
      create_booking: {
        Args: CreateBookingArgs
        Returns: string
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_cancellation_reason?: string }
        Returns: boolean
      }
      add_to_waitlist: {
        Args: AddToWaitlistArgs
        Returns: string
      }
      get_available_slots: {
        Args: { p_event_id: string; p_date: string }
        Returns: TimeSlot[]
      }
      is_user_available: {
        Args: { 
          p_user_id: string
          p_date: string
          p_start_time: string
          p_end_time: string
        }
        Returns: boolean
      }
      get_event_stats: {
        Args: { p_event_id: string }
        Returns: EventStats
      }
      search_events: {
        Args: { p_query: string; p_limit?: number; p_offset?: number }
        Returns: SearchResult[]
      }
    }
  }
}

// =====================================================
// TABLE TYPES
// =====================================================

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string
  bio?: string
  timezone: string
  phone?: string
  organization?: string
  role?: string
  is_active: boolean
  email_notifications: boolean
  sms_notifications: boolean
  created_at: string
  updated_at: string
}

export interface ProfileInsert {
  id: string
  email: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  bio?: string
  timezone?: string
  phone?: string
  organization?: string
  role?: string
  is_active?: boolean
  email_notifications?: boolean
  sms_notifications?: boolean
}

export interface ProfileUpdate {
  email?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  bio?: string
  timezone?: string
  phone?: string
  organization?: string
  role?: string
  is_active?: boolean
  email_notifications?: boolean
  sms_notifications?: boolean
}

export interface Event {
  id: string
  user_id: string
  title: string
  slug: string
  description?: string
  type: EventType
  duration: number
  buffer_time: number
  location?: string
  is_online: boolean
  meeting_url?: string
  max_attendees?: number
  min_attendees: number
  current_attendees: number
  requires_approval: boolean
  allow_cancellation: boolean
  cancellation_deadline: number
  booking_window_start: number
  booking_window_end: number
  available_days: string[]
  time_slots: TimeSlotRange
  recurring_schedule?: RecurringSchedule
  status: EventStatus
  visibility: EventVisibility
  custom_fields: CustomField[]
  confirmation_message?: string
  reminder_settings: ReminderSettings
  tags?: string[]
  color: string
  cover_image_url?: string
  created_at: string
  updated_at: string
}

export interface EventInsert {
  user_id: string
  title: string
  slug?: string
  description?: string
  type: EventType
  duration: number
  buffer_time?: number
  location?: string
  is_online?: boolean
  meeting_url?: string
  max_attendees?: number
  min_attendees?: number
  requires_approval?: boolean
  allow_cancellation?: boolean
  cancellation_deadline?: number
  booking_window_start?: number
  booking_window_end?: number
  available_days?: string[]
  time_slots?: TimeSlotRange
  recurring_schedule?: RecurringSchedule
  status?: EventStatus
  visibility?: EventVisibility
  custom_fields?: CustomField[]
  confirmation_message?: string
  reminder_settings?: ReminderSettings
  tags?: string[]
  color?: string
  cover_image_url?: string
}

export interface EventUpdate {
  title?: string
  slug?: string
  description?: string
  type?: EventType
  duration?: number
  buffer_time?: number
  location?: string
  is_online?: boolean
  meeting_url?: string
  max_attendees?: number
  min_attendees?: number
  requires_approval?: boolean
  allow_cancellation?: boolean
  cancellation_deadline?: number
  booking_window_start?: number
  booking_window_end?: number
  available_days?: string[]
  time_slots?: TimeSlotRange
  recurring_schedule?: RecurringSchedule
  status?: EventStatus
  visibility?: EventVisibility
  custom_fields?: CustomField[]
  confirmation_message?: string
  reminder_settings?: ReminderSettings
  tags?: string[]
  color?: string
  cover_image_url?: string
}

export interface EventSession {
  id: string
  event_id: string
  title?: string
  description?: string
  start_time: string
  end_time: string
  max_attendees?: number
  current_attendees: number
  location?: string
  meeting_url?: string
  status: SessionStatus
  hosts?: string[]
  speakers?: Speaker[]
  created_at: string
  updated_at: string
}

export interface EventSessionInsert {
  event_id: string
  title?: string
  description?: string
  start_time: string
  end_time: string
  max_attendees?: number
  location?: string
  meeting_url?: string
  status?: SessionStatus
  hosts?: string[]
  speakers?: Speaker[]
}

export interface EventSessionUpdate {
  title?: string
  description?: string
  start_time?: string
  end_time?: string
  max_attendees?: number
  location?: string
  meeting_url?: string
  status?: SessionStatus
  hosts?: string[]
  speakers?: Speaker[]
}

export interface Booking {
  id: string
  event_id: string
  session_id?: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date: string
  time: string
  timezone: string
  status: BookingStatus
  notes?: string
  custom_responses: Record<string, any>
  checked_in: boolean
  checked_in_at?: string
  attended: boolean
  cancelled_at?: string
  cancellation_reason?: string
  payment_status: PaymentStatus
  payment_amount?: number
  payment_currency: string
  source?: string
  referrer?: string
  created_at: string
  updated_at: string
}

export interface BookingInsert {
  event_id: string
  session_id?: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  date: string
  time: string
  timezone?: string
  status?: BookingStatus
  notes?: string
  custom_responses?: Record<string, any>
  source?: string
  referrer?: string
}

export interface BookingUpdate {
  status?: BookingStatus
  notes?: string
  checked_in?: boolean
  checked_in_at?: string
  attended?: boolean
  cancelled_at?: string
  cancellation_reason?: string
  payment_status?: PaymentStatus
  payment_amount?: number
}

export interface WaitlistEntry {
  id: string
  event_id: string
  session_id?: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  position: number
  notified: boolean
  notified_at?: string
  converted_to_booking: boolean
  converted_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface WaitlistInsert {
  event_id: string
  session_id?: string
  user_id?: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  notes?: string
}

export interface WaitlistUpdate {
  position?: number
  notified?: boolean
  notified_at?: string
  converted_to_booking?: boolean
  converted_at?: string
}

export interface Availability {
  id: string
  user_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface AvailabilityInsert {
  user_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_enabled?: boolean
}

export interface AvailabilityUpdate {
  day_of_week?: number
  start_time?: string
  end_time?: string
  is_enabled?: boolean
}

export interface AvailabilityOverride {
  id: string
  user_id: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  type: AvailabilityType
  reason?: string
  recurring: boolean
  recurrence_pattern?: RecurrencePattern
  created_at: string
  updated_at: string
}

export interface AvailabilityOverrideInsert {
  user_id: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  type: AvailabilityType
  reason?: string
  recurring?: boolean
  recurrence_pattern?: RecurrencePattern
}

export interface AvailabilityOverrideUpdate {
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  type?: AvailabilityType
  reason?: string
  recurring?: boolean
  recurrence_pattern?: RecurrencePattern
}

export interface CalendarIntegration {
  id: string
  user_id: string
  provider: CalendarProvider
  provider_calendar_id: string
  access_token: string
  refresh_token?: string
  token_expires_at?: string
  sync_enabled: boolean
  sync_direction: SyncDirection
  last_sync_at?: string
  calendar_name?: string
  calendar_color?: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface CalendarIntegrationInsert {
  user_id: string
  provider: CalendarProvider
  provider_calendar_id: string
  access_token: string
  refresh_token?: string
  token_expires_at?: string
  sync_enabled?: boolean
  sync_direction?: SyncDirection
  calendar_name?: string
  calendar_color?: string
  is_primary?: boolean
}

export interface CalendarIntegrationUpdate {
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  sync_enabled?: boolean
  sync_direction?: SyncDirection
  last_sync_at?: string
  calendar_name?: string
  calendar_color?: string
  is_primary?: boolean
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  event_id?: string
  booking_id?: string
  is_read: boolean
  read_at?: string
  sent_via_email: boolean
  sent_via_sms: boolean
  sent_at?: string
  data: Record<string, any>
  created_at: string
}

export interface NotificationInsert {
  user_id: string
  type: NotificationType
  title: string
  message: string
  event_id?: string
  booking_id?: string
  data?: Record<string, any>
}

export interface NotificationUpdate {
  is_read?: boolean
  read_at?: string
}

export interface EventAnalytics {
  id: string
  event_id: string
  date: string
  views: number
  unique_views: number
  bookings_created: number
  bookings_confirmed: number
  bookings_cancelled: number
  no_shows: number
  attendees: number
  conversion_rate?: number
  attendance_rate?: number
  created_at: string
  updated_at: string
}

export interface EventAnalyticsInsert {
  event_id: string
  date: string
  views?: number
  unique_views?: number
  bookings_created?: number
  bookings_confirmed?: number
  bookings_cancelled?: number
  no_shows?: number
  attendees?: number
}

export interface EventAnalyticsUpdate {
  views?: number
  unique_views?: number
  bookings_created?: number
  bookings_confirmed?: number
  bookings_cancelled?: number
  no_shows?: number
  attendees?: number
}

export interface AuditLog {
  id: string
  user_id?: string
  action: AuditAction
  entity_type: EntityType
  entity_id: string
  old_data?: Record<string, any>
  new_data?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export interface AuditLogInsert {
  user_id?: string
  action: AuditAction
  entity_type: EntityType
  entity_id: string
  old_data?: Record<string, any>
  new_data?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

// =====================================================
// ENUMS AND TYPES
// =====================================================

export type EventType = 
  | 'meeting'
  | 'workshop'
  | 'conference'
  | 'consultation'
  | 'interview'
  | 'webinar'
  | 'other'

export type EventStatus = 
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

export type EventVisibility = 
  | 'public'
  | 'private'
  | 'unlisted'

export type SessionStatus = 
  | 'scheduled'
  | 'ongoing'
  | 'completed'
  | 'cancelled'

export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'no_show'
  | 'completed'

export type PaymentStatus = 
  | 'free'
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed'

export type AvailabilityType = 
  | 'unavailable'
  | 'available'
  | 'busy'

export type CalendarProvider = 
  | 'google'
  | 'outlook'
  | 'apple'
  | 'other'

export type SyncDirection = 
  | 'import'
  | 'export'
  | 'both'

export type NotificationType = 
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'event_updated'
  | 'event_cancelled'
  | 'payment_received'
  | 'waitlist_spot_available'
  | 'system_update'

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'

export type EntityType = 
  | 'profile'
  | 'event'
  | 'booking'
  | 'session'
  | 'integration'

// =====================================================
// HELPER TYPES
// =====================================================

export interface TimeSlotRange {
  start: string
  end: string
}

export interface TimeSlot {
  slot_time: string
  available: boolean
}

export interface CustomField {
  id: string
  label: string
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox'
  required: boolean
  options?: string[]
  placeholder?: string
}

export interface ReminderSettings {
  enabled: boolean
  hours_before: number[]
}

export interface RecurringSchedule {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  end_date?: string
  days_of_week?: number[]
  day_of_month?: number
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  days_of_week?: number[]
}

export interface Speaker {
  name: string
  title?: string
  bio?: string
  avatar_url?: string
  social_links?: Record<string, string>
}

export interface EventStats {
  total_bookings: number
  confirmed_bookings: number
  pending_bookings: number
  cancelled_bookings: number
  attendance_rate: number
  avg_booking_lead_time: string
}

export interface SearchResult {
  id: string
  title: string
  description?: string
  type: EventType
  relevance: number
}

// =====================================================
// FUNCTION ARGUMENT TYPES
// =====================================================

export interface CreateBookingArgs {
  p_event_id: string
  p_session_id?: string
  p_first_name: string
  p_last_name: string
  p_email: string
  p_phone?: string
  p_date: string
  p_time: string
  p_notes?: string
  p_custom_responses?: Record<string, any>
}

export interface AddToWaitlistArgs {
  p_event_id: string
  p_session_id?: string
  p_first_name: string
  p_last_name: string
  p_email: string
  p_phone?: string
  p_notes?: string
}