'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import {
  BRANDS, getBrandLabel, getLocationLabel,
  TYPE_LABELS, TRACKING_STATUS_LABELS, TRACKING_STATUS_COLORS,
} from '@/lib/constants'
import type { Request, TrackingStatus } from '@/types/database'

type RoleFilter = 'tracker' | 'closer' | 'admin'

const TRACKING_STATUS_OPTIONS: Array<{ value: TrackingStatus | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'pending_payment', label: '待撥款' },
  { value: 'paid', label: '已撥款' },
  { value: 'pending_verification', label: '待核銷' },
]

function formatDate(v: string | null | undefined): string {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

function formatMoney(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return `NT$ ${Number(v).toLocaleString('zh-TW')}`
}

function isoDateToInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().split('T')[0]
}

export default function TrackingPage() {
  const { user } = useAuth()
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('tracker')
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | ''>('')
  const [brand, setBrand] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<Request[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    tracking_status: TrackingStatus
    payment_date: string
    payment_due_date: string
    payment_note: string
  }>({ tracking_status: 'pending_payment', payment_date: '', payment_due_date: '', payment_note: '' })
  const [batchComment, setBatchComment] = useState('')
  const [busy, setBusy] = useState(false)

  const fetchRows = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      qs.set('role', roleFilter)
      qs.set('name', user.name)
      if (trackingStatus) qs.set('tracking_status', trackingStatus)
      if (brand) qs.set('brand', brand)
      if (fromDate) qs.set('from', fromDate)
      if (toDate) qs.set('to', toDate)
      const res = await fetch(`/api/requests/tracking?${qs.toString()}`)
      const data = await res.json()
      setRows(data.requests || [])
      setTotalAmount(data.totalAmount || 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setSelectedIds(new Set())
    }
  }, [user, roleFilter, trackingStatus, brand, fromDate, toDate])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  const canCloseAny = roleFilter === 'closer' || roleFilter === 'admin'

  const selectedTotal = useMemo(
    () => rows.filter((r) => selectedIds.has(r.id)).reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [rows, selectedIds]
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selectedIds.size === rows.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(rows.map((r) => r.id)))
  }

  const startEdit = (r: Request) => {
    setEditingId(r.id)
    setEditForm({
      tracking_status: r.tracking_status || 'pending_payment',
      payment_date: isoDateToInput(r.payment_date),
      payment_due_date: isoDateToInput(r.payment_due_date),
      payment_note: r.payment_note || '',
    })
  }

  const savePayment = async (id: string) => {
    if (!user) return
    setBusy(true)
    try {
      const res = await fetch(`/api/requests/${id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracking_status: editForm.tracking_status,
          payment_date: editForm.payment_date || null,
          payment_due_date: editForm.payment_due_date || null,
          payment_note: editForm.payment_note || null,
          actor_name: user.name,
          actor_role: user.role,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '更新失敗')
        return
      }
      setEditingId(null)
      await fetchRows()
    } finally {
      setBusy(false)
    }
  }

  const closeOne = async (id: string) => {
    if (!user) return
    if (!confirm('確認結案此申請？')) return
    setBusy(true)
    try {
      await fetch(`/api/requests/${id}/close-tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_name: user.name, actor_role: user.role }),
      })
      await fetchRows()
    } finally {
      setBusy(false)
    }
  }

  const batchClose = async () => {
    if (!user || selectedIds.size === 0) return
    if (!confirm(`確認批次結案 ${selectedIds.size} 筆申請？`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/requests/tracking/batch-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          comment: batchComment || null,
          actor_name: user.name,
          actor_role: user.role,
        }),
      })
      const data = await res.json()
      alert(`批次結案完成：${data.closedCount} 筆`)
      setBatchComment('')
      await fetchRows()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">核准後追蹤</h1>
        <div className="text-sm text-gray-500">
          合計 <span className="font-semibold text-gray-900">{formatMoney(totalAmount)}</span>
          {selectedIds.size > 0 && (
            <>（已選 {selectedIds.size} 筆，{formatMoney(selectedTotal)}）</>
          )}
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 w-fit">
        {([
          { k: 'tracker' as const, l: '我負責追蹤' },
          { k: 'closer' as const, l: '我能結案' },
          { k: 'admin' as const, l: '全部' },
        ]).map((t) => (
          <button
            key={t.k}
            onClick={() => setRoleFilter(t.k)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              roleFilter === t.k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 flex-wrap items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">追蹤狀態</label>
          <select
            value={trackingStatus}
            onChange={(e) => setTrackingStatus(e.target.value as TrackingStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {TRACKING_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">品牌</label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">全部</option>
            {BRANDS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">起始日期</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">結束日期</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <button
          onClick={() => { setTrackingStatus(''); setBrand(''); setFromDate(''); setToDate('') }}
          className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
        >
          清除
        </button>
      </div>

      {/* Batch close bar */}
      {canCloseAny && selectedIds.size > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-emerald-900">
            已選 {selectedIds.size} 筆 · 合計 {formatMoney(selectedTotal)}
          </span>
          <input
            type="text"
            value={batchComment}
            onChange={(e) => setBatchComment(e.target.value)}
            placeholder="批次結案備註（選填，例：25 號撥款作業）"
            className="flex-1 min-w-[240px] px-3 py-2 border border-emerald-300 rounded-lg text-sm"
          />
          <button
            disabled={busy}
            onClick={batchClose}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            批次結案
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-500">載入中...</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          目前沒有需要追蹤的申請
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                {canCloseAny && (
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === rows.length && rows.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-3 py-3 text-left">審批單號</th>
                <th className="px-3 py-3 text-left">品牌 / 單位</th>
                <th className="px-3 py-3 text-left">事由</th>
                <th className="px-3 py-3 text-right">金額</th>
                <th className="px-3 py-3 text-left">發起人</th>
                <th className="px-3 py-3 text-left">追蹤狀態</th>
                <th className="px-3 py-3 text-left">預計撥款</th>
                <th className="px-3 py-3 text-left">實際撥款</th>
                <th className="px-3 py-3 text-left">備註</th>
                <th className="px-3 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const isEditing = editingId === r.id
                return (
                  <tr key={r.id} className={selectedIds.has(r.id) ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                    {canCloseAny && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <Link href={`/requests/${r.id}`} className="font-mono text-blue-600 hover:underline">
                        {r.request_number}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{TYPE_LABELS[r.type] || r.type}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {getBrandLabel(r.brand)}
                      <p className="text-xs text-gray-400">{getLocationLabel(r.location)}</p>
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-[200px]">
                      <span className="line-clamp-2">
                        {(r.form_data && typeof r.form_data === 'object' &&
                          ((r.form_data as Record<string, unknown>).reason as string)) || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">
                      {formatMoney(r.amount)}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{r.applicant_name}</td>
                    <td className="px-3 py-3">
                      {isEditing ? (
                        <select
                          value={editForm.tracking_status}
                          onChange={(e) => setEditForm({ ...editForm, tracking_status: e.target.value as TrackingStatus })}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="pending_payment">待撥款</option>
                          <option value="paid">已撥款</option>
                          <option value="pending_verification">待核銷</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${TRACKING_STATUS_COLORS[r.tracking_status || 'pending_payment'] || ''}`}>
                          {TRACKING_STATUS_LABELS[r.tracking_status || 'pending_payment'] || r.tracking_status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.payment_due_date}
                          onChange={(e) => setEditForm({ ...editForm, payment_due_date: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-xs w-[130px]"
                        />
                      ) : formatDate(r.payment_due_date)}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.payment_date}
                          onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-xs w-[130px]"
                        />
                      ) : formatDate(r.payment_date)}
                    </td>
                    <td className="px-3 py-3 text-gray-700 max-w-[180px]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.payment_note}
                          onChange={(e) => setEditForm({ ...editForm, payment_note: e.target.value })}
                          placeholder="備註"
                          className="px-2 py-1 border border-gray-300 rounded text-xs w-full"
                        />
                      ) : (
                        <span className="text-xs truncate">{r.payment_note || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {isEditing ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            disabled={busy}
                            onClick={() => savePayment(r.id)}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                          >
                            儲存
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-gray-500 text-xs hover:text-gray-700"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1 justify-end flex-wrap">
                          <button
                            onClick={() => startEdit(r)}
                            className="px-2 py-1 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-50"
                          >
                            更新撥款
                          </button>
                          {canCloseAny && (
                            <button
                              disabled={busy}
                              onClick={() => closeOne(r.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50"
                            >
                              結案
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 text-sm">
              <tr>
                <td colSpan={canCloseAny ? 4 : 3} className="px-3 py-3 text-right text-gray-500">合計：</td>
                <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatMoney(totalAmount)}</td>
                <td colSpan={6}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
