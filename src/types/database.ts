export type UserRole = 'user' | 'reviewer' | 'admin'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'in_progress' | 'completed' | 'closed' | 'withdrawn' | 'deleted'
export type HistoryAction = 'approved' | 'rejected' | 'withdrawn' | 'admin_deleted' | 'executing' | 'in_progress' | 'completed' | 'closed'
export type Brand = 'double_fitness' | 'rechill'
export type RequestCategory = 'finance' | 'procurement' | 'hr' | 'operations' | 'marketing'
export type RequestType =
  | 'expense_report' | 'cash_advance' | 'over_budget'
  | 'purchase_general' | 'purchase_equipment'
  | 'recruitment' | 'promotion' | 'resignation'
  | 'equipment_repair' | 'supply_restock' | 'complaint_auth' | 'event_proposal'
  | 'ad_budget' | 'kol_collaboration' | 'content_approval'

export interface User {
  id: string
  phone: string
  name: string
  email: string | null
  role: UserRole
  brand: string | null
  location: string | null
  slack_id: string | null
  is_active: boolean
  created_at: string
}

export interface Request {
  id: string
  request_number: string
  category: RequestCategory
  type: RequestType
  brand: Brand
  location: string
  applicant_name: string
  applicant_phone: string
  applicant_email: string
  form_data: Record<string, unknown>
  attachments: Array<{ url: string; filename: string; type: string }>
  is_urgent: boolean
  current_level: number
  status: RequestStatus
  assignee_name: string | null
  assignee_phone: string | null
  assignee_slack_id: string | null
  execution_deadline: string | null
  deleted_at: string | null
  completed_at: string | null
  closed_at: string | null
  pdf_url: string | null
  created_at: string
  updated_at: string
}

export interface History {
  id: string
  request_id: string
  level: number
  actor_name: string
  actor_role: string | null
  action: HistoryAction
  comment: string | null
  created_at: string
}

export interface Routing {
  id: string
  brand: string
  location: string
  category: string
  level: number
  reviewer_name: string | null
  reviewer_phone: string | null
  reviewer_slack_id: string | null
}

export interface PostApproval {
  id: string
  brand: string
  location: string
  category: string
  tracker_name: string | null
  tracker_phone: string | null
  tracker_slack_id: string | null
  closer_name: string | null
  closer_phone: string | null
  closer_slack_id: string | null
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {}
