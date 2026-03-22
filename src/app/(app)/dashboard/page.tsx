'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { STATUS_LABELS, STATUS_COLORS, getLocationLabel } from '@/lib/constants'
import type { Request } from '@/types/database'

interface DashboardStats {
  pending: number
  executing: number
  in_progress: number
  completed: number
  closed: number
  rejected: number
  urgent: number
}

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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0, executing: 0, in_progress: 0, completed: 0, closed: 0, rejected: 0, urgent: 0,
  })
  const [recentRequests, setRecentRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchStats(), fetchRecent()]).finally(() => setIsLoading(false))
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      const data = await res.json()
      if (data.stats) setStats(data.stats)
    } catch {
      console.error('Failed to fetch stats')
    }
  }

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/requests?limit=10')
      const data = await res.json()
      setRecentRequests((data.requests || []).slice(0, 10))
    } catch {
      console.error('Failed to fetch recent requests')
    }
  }

  const cards = [
    { label: '待審核', value: stats.pending, color: 'bg-yellow-500', href: '/admin' },
    { label: '待執行', value: stats.executing, color: 'bg-blue-500', href: '/admin' },
    { label: '執行中', value: stats.in_progress, color: 'bg-indigo-500', href: '/admin' },
    { label: '已完成', value: stats.completed, color: 'bg-green-500', href: '/admin' },
    { label: '已結案', value: stats.closed, color: 'bg-emerald-500', href: '/admin' },
    { label: '已駁回', value: stats.rejected, color: 'bg-red-500', href: '/admin' },
    { label: '急件', value: stats.urgent, color: 'bg-red-600', href: '/admin' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>
        <Link
          href="/apply"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 發起申請
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3 text-gray-500">載入中...</span>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className={`w-2 h-2 rounded-full ${card.color} mb-2`} />
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link
              href="/apply"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">+</div>
              <div>
                <p className="font-medium text-gray-900">發起申請</p>
                <p className="text-xs text-gray-500">提交新的審批申請</p>
              </div>
            </Link>
            <Link
              href="/admin"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">審批管理</p>
                <p className="text-xs text-gray-500">{stats.pending} 件待處理</p>
              </div>
            </Link>
            <Link
              href="/settings"
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">系統設定</p>
                <p className="text-xs text-gray-500">用戶與路由管理</p>
              </div>
            </Link>
          </div>

          {/* Recent Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">近期申請</h2>
              <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                查看全部
              </Link>
            </div>
            {recentRequests.length === 0 ? (
              <div className="p-8 text-center text-gray-500">尚無申請記錄</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">單號</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申請人</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">日期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentRequests.map((req) => (
                    <tr key={req.id} className={req.is_urgent ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-mono">
                        {req.is_urgent && <span className="text-red-500 mr-1">!</span>}
                        {req.request_number}
                      </td>
                      <td className="px-4 py-3 text-sm">{TYPE_LABELS[req.type] || req.type}</td>
                      <td className="px-4 py-3 text-sm">{req.applicant_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || ''}`}>
                          {STATUS_LABELS[req.status] || req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(req.created_at).toLocaleDateString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
