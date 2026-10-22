import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute'
import AuthProvider from './context/AuthProvider'
import ToastProvider from './context/ToastProvider'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import InterviewCheck from './pages/InterviewCheck'
import InterviewRoom from './pages/InterviewRoom'
import InterviewSetup from './pages/InterviewSetup'
import Landing from './pages/Landing'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Performance from './pages/Performance'
import Practice from './pages/Practice'
import Profile from './pages/Profile'
import QuestionBank from './pages/QuestionBank'
import Register from './pages/Register'
import Results from './pages/Results'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />

            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/interview/new" element={<InterviewSetup />} />
                <Route path="/practice" element={<Practice />} />
                <Route path="/history" element={<History />} />
                <Route path="/results/:id" element={<Results />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/questions" element={<QuestionBank />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
              {/* full-screen interview pages (no sidebar) */}
              <Route path="/interview/:id/check" element={<InterviewCheck />} />
              <Route path="/interview/:id/room" element={<InterviewRoom />} />
            </Route>

            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
