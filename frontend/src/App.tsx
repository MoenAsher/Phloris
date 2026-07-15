import { Routes, Route, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Campaigns } from '@/pages/Campaigns'
import { CampaignDetail } from '@/pages/CampaignDetail'
import { Templates } from '@/pages/Templates'
import { Targets } from '@/pages/Targets'
import { Feedback } from '@/pages/Feedback'
import { Performance } from '@/pages/Performance'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/feedback/:token" element={<Feedback />} />
      <Route path="/performance/:token" element={<Performance />} />

      {/* Protected admin routes, rendered inside the sidebar shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/targets" element={<Targets />} />
        </Route>
      </Route>

      {/* Unknown paths fall back to the dashboard (which redirects to /login
          when unauthenticated). */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
