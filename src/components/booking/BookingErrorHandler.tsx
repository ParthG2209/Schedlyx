// src/components/booking/BookingErrorHandler.tsx
// UI-ONLY VERSION - No error type mapping, no backend assumptions
// Just displays error messages passed from booking service

import { ExclamationTriangleIcon, ClockIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface BookingErrorHandlerProps {
  error: string
  variant?: 'warning' | 'error' | 'info'
  onRetry?: () => void
  onReset?: () => void
  onDismiss?: () => void
  showIcon?: boolean
}

export function BookingErrorHandler({ 
  error, 
  variant = 'error',
  onRetry, 
  onReset,
  onDismiss,
  showIcon = true
}: BookingErrorHandlerProps) {
  
  const getVariantConfig = () => {
    switch (variant) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'bg-yellow-600 hover:bg-yellow-700',
          Icon: ExclamationTriangleIcon
        }
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700',
          Icon: ClockIcon
        }
      case 'error':
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700',
          Icon: XCircleIcon
        }
    }
  }

  const config = getVariantConfig()
  const Icon = config.Icon

  return (
    <div className={`${config.bg} border-2 ${config.border} rounded-lg p-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start gap-4">
        {showIcon && (
          <div className={`flex-shrink-0 ${config.icon}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${config.text} mb-2`}>
            {error}
          </p>
          
          <div className="flex gap-2 mt-4">
            {onReset && (
              <button
                onClick={onReset}
                className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg ${config.button} transition-colors`}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Start Over
              </button>
            )}
            
            {onRetry && (
              <button
                onClick={onRetry}
                className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg ${config.button} transition-colors`}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Try Again
              </button>
            )}
            
            {onDismiss && !onReset && !onRetry && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        
        {onDismiss && (onReset || onRetry) && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${config.text} hover:opacity-75 transition-opacity`}
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}