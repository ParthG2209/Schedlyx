// src/App.tsx
// FIXED: Removed duplicate /book/:eventId routes
// FIXED: Added feature flag gating for booking routes
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EmailVerificationGuard } from './components/EmailVerificationGuard'
import { BookingErrorBoundary } from './components/booking/BookingErrorBoundary'
import { featureFlags } from './lib/featureFlags'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { EmailVerification } from './pages/EmailVerification'
import { AuthCallback } from './pages/AuthCallback'
import { Dashboard } from './pages/Dashboard'
import { CreateEvent } from './pages/CreateEvent'
import { PublicEventPage } from './pages/PublicEventPage'
import { AdminEventManager } from './pages/AdminEventManager'
import { EventsList } from './pages/EventsList'
import { UpdatedBookingFlowPage } from './pages/UpdatedBookingFlow'
import { BookingPage } from './pages/BookingPage'

function App() {
  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/event/:eventId" element={<PublicEventPage />} />
        <Route path="/events" element={<EventsList />} />
        
        {/* FIXED: Feature-flagged booking route - only ONE route registered */}
        {featureFlags.ENABLE_NEW_BOOKING_FLOW ? (
          <Route 
            path="/book/:eventId" 
            element={
              <BookingErrorBoundary>
                <UpdatedBookingFlowPage />
              </BookingErrorBoundary>
            } 
          />
        ) : (
          <Route 
            path="/book/:eventId" 
            element={<BookingPage />} 
          />
        )}
        
        {/* Email Verification Route */}
        <Route 
          path="/verify-email" 
          element={
            <EmailVerificationGuard>
              <EmailVerification />
            </EmailVerificationGuard>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-event" 
          element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/events" 
          element={
            <ProtectedRoute>
              <AdminEventManager />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Layout>
  )
}

export default App