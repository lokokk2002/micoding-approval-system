'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { STATUS_LABELS, STATUS_COLORS, getLocationLabel, getBrandLabel } from '@/lib/constants'
import type { Request } from '@/types/database'

type TabType = 'pending' | 'tracking' | 'closing' | 'history'

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

const FIELD_LABELS: Record<string, string> = {
  expense_category: '費用類別', amount: '金額', expense_date: '發生日期', vendor: '廠商',
  reason: '申請事由', purpose: '用途說明', expected_date: '預計使用日期',
  original_item: '原預算項目', over_amount: '超支金額', over_reason: '超支原因',
  item_name: '品項名稱', quantity: '數量', unit_price: '預估單價', total_price: '預估總額',
  needed_by: '需求日期', equipment_name: '設備名稱', spec_model: '規格型號',
  estimated_amount: '預估金額', vendor_suggestion: '廠商建議',
  position: '職位名稱', headcount: '需求人數', job_description: '工作內容摘要',
  expected_onboard: '期望到職日', employee_name: '被提報人',
  current_position: '現職', current_salary: '現薪', proposed_position: '建議新職',
  proposed_salary: '建議新薪', recommendation: '推薦理由',
  last_work_date: '預計最後工作日', handover_note: '交接事項',
  fault_description: '故障描述', urgency: '急迫程度', items: '品項清單',
  customer_name: '客戶姓名/會員編號', complaint_content: '客訴內容',
  proposed_solution: '建議處理方式', compensation_amount: '涉及金額',
  event_name: '活動名稱', date_range: '起迄日期', event_description: '活動內容',
  estimated_cost: '預估費用', platform: '投放平台', ad_period: '投放期間',
  budget_amount: '預算金額', objective: '投放目標',
  partner_name: '合作對象', collaboration_content: '合作內容', fee: '費用',
  contract_period: '合約期間', content_type: '內容類型', publish_platform: '發布平台',
  publish_date: '預計發布日', content_summary: '內容摘要',
}

const MONEY_FIELDS = new Set([
  'amount', 'over_amount', 'unit_price', 'total_price', 'estimated_amount',
  'current_salary', 'proposed_salary', 'compensation_amount', 'estimated_cost',
  'budget_amount', 'fee',
])

function formatMoney(value: unknown): string {
  const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : NaN
  if (isNaN(num)) return String(value)
  return `NT$ ${num.toLocaleString('zh-TW')}`
}

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '--'
  if (MONEY_FIELDS.has(key)) return formatMoney(value)
  if (key === 'items' && Array.isArray(value)) {
    return value.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        return `${i + 1}. ${obj.name || obj.item_name || '品項'} x${obj.quantity || '?'}`
      }
      return String(item)
    }).join('、')
  }
  return String(value)
}

function getKeyFields(type: string, formData: Record<string, unknown>): Array<[string, string]> {
  const priorityKeys: Record<string, string[]> = {
    expense_report: ['expense_category', 'amount', 'expense_date', 'vendor'],
    cash_advance: ['purpose', 'amount', 'expected_date'],
    over_budget: ['original_item', 'over_amount', 'over_reason'],
    purchase_general: ['item_name', 'quantity', 'unit_price', 'total_price'],
    purchase_equipment: ['equipment_name', 'spec_model', 'estimated_amount', 'needed_by'],
    recruitment: ['position', 'headcount', 'expected_onboard'],
    promotion: ['employee_name', 'current_position', 'proposed_position'],
    resignation: ['employee_name', 'last_work_date', 'handover_note'],
    equipment_repair: ['equipment_name', 'fault_description', 'urgency'],
    supply_restock: ['items', 'needed_by'],
    complaint_auth: ['customer_name', 'complaint_content', 'compensation_amount'],
    event_proposal: ['event_name', 'date_range', 'estimated_cost'],
    ad_budget: ['platform', 'ad_period', 'budget_amount'],
    kol_collaboration: ['partner_name', 'collaboration_content', 'fee'],
    content_approval: ['content_type', 'publish_platform', 'publish_date'],
  }
  const keys = priorityKeys[type] || Object.keys(formData).slice(0, 4)
  return keys
    .filter((k) => formData[k] !== undefined && formData[k] !== null && formData[k] !== '')
    .map((k) => [k, String(formData[k] ?? '')] as [string, string])
}

export default function AdminPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchComment, setBatchComment] = useState('')
  const [showBatchBar, setShowBatchBar] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [inlineComments, setInlineComments] = useState<Record<string, string>>({})
  const [confirmReject, setConfirmReject] = useState<string | null>(null)
  const [returnTarget, setReturnTarget] = useState<string | null>(null)
  const [returnComment, setReturnComment] = useState('')
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const fetchRequests = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      let statusFilter = ''
      let reviewerParam = ''

      switch (activeTab) {
        case 'pending':
          statusFilter = 'pending,pending_revoke'
          reviewerParam = `&reviewer=${encodeURIComponent(user.name)}&role=${user.role}`
          break
        case 'tracking':
          statusFilter = 'approved,executing,in_progress'
          reviewerParam = `&tracker=${encodeURIComponent(user.name)}&role=${user.role}`
          break
        case 'closing':
          statusFilter = 'completed'
          reviewerParam = `&closer=${encodeURIComponent(user.name)}&role=${user.role}`
          break
        case 'history':
          statusFilter = 'approved,rejected,completed,closed'
          break
      }

      const res = await fetch(`/api/requests?status=${statusFilter}${reviewerParam}`)
      const data = await res.json()
      setRequests(data.requests || [])
    } catch {
      console.error('Failed to fetch requests')
    } finally {
      setIsLoading(false)
      setSelectedIds(new Set())
      setShowBatchBar(false)
    }
  }, [activeTab, user])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleApproval = async (requestId: string, action: string, comment: string) => {
    if (!user) return
    setProcessingIds((prev) => new Set(prev).add(requestId))
    try {
      await fetch(`/api/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment, actor_name: user.name, actor_role: user.role }),
      })
      fetchRequests()
    } catch {
      console.error('Failed to process')
    } finally {
      setProcessingIds((prev) => { const s = new Set(prev); s.delete(requestId); return s })
      setConfirmReject(null)
    }
  }

  const handleClose = async (requestId: string, comment: string) => {
    if (!user) return
    setProcessingIds((prev) => new Set(prev).add(requestId))
    try {
      await fetch(`/api/requests/${requestId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: user.name, actor_role: user.role, comment }),
      })
      fetchRequests()
    } catch {
      console.error('Failed to close')
    } finally {
      setProcessingIds((prev) => { const s = new Set(prev); s.delete(requestId); return s })
    }
  }

  const handleBatchAction = async (action: 'approved' | 'rejected') => {
    if (!user || selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setProcessingIds(new Set(ids))
    try {
      const res = await fetch('/api/requests/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids,
          action,
          comment: batchComment || null,
          actor_name: user.name,
          actor_role: user.role,
        }),
      })
      const data = await res.json()
      alert(`批次處理完成：${data.successCount}/${data.totalCount} 筆成功`)
      fetchRequests()
      setBatchComment('')
    } catch {
      console.error('Batch action failed')
    } finally {
      setProcessingIds(new Set())
    }
  }

  const handleReturn = async (requestId: string) => {
    if (!user) return
    const reason = returnComment.trim()
    if (!reason) {
      alert('退回原因為必填')
      return
    }
    setProcessingIds((prev) => new Set(prev).add(requestId))
    try {
      const res = await fetch(`/api/requests/${requestId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: reason, actor_name: user.name, actor_role: user.role }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '退回失敗')
        return
      }
      setReturnTarget(null)
      setReturnComment('')
      fetchRequests()
    } catch {
      console.error('Failed to return')
    } finally {
      setProcessingIds((prev) => { const s = new Set(prev); s.delete(requestId); return s })
    }
  }

  const handleUndoReject = async (requestId: string) => {
    if (!user) return
    setProcessingIds((prev) => new Set(prev).add(requestId))
    try {
      await fetch(`/api/requests/${requestId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: user.name, actor_role: user.role }),
      })
      fetchRequests()
    } catch {
      console.error('Failed to undo rejection')
    } finally {
      setProcessingIds((prev) => { const s = new Set(prev); s.delete(requestId); return s })
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(requests.map((r) => r.id)))
    }
  }

  const tabs = [
    { key: 'pending' as TabType, label: '待我審核' },
    { key: 'tracking' as TabType, label: '執行追蹤' },
    { key: 'closing' as TabType, label: '待結案' },
    { key: 'history' as TabType, label: '歷史紀錄' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">審批管理</h1>
        {activeTab === 'pending' && requests.length > 0 && (
          <button
            onClick={() => setShowBatchBar(!showBatchBar)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showBatchBar ? 'bg-gray-200 text-gray-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {showBatchBar ? '取消批次' : '批次審核'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setShowBatchBar(false) }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Batch action bar */}
      {showBatchBar && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-blue-900">
            已選 {selectedIds.size} 筆
          </span>
          <input
            type="text"
            value={batchComment}
            onChange={(e) => setBatchComment(e.target.value)}
            placeholder="批次備註（選填）"
            className="flex-1 min-w-[200px] px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => handleBatchAction('approved')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            批次核准
          </button>
          <button
            onClick={() => {
              if (confirm(`確定要批次駁回 ${selectedIds.size} 筆申請嗎？`)) {
                handleBatchAction('rejected')
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            批次駁回
          </button>
        </div>
      )}

      {/* Request List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-500">載入中...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg">
            {activeTab === 'pending' ? '目前沒有待您審核的申請' :
             activeTab === 'tracking' ? '目前沒有需要追蹤的申請' :
             activeTab === 'closing' ? '目前沒有待結案的申請' :
             '目前沒有歷史資料'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all header for batch mode */}
          {showBatchBar && (
            <div className="flex items-center gap-3 px-4 py-2">
              <input
                type="checkbox"
                checked={selectedIds.size === requests.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">全選 / 取消全選</span>
            </div>
          )}

          {requests.map((req) => {
            const formData = (req.form_data ?? {}) as Record<string, unknown>
            const keyFields = getKeyFields(req.type, formData)
            const isExpanded = expandedId === req.id
            const isProcessing = processingIds.has(req.id)

            return (
              <div
                key={req.id}
                className={`bg-white rounded-xl border transition-all duration-200 ${
                  req.is_urgent ? 'border-red-300 shadow-red-100' : 'border-gray-200'
                } ${isProcessing ? 'opacity-50 pointer-events-none' : ''} ${
                  selectedIds.has(req.id) ? 'ring-2 ring-blue-400' : ''
                } hover:shadow-md`}
              >
                {/* Top color bar */}
                {req.is_urgent && <div className="h-1 bg-red-500 rounded-t-xl" />}

                <div className="p-4">
                  {/* Main row */}
                  <div className="flex items-start gap-3">
                    {/* Checkbox for batch（撤銷審核單不參與批次） */}
                    {showBatchBar && activeTab === 'pending' && req.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(req.id)}
                        onChange={() => toggleSelect(req.id)}
                        className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Type + Number + Status */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
                          {TYPE_LABELS[req.type] || req.type}
                        </span>
                        <span className="font-mono text-xs text-gray-400">{req.request_number}</span>
                        {req.is_urgent && (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-200">
                            急件
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || ''}`}>
                          {STATUS_LABELS[req.status] || req.status}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          第 {req.current_level} 層 · {new Date(req.created_at).toLocaleDateString('zh-TW')}
                        </span>
                      </div>

                      {/* Row 2: Applicant + Brand + Location */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="font-medium">{req.applicant_name}</span>
                        <span className="text-gray-300">|</span>
                        <span>{getBrandLabel(req.brand)}</span>
                        <span className="text-gray-300">|</span>
                        <span>{getLocationLabel(req.location)}</span>
                      </div>

                      {/* Row 3: Key form fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                        {keyFields.map(([key, value]) => (
                          <div key={key} className="flex gap-1.5">
                            <span className="text-gray-400 shrink-0">{FIELD_LABELS[key] || key}:</span>
                            <span className="text-gray-900 font-medium truncate">{formatFieldValue(key, value)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Reason if exists */}
                      {typeof formData.reason === 'string' && formData.reason !== '' && (
                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="text-gray-400">事由：</span>{formData.reason}
                        </div>
                      )}

                      {/* Expanded: all fields */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {Object.entries(formData)
                              .filter(([k]) => k !== 'reason' && !keyFields.some(([kk]) => kk === k))
                              .map(([key, value]) => (
                                <div key={key} className="flex gap-1.5">
                                  <span className="text-gray-400 shrink-0">{FIELD_LABELS[key] || key}:</span>
                                  <span className="text-gray-900">{formatFieldValue(key, String(value ?? ''))}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {Object.keys(formData).length > keyFields.length + (formData.reason ? 1 : 0) && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium"
                        >
                          {isExpanded ? '收起' : '展開全部欄位'}
                        </button>
                      )}
                    </div>

                    {/* Action buttons (right side) */}
                    {!showBatchBar && (
                      <div className="flex flex-col gap-2 shrink-0">
                        {/* Pending tab: revoke-approval action */}
                        {activeTab === 'pending' && req.status === 'pending_revoke' && (
                          <Link
                            href={`/requests/${req.id}`}
                            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors whitespace-nowrap text-center"
                          >
                            審核撤銷
                          </Link>
                        )}
                        {/* Pending tab: approve/reject */}
                        {activeTab === 'pending' && req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproval(req.id, 'approved', inlineComments[req.id] || '')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                            >
                              核准
                            </button>
                            {confirmReject === req.id ? (
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleApproval(req.id, 'rejected', inlineComments[req.id] || '')}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors whitespace-nowrap"
                                >
                                  確認駁回
                                </button>
                                <button
                                  onClick={() => setConfirmReject(null)}
                                  className="px-4 py-1.5 text-gray-500 text-xs hover:text-gray-700"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmReject(req.id)}
                                className="px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors whitespace-nowrap"
                              >
                                駁回
                              </button>
                            )}
                            <button
                              onClick={() => { setReturnTarget(req.id); setReturnComment('') }}
                              className="px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors whitespace-nowrap"
                            >
                              退回修改
                            </button>
                          </>
                        )}

                        {/* Tracking tab: status progression */}
                        {activeTab === 'tracking' && (
                          <>
                            {req.status === 'approved' && (
                              <button
                                onClick={() => handleApproval(req.id, 'executing', inlineComments[req.id] || '')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                              >
                                開始執行
                              </button>
                            )}
                            {req.status === 'executing' && (
                              <button
                                onClick={() => handleApproval(req.id, 'in_progress', inlineComments[req.id] || '')}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
                              >
                                進行中
                              </button>
                            )}
                            {(req.status === 'executing' || req.status === 'in_progress') && (
                              <button
                                onClick={() => handleApproval(req.id, 'completed', inlineComments[req.id] || '')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                              >
                                標記完成
                              </button>
                            )}
                          </>
                        )}

                        {/* Closing tab: close button */}
                        {activeTab === 'closing' && req.status === 'completed' && (
                          <button
                            onClick={() => {
                              if (confirm('確定要結案此申請嗎？結案後將不會再顯示在申請人的進行中列表。')) {
                                handleClose(req.id, inlineComments[req.id] || '')
                              }
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap"
                          >
                            確認結案
                          </button>
                        )}

                        {/* History tab: undo reject */}
                        {activeTab === 'history' && req.status === 'rejected' && (
                          <button
                            onClick={() => {
                              if (confirm('確定要復原此駁回決定嗎？申請將恢復為待審核狀態。')) {
                                handleUndoReject(req.id)
                              }
                            }}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors whitespace-nowrap"
                          >
                            復原駁回
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inline comment */}
                  {((activeTab === 'pending' && req.status === 'pending' && !showBatchBar) ||
                    activeTab === 'tracking' ||
                    activeTab === 'closing') && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <input
                        type="text"
                        value={inlineComments[req.id] || ''}
                        onChange={(e) => setInlineComments((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder={activeTab === 'closing' ? '結案備註（選填）' : '備註（選填）'}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Return modal */}
      {returnTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setReturnTarget(null); setReturnComment('') }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">退回修改</h3>
            <p className="text-sm text-gray-500 mb-4">申請人會收到通知並可在「我的申請」修改後重送。</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              退回原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              rows={4}
              placeholder="請說明要修改的內容，例：金額需補發票、事由描述不足…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setReturnTarget(null); setReturnComment('') }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => handleReturn(returnTarget)}
                disabled={!returnComment.trim()}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                確認退回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
