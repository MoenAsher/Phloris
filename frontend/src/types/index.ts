/** TypeScript interfaces mirroring the backend API responses (see CLAUDE.md
 *  Sections 6 & 7). All admin API responses are wrapped in `{ "data": ... }`. */

export type Difficulty = 'easy' | 'medium' | 'hard'
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed'
export type EventType = 'sent' | 'opened' | 'clicked' | 'reported'

/** Standard success envelope used by the backend. */
export interface ApiEnvelope<T> {
  data: T
}

export interface User {
  id: number
  email: string
  created_at: string
}

export interface LoginResponse {
  user: User
  access_token: string
}

export interface Template {
  id: number
  name: string
  subject: string
  body_html: string
  difficulty_level: Difficulty
  feedback_notes: string | null
  created_at: string
}

export interface Target {
  id: number
  email: string
  first_name: string | null
  last_name: string | null
  target_group_id: number
  created_at: string
}

export interface TargetGroup {
  id: number
  name: string
  description: string | null
  target_count: number
  created_at: string
  targets?: Target[]
}

/** A row rejected during CSV import, with the reason. */
export interface ImportRejection {
  email: string
  reason: string
}

/** POST /api/target-groups/:id/targets/import response. */
export interface ImportResult {
  imported: number
  skipped: number
  rejected: ImportRejection[]
  targets: Target[]
}

export interface Campaign {
  id: number
  name: string
  template_id: number
  target_group_id: number
  status: CampaignStatus
  scheduled_at: string | null
  launched_at: string | null
  completed_at: string | null
  created_at: string
}

export interface Event {
  id: number
  campaign_id: number
  target_id: number
  event_type: EventType
  timestamp: string
  created_at: string
}

export type TargetOutcome = 'clicked' | 'reported' | 'no_action' | 'not_sent'

/** One row of GET /api/dashboard/campaigns/:id/targets */
export interface CampaignTargetResult {
  target_id: number
  email: string
  first_name: string | null
  last_name: string | null
  sent: boolean
  clicked: boolean
  reported: boolean
  outcome: TargetOutcome
  time_to_click_seconds: number | null
  time_to_report_seconds: number | null
}

/** POST /api/campaigns/:id/launch response. */
export interface LaunchResult {
  campaign: Campaign
  sent_count: number
  total_targets: number
  failed: { target_id: number; email: string; error: string }[]
}

/** GET /api/dashboard/campaigns/:id/metrics */
export interface CampaignMetrics {
  campaign_id: number
  sent_count: number
  clicked_count: number
  reported_count: number
  no_action_count: number
  click_rate: number
  report_rate: number
  avg_time_to_click_seconds: number | null
  avg_time_to_report_seconds: number | null
}

/** One point in GET /api/dashboard/campaigns/:id/timeline */
export interface TimelinePoint {
  timestamp: string
  event_type: 'clicked' | 'reported'
  cumulative_clicks: number
  cumulative_reports: number
}

/** GET /api/dashboard/campaigns/:id/timeline */
export interface CampaignTimeline {
  campaign_id: number
  launched_at: string | null
  points: TimelinePoint[]
}

/** GET /api/feedback/:token — public educational content for a token. */
export interface FeedbackInfo {
  campaign_name: string | null
  template_name: string | null
  difficulty_level: Difficulty | null
  feedback_notes: string | null
}

export type PerformanceOutcome = 'clicked' | 'reported' | 'ignored'

/** One campaign entry in GET /api/performance/:token */
export interface PerformanceCampaign {
  campaign_id: number
  campaign_name: string | null
  clicked: boolean
  reported: boolean
  outcome: PerformanceOutcome
  time_to_click_seconds: number | null
  time_to_report_seconds: number | null
}

/** GET /api/performance/:token — the recipient's own history only. */
export interface PerformanceResponse {
  first_name: string | null
  campaigns: PerformanceCampaign[]
}

/** GET /api/dashboard/overview */
export interface DashboardOverview {
  total_campaigns: number
  total_targets: number
  emails_sent: number
  overall_click_rate: number
  overall_report_rate: number
}
