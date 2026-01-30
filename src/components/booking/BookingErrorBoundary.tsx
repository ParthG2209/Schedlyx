// src/components/booking/BookingErrorBoundary.tsx
// Error boundary specifically for booking flow with helpful recovery actions

import { Component, ReactNode } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: any
  errorCount: number
}

export class BookingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Booking Error Boundary caught an error:', error, errorInfo)
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }))

    // Log to error tracking service if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorCount } = this.state
      const isRecurring = errorCount > 2

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 overflow-hidden">
              {/* Header */}
              <div className="bg-red-50 px-6 py-4 border-b-2 border-red-200">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <h1 className="text-xl font-bold text-red-900">
                      {isRecurring ? 'Persistent Error Detected' : 'Something Went Wrong'}
                    </h1>
                    <p className="text-sm text-red-700 mt-1">
                      {isRecurring 
                        ? 'The booking system encountered a recurring issue'
                        : 'An unexpected error occurred during the booking process'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Error Message */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Error Details
                  </h3>
                  <p className="text-sm text-gray-700 font-mono bg-white p-3 rounded border border-gray-200">
                    {error?.message || 'Unknown error occurred'}
                  </p>
                  {isRecurring && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ This error has occurred {errorCount} times
                    </p>
                  )}
                </div>

                {/* What Happened */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    💡 What Happened?
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• The booking interface encountered an unexpected problem</li>
                    <li>• Your booking data has been preserved if possible</li>
                    <li>• No charges have been made</li>
                  </ul>
                </div>

                {/* What to Try */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-3">
                    🔧 What Can You Try?
                  </h3>
                  <div className="space-y-3">
                    {!isRecurring && (
                      <button
                        onClick={this.handleReset}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
                      >
                        <div className="flex items-center">
                          <ArrowPathIcon className="h-5 w-5 text-yellow-700 mr-3" />
                          <div className="text-left">
                            <p className="font-semibold text-yellow-900 text-sm">Try Again</p>
                            <p className="text-xs text-yellow-700">Retry the booking process</p>
                          </div>
                        </div>
                        <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={this.handleReload}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-yellow-700 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <div className="text-left">
                          <p className="font-semibold text-yellow-900 text-sm">Reload Page</p>
                          <p className="text-xs text-yellow-700">Start fresh with a clean slate</p>
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <button
                      onClick={this.handleGoHome}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-yellow-700 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <div className="text-left">
                          <p className="font-semibold text-yellow-900 text-sm">Return Home</p>
                          <p className="text-xs text-yellow-700">Go back to the main page</p>
                        </div>
                      </div>
                      <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Contact Support */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-purple-900 mb-2">
                    📞 Need Help?
                  </h3>
                  <p className="text-sm text-purple-800 mb-3">
                    If this problem persists, please contact our support team with the error details above.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href="/support"
                      className="flex-1 text-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Contact Support
                    </a>
                    <a
                      href="/help"
                      className="flex-1 text-center px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
                    >
                      Help Center
                    </a>
                  </div>
                </div>

                {/* Technical Details (Collapsible) */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <summary className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-gray-700">
                      🔍 Technical Details (Development Only)
                    </summary>
                    <div className="mt-3 space-y-2">
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Stack Trace:</p>
                        <pre className="text-xs text-gray-600 overflow-auto max-h-40 font-mono">
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </div>
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Error Count:</p>
                        <p className="text-xs text-gray-600">{errorCount} occurrence(s)</p>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

declare global {
  interface Window {
    Sentry?: any
  }
}