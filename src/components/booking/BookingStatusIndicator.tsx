// src/components/booking/BookingStatusIndicators.tsx
// FIXED: Added disclaimers for client-side availability indicators
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  UserGroupIcon,
  LockClosedIcon,
  BoltIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface CapacityBadgeProps {
  available: number
  total: number
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  showDisclaimer?: boolean // FIXED: Add disclaimer option
}

export function CapacityBadge({ 
  available, 
  total, 
  size = 'md',
  showPercentage = false,
  showDisclaimer = false
}: CapacityBadgeProps) {
  const percentage = (available / total) * 100
  
  const getLevel = () => {
    if (percentage === 0) return 'full'
    if (percentage <= 25) return 'low'
    if (percentage <= 50) return 'medium'
    return 'high'
  }

  const level = getLevel()

  const colors = {
    high: 'bg-green-50 text-green-700 border-green-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-orange-50 text-orange-700 border-orange-200',
    full: 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span className={`
        inline-flex items-center font-medium rounded-lg border
        ${colors[level]} ${sizes[size]}
      `}>
        <UserGroupIcon className={`${iconSizes[size]} mr-1`} />
        {available} / {total}
        {showPercentage && (
          <span className="ml-1 opacity-75">
            ({Math.round(percentage)}%)
          </span>
        )}
      </span>
      {/* FIXED: Disclaimer for informational purposes */}
      {showDisclaimer && (
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <InformationCircleIcon className="h-3 w-3" />
          Availability shown is informational only
        </span>
      )}
    </div>
  )
}

interface BookingStatusBadgeProps {
  status: 'confirmed' | 'pending' | 'cancelled' | 'no_show' | 'completed'
  size?: 'sm' | 'md' | 'lg'
}

export function BookingStatusBadge({ status, size = 'md' }: BookingStatusBadgeProps) {
  const config = {
    confirmed: {
      label: 'Confirmed',
      icon: CheckCircleIcon,
      colors: 'bg-green-100 text-green-800 border-green-300'
    },
    pending: {
      label: 'Pending',
      icon: ClockIcon,
      colors: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    cancelled: {
      label: 'Cancelled',
      icon: XCircleIcon,
      colors: 'bg-red-100 text-red-800 border-red-300'
    },
    no_show: {
      label: 'No Show',
      icon: ExclamationTriangleIcon,
      colors: 'bg-orange-100 text-orange-800 border-orange-300'
    },
    completed: {
      label: 'Completed',
      icon: CheckCircleIcon,
      colors: 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const { label, icon: Icon, colors } = config[status]

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <span className={`
      inline-flex items-center font-medium rounded-lg border
      ${colors} ${sizes[size]}
    `}>
      <Icon className={`${iconSizes[size]} mr-1`} />
      {label}
    </span>
  )
}

interface SlotLockedIndicatorProps {
  expiresAt: string
  size?: 'sm' | 'md'
}

export function SlotLockedIndicator({ expiresAt, size = 'md' }: SlotLockedIndicatorProps) {
  const timeRemaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4'
  }

  return (
    <span className={`
      inline-flex items-center font-medium rounded-lg
      bg-primary-50 text-primary-700 border border-primary-200
      ${sizes[size]}
    `}>
      <LockClosedIcon className={`${iconSizes[size]} mr-1.5 animate-pulse`} />
      Reserved · {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  )
}

interface AvailabilityIndicatorProps {
  level: 'high' | 'medium' | 'low' | 'full'
  size?: 'sm' | 'md'
  showIcon?: boolean
  showDisclaimer?: boolean // FIXED: Add disclaimer option
}

export function AvailabilityIndicator({ 
  level, 
  size = 'md',
  showIcon = true,
  showDisclaimer = false
}: AvailabilityIndicatorProps) {
  const config = {
    high: {
      label: 'Many Slots Available',
      icon: CheckCircleIcon,
      colors: 'bg-green-50 text-green-700 border-green-200',
      pulse: false
    },
    medium: {
      label: 'Some Slots Available',
      icon: ExclamationTriangleIcon,
      colors: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      pulse: false
    },
    low: {
      label: 'Few Slots Remaining',
      icon: ExclamationTriangleIcon,
      colors: 'bg-orange-50 text-orange-700 border-orange-200',
      pulse: true
    },
    full: {
      label: 'Currently Full',
      icon: XCircleIcon,
      colors: 'bg-gray-100 text-gray-600 border-gray-200',
      pulse: false
    }
  }

  const { label, icon: Icon, colors, pulse } = config[level]

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4'
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span className={`
        inline-flex items-center font-medium rounded-lg border
        ${colors} ${sizes[size]} ${pulse ? 'animate-pulse' : ''}
      `}>
        {showIcon && <Icon className={`${iconSizes[size]} mr-1.5`} />}
        {label}
      </span>
      {/* FIXED: Clear disclaimer about informational nature */}
      {showDisclaimer && (
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <InformationCircleIcon className="h-3 w-3" />
          Shown for reference only - verify during booking
        </span>
      )}
    </div>
  )
}

interface QuickBookBadgeProps {
  size?: 'sm' | 'md'
}

export function QuickBookBadge({ size = 'md' }: QuickBookBadgeProps) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4'
  }

  return (
    <span className={`
      inline-flex items-center font-medium rounded-lg
      bg-purple-50 text-purple-700 border border-purple-200
      ${sizes[size]}
    `}>
      <BoltIcon className={`${iconSizes[size]} mr-1`} />
      Instant Booking
    </span>
  )
}

interface CapacityProgressBarProps {
  available: number
  total: number
  showLabel?: boolean
  height?: 'sm' | 'md' | 'lg'
  showDisclaimer?: boolean // FIXED: Add disclaimer option
}

export function CapacityProgressBar({ 
  available, 
  total, 
  showLabel = true,
  height = 'md',
  showDisclaimer = false
}: CapacityProgressBarProps) {
  const percentage = (available / total) * 100
  
  const getColor = () => {
    if (percentage === 0) return 'bg-gray-400'
    if (percentage <= 25) return 'bg-orange-500'
    if (percentage <= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs text-gray-600">
          <span>Availability</span>
          <span className="font-medium">{available} / {total} available</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heights[height]} overflow-hidden`}>
        <div
          className={`${heights[height]} rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* FIXED: Disclaimer for progress bar */}
      {showDisclaimer && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <InformationCircleIcon className="h-3 w-3" />
          Real-time availability confirmed during checkout
        </p>
      )}
    </div>
  )
}

interface TimerBadgeProps {
  timeRemaining: number
  size?: 'sm' | 'md' | 'lg'
}

export function TimerBadge({ timeRemaining, size = 'md' }: TimerBadgeProps) {
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  const getColors = () => {
    if (timeRemaining <= 60) return 'bg-red-100 text-red-800 border-red-300 animate-pulse'
    if (timeRemaining <= 180) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-green-100 text-green-800 border-green-300'
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <span className={`
      inline-flex items-center font-mono font-bold rounded-lg border
      ${getColors()} ${sizes[size]}
    `}>
      <ClockIcon className={`${iconSizes[size]} mr-1.5`} />
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  )
}