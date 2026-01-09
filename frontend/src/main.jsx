import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './index.css'
import SignIn from './SignIn.jsx'
import SignUp from './SignUp.jsx'
import Home from './Home.jsx'
import DoctorFinder from './DoctorFinder.jsx'
import MyAppointments from './MyAppointments.jsx'
import DoctorSignIn from './DoctorSignIn.jsx'
import DoctorDashboard from './DoctorDashboard.jsx'
import DoctorDayAppointments from './DoctorDayAppointments.jsx'
import MyPrescriptions from './MyPrescriptions.jsx'
import BookAppointment from './BookAppointment.jsx'

// Check if patient token is valid (not expired)
function isTokenValid() {
  const token = localStorage.getItem('token')
  if (!token) return false

  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired, clear storage
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      return false
    }
    return true
  } catch {
    return false
  }
}

// Check if doctor token is valid (not expired)
function isDoctorTokenValid() {
  const token = localStorage.getItem('doctorToken')
  if (!token) return false

  try {
    // Decode JWT payload (base64)
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired, clear storage
      localStorage.removeItem('doctorToken')
      localStorage.removeItem('doctor')
      return false
    }
    // Verify it's a doctor token
    if (!payload.doctor_id) return false
    return true
  } catch {
    return false
  }
}

// Protected route wrapper - checks patient token validity
function ProtectedRoute({ children }) {
  if (!isTokenValid()) {
    return <Navigate to="/signin" replace />
  }
  return children
}

// Protected route wrapper - checks doctor token validity
function DoctorProtectedRoute({ children }) {
  if (!isDoctorTokenValid()) {
    return <Navigate to="/doctor/signin" replace />
  }
  return children
}

// Auth route wrapper - redirects to home if already logged in (patients)
function AuthRoute({ children }) {
  if (isTokenValid()) {
    return <Navigate to="/home" replace />
  }
  return children
}

// Doctor auth route wrapper - redirects to dashboard if already logged in
function DoctorAuthRoute({ children }) {
  if (isDoctorTokenValid()) {
    return <Navigate to="/doctor/dashboard" replace />
  }
  return children
}

// Root redirect based on auth status
function RootRedirect() {
  if (isTokenValid()) {
    return <Navigate to="/home" replace />
  }
  return <Navigate to="/signin" replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/signin"
          element={
            <AuthRoute>
              <SignIn />
            </AuthRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <AuthRoute>
              <SignUp />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <SignUp />
            </AuthRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/find-doctor"
          element={
            <ProtectedRoute>
              <DoctorFinder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-appointment"
          element={
            <ProtectedRoute>
              <BookAppointment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <MyAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prescriptions"
          element={
            <ProtectedRoute>
              <MyPrescriptions />
            </ProtectedRoute>
          }
        />
        {/* Doctor Routes */}
        <Route
          path="/doctor/signin"
          element={
            <DoctorAuthRoute>
              <DoctorSignIn />
            </DoctorAuthRoute>
          }
        />
        <Route
          path="/doctor/dashboard"
          element={
            <DoctorProtectedRoute>
              <DoctorDashboard />
            </DoctorProtectedRoute>
          }
        />
        <Route
          path="/doctor/day/:day"
          element={
            <DoctorProtectedRoute>
              <DoctorDayAppointments />
            </DoctorProtectedRoute>
          }
        />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

