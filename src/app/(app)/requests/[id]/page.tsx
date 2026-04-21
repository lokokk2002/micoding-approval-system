'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  STATUS_LABELS, STATUS_COLORS,
  TRACKING_STATUS_LABELS, TRACKING_STATUS_COLORS,
  FIELD_LABELS, MONEY_FIELD_KEYS, TYPE_LABELS,
  HISTORY_ACTION_LABELS, HISTORY_ACTION_COLORS,
  getLocationLabel, getBrandLabel,
} from '@/lib/constants'
import type { Request, History, FormDataVersion } from '@/types/database'
import ConfirmWithCountdown from '@/components/ConfirmWithCountdown'

type Tab = 'overview' | 'history' | 'versions'

function formatDT(v: string | null | undefined): string {
  if (!v) return '—'
  return new Date(v).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (MONEY_FIELD_KEYS.has(key)) {
    const n = typeof value === 'number' ? value : parseFloat(String(value))
    if (!isNaN(n)) return `NT$ ${n.toLocaleString('zh-TW')}`
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        return `${i + 1}. ${obj.name || obj.item_name || '品項'} x${obj.quantity || '?'}`
      }
      return String(item)
    }).join('、')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// 將 form_data 渲染成可編輯欄位
function FormEditor({
  formData,
  onChange,
}: {
  formData: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  const entries = Object.entries(formData)
  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => {
        const isComplex = typeof value === 'object' && value !== null
        const isLongText = typeof value === 'string' && (value.length > 40 || ['reason', 'description', 'note', 'fault_description', 'complaint_content', 'handover_note', 'recommendation', 'proposed_solution', 'event_description', 'collaboration_content', 'content_summary', 'job_description', 'over_reason'].includes(key))
        const isMoney = MONEY_FIELD_KEYS.has(key)
        const label = FIELD_LABELS[key] || key
        return (
          <div key={key} className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 items-start">
            <label className="text-sm font-medium text-gray-700 md:pt-2">{label}</label>
            {isComplex ? (
              <textarea
                value={JSON.stringify(value, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    onChange({ ...formData, [key]: parsed })
                  } catch { /* invalid JSON — keep current state in UI only */ }
                }}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            ) : isLongText ? (
              <textarea
                value={String(value ?? '')}
                onChange={(e) => onChange({ ...formData, [key]: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <input
                type={isMoney ? 'number' : 'text'}
                value={String(value ?? '')}
                onChange={(e) => onChange({ ...formData, [key]: isMoney ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [req, setReq] = useState<Request | null>(null)
  const [history, setHistory] = useState<History[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')

  // Edit state (for returned/withdrawn resubmit)
  const [editing, setEditing] = useState(false)
  const [draftFormData, setDraftFormData] = useState<Record<string, unknown>>({})
  const [resubmitReason, setResubmitReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialogs
  const [revokeRequestOpen, setRevokeRequestOpen] = useState(false)
  const [revokeReason, setRevokeReason] = useState('')
  const [adminRevokeOpen, setAdminRevokeOpen] = useState(false)
  const [adminRevokeReason, setAdminRevokeReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detailRes, historyRes] = await Promise.all([
        fetch(`/api/requests/${id}/detail`),
        fetch(`/api/requests/${id}/history`),
      ])
      const detailJson = await detailRes.json()
      const historyJson = await historyRes.json()
      const reqData: Request | null = detailRes.ok ? (detailJson.request || null) : null
      setReq(reqData)
      if (reqData) setDraftFormData({ ...(reqData.form_data || {}) })
      setHistory(historyJson.history || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-500">載入中...</span>
      </div>
    )
  }

  if (!req) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">找不到此申請</p>
        <Link href="/my-requests" className="text-blue-600 mt-3 inline-block">返回我的申請</Link>
      </div>
    )
  }

  const isApplicant = user?.name === req.applicant_name
  const canEdit = isApplicant && ['returned', 'withdrawn'].includes(req.status)
  const canRequestRevoke = isApplicant && req.status === 'approved'
  const canAdminRevoke = (user?.role === 'admin' || user?.role === 'reviewer') &&
    ['approved', 'tracking'].includes(req.status)
  const lastReturnComment = [...history].reverse().find((h) => h.action === 'returned')?.comment
  const lastRevokeRequest = [...history].reverse().find((h) => h.action === 'revoke_requested')

  const handleResubmit = async () => {
    if (!user) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/requests/${id}/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_data: draftFormData,
          attachments: req.attachments,
          reason: resubmitReason.trim() || undefined,
          actor_name: user.name,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '重送失敗')
        return
      }
      setEditing(false)
      setResubmitReason('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const handleRequestRevoke = async () => {
    if (!user) return
    setBusy(true)
    try {
      const res = await fetch(`/api/requests/${id}/revoke-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: revokeReason.trim(), actor_name: user.name }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '送出失敗')
        return
      }
      setRevokeRequestOpen(false)
      setRevokeReason('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const handleAdminRevoke = async () => {
    if (!user) return
    setBusy(true)
    try {
      const res = await fetch(`/api/requests/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: adminRevokeReason.trim(), actor_name: user.name, actor_role: user.role }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '撤銷失敗')
        return
      }
      setAdminRevokeOpen(false)
      setAdminRevokeReason('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const handleRevokeApproveDecision = async (approve: boolean) => {
    if (!user) return
    if (!confirm(approve ? '確認同意撤銷？' : '確認駁回撤銷請求？')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/requests/${id}/revoke-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve, actor_name: user.name, actor_role: user.role }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '操作失敗')
        return
      }
      await load()
    } finally {
      setBusy(false)
    }
  }

  const typeLabel = TYPE_LABELS[req.type] || req.type

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-4">
        <Link href={isApplicant ? '/my-requests' : '/admin'} className="text-sm text-blue-600 hover:underline">
          ← 返回列表
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className={`h-1.5 ${
          req.status === 'revoked' || req.status === 'rejected' ? 'bg-red-500' :
          req.status === 'returned' ? 'bg-amber-500' :
          req.status === 'pending_revoke' ? 'bg-rose-500' :
          req.status === 'tracking' ? 'bg-cyan-500' :
          req.status === 'approved' ? 'bg-green-500' :
          req.status === 'withdrawn' ? 'bg-orange-400' :
          'bg-yellow-400'
        }`} />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">{typeLabel}</span>
                <span className="font-mono text-sm text-gray-500">{req.request_number}</span>
                <span className="text-xs text-gray-400">v{req.version}</span>
                {req.is_urgent && (
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-200">急件</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <span>{getBrandLabel(req.brand)}</span>
                <span className="text-gray-300">|</span>
                <span>{getLocationLabel(req.location)}</span>
                <span className="text-gray-300">|</span>
                <span>{req.applicant_name}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${STATUS_COLORS[req.status] || ''}`}>
                {STATUS_LABELS[req.status] || req.status}
              </span>
              {req.status === 'tracking' && req.tracking_status && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${TRACKING_STATUS_COLORS[req.tracking_status] || ''}`}>
                  {TRACKING_STATUS_LABELS[req.tracking_status] || req.tracking_status}
                </span>
              )}
            </div>
          </div>

          {/* Alerts */}
          {req.status === 'returned' && lastReturnComment && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-amber-600 font-medium text-sm">🔁 已被退回</span>
              </div>
              <p className="mt-1 text-sm text-amber-900 whitespace-pre-wrap">{lastReturnComment}</p>
              {isApplicant && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-3 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                >
                  修改重送
                </button>
              )}
            </div>
          )}

          {req.status === 'withdrawn' && isApplicant && !editing && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between gap-2">
              <span className="text-sm text-orange-900">這張單已撤回。可以修改後重送，或保持撤回狀態。</span>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shrink-0"
              >
                修改重送
              </button>
            </div>
          )}

          {req.status === 'pending_revoke' && lastRevokeRequest && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="text-rose-700 font-medium text-sm">⚠️ 撤銷審核中</span>
              <p className="mt-1 text-sm text-rose-900">申請人：{lastRevokeRequest.actor_name}</p>
              {lastRevokeRequest.comment && (
                <p className="mt-1 text-sm text-rose-900 whitespace-pre-wrap">原因：{lastRevokeRequest.comment}</p>
              )}
              {canAdminRevoke && (
                <div className="mt-3 flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => handleRevokeApproveDecision(true)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    同意撤銷
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => handleRevokeApproveDecision(false)}
                    className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    駁回撤銷
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5 w-fit">
            {(['overview', 'history', 'versions'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t === 'overview' ? '內容' : t === 'history' ? '歷程' : `版本 (${(req.form_data_versions || []).length + 1})`}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab === 'overview' && (
            <div>
              {editing ? (
                <div>
                  <FormEditor formData={draftFormData} onChange={setDraftFormData} />
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">修改說明（選填）</label>
                    <textarea
                      value={resubmitReason}
                      onChange={(e) => setResubmitReason(e.target.value)}
                      rows={2}
                      placeholder="例：依退回意見補充單據金額"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={handleResubmit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy ? '送出中…' : '確認重送（回到第 1 層審批）'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        setDraftFormData({ ...(req.form_data || {}) })
                        setResubmitReason('')
                      }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(req.form_data || {}).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2">
                      <span className="text-sm text-gray-500">{FIELD_LABELS[key] || key}</span>
                      <span className="text-sm text-gray-900 whitespace-pre-wrap">{formatValue(key, value)}</span>
                    </div>
                  ))}
                  {req.attachments && req.attachments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 pt-2">
                      <span className="text-sm text-gray-500">附件</span>
                      <div className="text-sm space-y-1">
                        {req.attachments.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                             className="text-blue-600 hover:underline block">
                            {a.filename}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Applicant actions */}
              {!editing && isApplicant && (
                <div className="mt-6 pt-4 border-t border-gray-100 flex gap-2 flex-wrap">
                  {canRequestRevoke && (
                    <button
                      onClick={() => setRevokeRequestOpen(true)}
                      className="px-3 py-1.5 text-sm text-rose-700 border border-rose-300 rounded-lg hover:bg-rose-50"
                    >
                      申請撤銷
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-3 py-1.5 text-sm text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
                    >
                      修改重送
                    </button>
                  )}
                </div>
              )}

              {/* Admin/reviewer force-revoke */}
              {!editing && canAdminRevoke && req.status !== 'pending_revoke' && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setAdminRevokeOpen(true)}
                    className="px-3 py-1.5 text-sm text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    撤銷此審批
                  </button>
                </div>
              )}
            </div>
          )}

          {/* History tab */}
          {tab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-gray-400">尚無紀錄</p>
              ) : history.map((h) => (
                <div key={h.id} className="flex gap-3 items-start border-l-2 border-gray-200 pl-4 pb-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${HISTORY_ACTION_COLORS[h.action] || 'bg-gray-100 text-gray-700'}`}>
                    {HISTORY_ACTION_LABELS[h.action] || h.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{h.actor_name}</span>
                      {h.actor_role && <span className="text-gray-400"> · {h.actor_role}</span>}
                      {h.level > 0 && <span className="text-gray-400"> · 第 {h.level} 層</span>}
                    </p>
                    {h.comment && (
                      <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{h.comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{formatDT(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Versions tab */}
          {tab === 'versions' && (
            <VersionsPanel req={req} />
          )}
        </div>
      </div>

      {/* Dialogs */}
      {revokeRequestOpen && (
        <ConfirmWithCountdown
          title="申請撤銷"
          description={`你正在申請撤銷已核准的審批單 ${req.request_number}。原核准人會收到通知後決定是否同意。`}
          confirmLabel="送出撤銷申請"
          seconds={3}
          confirmClassName="bg-rose-600 hover:bg-rose-700"
          disabled={!revokeReason.trim()}
          onCancel={() => { setRevokeRequestOpen(false); setRevokeReason('') }}
          onConfirm={handleRequestRevoke}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1">
            撤銷原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="例：專案取消，款項無需撥付"
            autoFocus
          />
        </ConfirmWithCountdown>
      )}

      {adminRevokeOpen && (
        <ConfirmWithCountdown
          title="撤銷此審批"
          description={`你將直接撤銷已核准的審批單 ${req.request_number}。撤銷後此單成為終態，需要重新建單。`}
          confirmLabel="確認撤銷"
          seconds={3}
          confirmClassName="bg-red-600 hover:bg-red-700"
          disabled={!adminRevokeReason.trim()}
          onCancel={() => { setAdminRevokeOpen(false); setAdminRevokeReason('') }}
          onConfirm={handleAdminRevoke}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1">
            撤銷原因 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={adminRevokeReason}
            onChange={(e) => setAdminRevokeReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            autoFocus
          />
        </ConfirmWithCountdown>
      )}
    </div>
  )
}

function VersionsPanel({ req }: { req: Request }) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const versions: FormDataVersion[] = req.form_data_versions || []
  // Construct current version snapshot (same format) for display
  const current: FormDataVersion = {
    version: req.version,
    form_data: req.form_data || {},
    attachments: req.attachments || [],
    saved_at: req.updated_at,
    reason: '現行版本',
  }
  const all = [...versions, current]

  return (
    <div className="space-y-2">
      {all.map((v) => {
        const isCurrent = v.version === req.version
        const isOpen = expanded === v.version
        return (
          <div key={v.version} className={`border rounded-lg ${isCurrent ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'}`}>
            <button
              onClick={() => setExpanded(isOpen ? null : v.version)}
              className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold">v{v.version}</span>
                {isCurrent && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">現行版本</span>
                )}
                <span className="text-xs text-gray-500">{v.reason}</span>
              </div>
              <span className="text-xs text-gray-400">
                {formatDT(v.saved_at)} {isOpen ? '▲' : '▼'}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-3 pt-1 border-t border-gray-100 space-y-1">
                {Object.entries(v.form_data || {}).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2">
                    <span className="text-xs text-gray-500">{FIELD_LABELS[key] || key}</span>
                    <span className="text-sm text-gray-900 whitespace-pre-wrap">{formatValue(key, value)}</span>
                  </div>
                ))}
                {v.attachments && v.attachments.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 pt-1">
                    <span className="text-xs text-gray-500">附件</span>
                    <div className="text-sm">
                      {v.attachments.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                          {a.filename}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
