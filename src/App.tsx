// src/App.tsx
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EmailVerificationGuard } from './components/EmailVerificationGuard'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { EmailVerification } from './pages/EmailVerification'
import { AuthCallback } from './pages/AuthCallback'
import { Dashboard } from './pages/Dashboard'
import { CreateEvent } from './pages/CreateEvent'
import { PublicEventPage } from './pages/PublicEventPage'
import { BookingFlowPage } from './pages/BookingFlowPage'
import { AdminEventManager } from './pages/AdminEventManager'
import { AdminSlotManagement } from './pages/AdminSlotManagement'
import { EventsList } from './pages/EventsList'

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
        <Route path="/book/:eventId" element={<BookingFlowPage />} />
        <Route path="/events" element={<EventsList />} />
        
        {/* Email Verification Route - needs guard to prevent direct access */}
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
        <Route 
          path="/admin/events/:eventId/slots" 
          element={
            <ProtectedRoute>
              <AdminSlotManagement />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Layout>
  )
}

export default App