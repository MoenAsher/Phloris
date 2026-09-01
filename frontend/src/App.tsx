import { Routes, Route } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Campaigns } from '@/pages/Campaigns'
import { CampaignDetail } from '@/pages/CampaignDetail'
import { Templates } from '@/pages/Templates'
import { Targets } from '@/pages/Targets'
import { SendingProfiles } from '@/pages/SendingProfiles'
import { TargetHistory } from '@/pages/TargetHistory'
import { Feedback } from '@/pages/Feedback'
import { Performance } from '@/pages/Performance'
import { Learn } from '@/pages/Learn'
import { LearnSubpage } from '@/pages/LearnSubpage'
import { NotFound } from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/feedback/:token" element={<Feedback />} />
      <Route path="/performance/:token" element={<Performance />} />
      <Route path="/learn" element={<Learn />} />
      <Route path="/learn/:slug" element={<LearnSubpage />} />

      {/* Protected admin routes, rendered inside the sidebar shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/targets" element={<Targets />} />
          <Route path="/targets/:targetId/history" element={<TargetHistory />} />
          <Route path="/sending-profiles" element={<SendingProfiles />} />
        </Route>
      </Route>

      {/* Unknown paths show a not-found state (accessible with or without a
          session) rather than silently redirecting. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
