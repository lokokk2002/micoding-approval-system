'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { STATUS_LABELS, STATUS_COLORS, getLocationLabel, getBrandLabel } from '@/lib/constants'
import type { Request } from '@/types/database'

type ViewTab = 'active' | 'closed'

const TYPE_LABELS: Record<string, string> = {
  expense_report: '費用報銷',
  cash_advance: '現金墊款',
  over_budget: '預算外支出',
  purchase_general: '一般採購',
  purchase_equipment: '設備採購',
  recruitment: '招募需求',
  promotion: '升職/調薪',
  resignation: '離職申請',
  equipment_repair: '設備維修',
  supply_restock: '耗材補貨',
  complaint_auth: '客訴處理授權',
  event_proposal: '活動/促銷方案',
  ad_budget: '廣告預算',
  kol_collaboration: 'KOL/外部合作',
  content_approval: '素材上架授權',
}

// Stepper stages definition
const STAGES = [
  { key: 'apply', label: '申請' },
  { key: 'level1', label: '第1層審批' },
  { key: 'level2', label: '第2層審批' },
  { key: 'level3', label: '第3層審批' },
  { key: 'execute', label: '執行' },
  { key: 'done', label: '完成' },
  { key: 'closed', label: '結案' },
]

function getStepStates(status: string, currentLevel: number) {
  const isRejected = status === 'rejected'
  const isWithdrawn = status === 'withdrawn'
  const isStopped = isRejected || isWithdrawn

  let activeIndex = 0
  if (status === 'pending') {
    activeIndex = currentLevel // level 1 = index 1
  } else if (isRejected || isWithdrawn) {
    activeIndex = currentLevel > 0 ? currentLevel : 0
  } else if (status === 'approved') {
    activeIndex = 4 // execute
  } else if (status === 'executing' || status === 'in_progress') {
    activeIndex = 4
  } else if (status === 'completed') {
    activeIndex = 5
  } else if (status === 'closed') {
    activeIndex = 6
  }

  return STAGES.map((_, i) => {
    if (isStopped) {
      if (i < activeIndex) return 'completed'
      if (i === activeIndex) return 'stopped'
      return 'future'
    }
    if (status === 'closed') {
      return 'completed'
    }
    if (i < activeIndex) return 'completed'
    if (i === activeIndex) return 'current'
    return 'future'
  })
}

function ProgressStepper({ status, currentLevel }: { status: string; currentLevel: number }) {
  const states = getStepStates(status, currentLevel)

  return (
    <div className="w-full mt-4">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const state = states[i]
          let dotColor = 'bg-gray-300'
          let textColor = 'text-gray-400'
          let ringClass = ''

          if (state === 'completed') {
            dotColor = 'bg-green-500'
            textColor = 'text-green-700'
          } else if (state === 'current') {
            dotColor = 'bg-blue-500'
            textColor = 'text-blue-700'
            ringClass = 'ring-4 ring-blue-200'
          } else if (state === 'stopped') {
            dotColor = 'bg-red-500'
            textColor = 'text-red-700'
            ringClass = 'ring-4 ring-red-200'
          }

          const prevLineColor = i > 0 && (states[i - 1] === 'completed') ? 'bg-green-400' : 'bg-gray-200'

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              {i > 0 && (
                <div className={`h-1 flex-1 rounded-full ${prevLineColor}`} />
              )}
              <div className="flex flex-col items-center relative">
                <div className={`w-4 h-4 rounded-full ${dotColor} ${ringClass} flex items-center justify-center flex-shrink-0`}>
                  {state === 'completed' && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {state === 'stopped' && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className={`text-[10px] mt-1 whitespace-nowrap absolute top-5 ${textColor} font-medium`}>
                  {stage.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getFormDataSummary(type: string, formData: Record<string, unknown>): string | null {
  if (!formData) return null
  switch (type) {
    case 'expense_report':
    case 'cash_advance':
    case 'over_budget':
    case 'ad_budget': {
      const amount = formData.amount || formData.total_amount || formData.budget_amount
      if (amount) return `金額：NT$ ${Number(amount).toLocaleString()}`
      return null
    }
    case 'purchase_general':
    case 'purchase_equipment': {
      const amount = formData.amount || formData.total_amount || formData.estimated_cost
      const item = formData.item_name || formData.product_name
      const parts: string[] = []
      if (item) parts.push(String(item))
      if (amount) parts.push(`NT$ ${Number(amount).toLocaleString()}`)
      return parts.length > 0 ? parts.join(' / ') : null
    }
    case 'recruitment': {
      const position = formData.position || formData.job_title
      const count = formData.headcount || formData.count
      const parts: string[] = []
      if (position) parts.push(String(position))
      if (count) parts.push(`${count} 人`)
      return parts.length > 0 ? parts.join(' / ') : null
    }
    case 'promotion': {
      const name = formData.employee_name || formData.target_name
      const newTitle = formData.new_title || formData.new_position
      const parts: string[] = []
      if (name) parts.push(String(name))
      if (newTitle) parts.push(String(newTitle))
      return parts.length > 0 ? parts.join(' → ') : null
    }
    case 'resignation': {
      const name = formData.employee_name || formData.target_name
      const lastDay = formData.last_day || formData.last_working_day
      const parts: string[] = []
      if (name) parts.push(String(name))
      if (lastDay) parts.push(`最後上班日：${String(lastDay)}`)
      return parts.length > 0 ? parts.join(' / ') : null
    }
    case 'equipment_repair': {
      const equip = formData.equipment_name || formData.item
      const issue = formData.issue || formData.description
      const parts: string[] = []
      if (equip) parts.push(String(equip))
      if (issue) parts.push(String(issue).slice(0, 30))
      return parts.length > 0 ? parts.join(' - ') : null
    }
    case 'kol_collaboration': {
      const kolName = formData.kol_name || formData.partner_name
      const amount = formData.amount || formData.budget
      const parts: string[] = []
      if (kolName) parts.push(String(kolName))
      if (amount) parts.push(`NT$ ${Number(amount).toLocaleString()}`)
      return parts.length > 0 ? parts.join(' / ') : null
    }
    default: {
      const desc = formData.description || formData.reason || formData.note
      if (desc) return String(desc).slice(0, 50)
      return null
    }
  }
}

// Statuses considered "active" (not yet finished)
const ACTIVE_STATUSES = new Set(['pending', 'approved', 'executing', 'in_progress', 'completed'])
const CLOSED_STATUSES = new Set(['closed', 'rejected', 'withdrawn'])

export default function MyRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewTab, setViewTab] = useState<ViewTab>('active')

  useEffect(() => {
    if (user) fetchMyRequests()
  }, [user])

  const fetchMyRequests = async () => {
    try {
      const res = await fetch(`/api/requests?phone=${user!.phone}`)
      const data = await res.json()
      setRequests(data.requests || [])
    } catch {
      console.error('Failed to fetch requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdraw = async (requestId: string) => {
    if (!user) return
    try {
      await fetch(`/api/requests/${requestId}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: user.name }),
      })
      fetchMyRequests()
    } catch {
      console.error('Failed to withdraw')
    }
  }

  const filteredRequests = requests.filter((r) => {
    if (viewTab === 'active') return ACTIVE_STATUSES.has(r.status)
    return CLOSED_STATUSES.has(r.status)
  })

  const activeCount = requests.filter((r) => ACTIVE_STATUSES.has(r.status)).length
  const closedCount = requests.filter((r) => CLOSED_STATUSES.has(r.status)).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的申請</h1>

      {/* View tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setViewTab('active')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          進行中 {activeCount > 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{activeCount}</span>}
        </button>
        <button
          onClick={() => setViewTab('closed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewTab === 'closed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          已結束 {closedCount > 0 && <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{closedCount}</span>}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-500">載入中...</span>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-300 text-5xl mb-4">{viewTab === 'active' ? '📋' : '📁'}</div>
          <p className="text-gray-500 text-lg">
            {viewTab === 'active' ? '目前沒有進行中的申請' : '沒有已結束的申請'}
          </p>
          {viewTab === 'active' && (
            <p className="text-gray-400 text-sm mt-1">提交新的申請後會在這裡顯示</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRequests.map((req) => {
            const typeLabel = TYPE_LABELS[req.type] || req.type
            const brandLabel = getBrandLabel(req.brand)
            const summary = getFormDataSummary(req.type, req.form_data)

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
              >
                {/* Top color bar based on status */}
                <div className={`h-1.5 ${
                  req.status === 'closed' ? 'bg-emerald-500' :
                  req.status === 'completed' ? 'bg-gray-400' :
                  req.status === 'rejected' ? 'bg-red-500' :
                  req.status === 'withdrawn' ? 'bg-orange-400' :
                  req.status === 'approved' ? 'bg-green-500' :
                  req.status === 'executing' || req.status === 'in_progress' ? 'bg-blue-500' :
                  'bg-yellow-400'
                }`} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
                          {typeLabel}
                        </span>
                        <span className="font-mono text-sm text-gray-500 font-medium">
                          {req.request_number}
                        </span>
                        {req.is_urgent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-200">
                            急件
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <span>{brandLabel}</span>
                        <span className="text-gray-300">|</span>
                        <span>{getLocationLabel(req.location)}</span>
                      </div>

                      {summary && (
                        <div className="mt-2 text-sm text-gray-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                          {summary}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${STATUS_COLORS[req.status] || ''}`}>
                        {STATUS_LABELS[req.status] || req.status}
                      </span>
                      <div className="flex gap-2">
                        {req.status === 'pending' && (
                          <button
                            onClick={() => handleWithdraw(req.id)}
                            className="text-sm text-orange-600 hover:text-orange-800 font-medium px-2 py-1 rounded hover:bg-orange-50 transition-colors"
                          >
                            撤回
                          </button>
                        )}
                        {req.pdf_url && (
                          <a
                            href={req.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            下載 PDF
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress stepper */}
                  <div className="pb-5">
                    <ProgressStepper status={req.status} currentLevel={req.current_level} />
                  </div>

                  {/* Date info row */}
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-100 text-xs text-gray-400 flex-wrap">
                    <div>
                      <span className="text-gray-500 font-medium">申請時間：</span>
                      {new Date(req.created_at).toLocaleString('zh-TW', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    <div>
                      <span className="text-gray-500 font-medium">最後更新：</span>
                      {new Date(req.updated_at).toLocaleString('zh-TW', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    {req.completed_at && (
                      <div>
                        <span className="text-gray-500 font-medium">完成時間：</span>
                        {new Date(req.completed_at).toLocaleString('zh-TW', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    )}
                    {req.closed_at && (
                      <div>
                        <span className="text-gray-500 font-medium">結案時間：</span>
                        {new Date(req.closed_at).toLocaleString('zh-TW', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
