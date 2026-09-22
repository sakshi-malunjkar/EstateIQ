import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import Analytics from '@/pages/Analytics'
import Analyze from '@/pages/Analyze'
import Dashboard from '@/pages/Dashboard'
import LeadDetail from '@/pages/LeadDetail'
import Login from '@/pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
