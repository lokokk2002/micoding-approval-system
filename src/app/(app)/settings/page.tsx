'use client'

import { useState, useEffect, useCallback } from 'react'
import { BRANDS, LOCATIONS, HQ_DEPARTMENTS, getLocationLabel, getBrandLabel, REVIEWER_ROLE_OPTIONS, ORG_ROLE_LABELS } from '@/lib/constants'
import type { User, UserRole, Routing, PostApproval, ReviewerRole } from '@/types/database'
import OrgStructureTab from '@/components/settings/OrgStructureTab'
import AreasTab from '@/components/settings/AreasTab'

type SettingsTab = 'users' | 'org-structure' | 'areas' | 'routing' | 'post-approval'

// ============================================================
// Main Settings Page
// ============================================================
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users')

  const tabs = [
    { key: 'users' as SettingsTab, label: '用戶管理' },
    { key: 'org-structure' as SettingsTab, label: '組織架構' },
    { key: 'areas' as SettingsTab, label: '區域' },
    { key: 'routing' as SettingsTab, label: '審批層級' },
    { key: 'post-approval' as SettingsTab, label: '追蹤與結案' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">系統設定</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'org-structure' && <OrgStructureTab />}
      {activeTab === 'areas' && <AreasTab />}
      {activeTab === 'routing' && <RoutingManagement />}
      {activeTab === 'post-approval' && <PostApprovalManagement />}
    </div>
  )
}

// ============================================================
// User Management
// ============================================================
const ROLE_LABELS: Record<string, string> = {
  admin: '超級管理員',
  reviewer: '審批人員',
  user: '使用者',
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      console.error('Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleToggleActive = async (user: User) => {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !user.is_active }),
    })
    fetchUsers()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">管理系統中的所有用戶帳號</p>
        <button
          onClick={() => { setEditingUser(null); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 新增用戶
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">尚無用戶資料</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">手機</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">品牌</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">門市/部門</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slack ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{u.phone}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'reviewer' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.brand ? getBrandLabel(u.brand) : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.location ? getLocationLabel(u.location) : '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{u.slack_id || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.is_active ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingUser(u); setShowForm(true) }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`text-sm font-medium ${u.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                      >
                        {u.is_active ? '停用' : '啟用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <UserFormModal
          user={editingUser}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchUsers() }}
        />
      )}
    </div>
  )
}

function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: User | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    phone: user?.phone || '',
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'user',
    brand: user?.brand || '',
    location: user?.location || '',
    slack_id: user?.slack_id || '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const allLocations = form.brand
    ? [
        ...LOCATIONS[form.brand as keyof typeof LOCATIONS] || [],
        ...HQ_DEPARTMENTS.map((d) => ({ value: d.value, label: `總部 - ${d.label}` })),
      ]
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')

    // 新增使用者時密碼必填
    if (!user && (!form.password || form.password.length < 4)) {
      setError('新增使用者時密碼為必填，至少 4 個字元')
      setIsSaving(false)
      return
    }
    // 編輯時密碼有填就驗證長度
    if (user && form.password && form.password.length < 4) {
      setError('密碼至少 4 個字元')
      setIsSaving(false)
      return
    }

    try {
      const url = user ? `/api/users/${user.id}` : '/api/users'
      const method = user ? 'PUT' : 'POST'
      // 編輯時，密碼為空就不送（不修改密碼）
      const submitData = { ...form }
      if (user && !submitData.password) {
        const { password: _pw, ...rest } = submitData
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rest) })
        const data = await res.json()
        if (!res.ok) { setError(data.error || '儲存失敗'); return }
        onSaved()
        return
      }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submitData) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '儲存失敗'); return }
      onSaved()
    } catch { setError('儲存失敗，請稍後再試') } finally { setIsSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{user ? '編輯用戶' : '新增用戶'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手機 *</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required disabled={!!user} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色 *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
              <option value="user">使用者</option>
              <option value="reviewer">審批人員</option>
              <option value="admin">超級管理員</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
              <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value, location: '' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                <option value="">不指定</option>
                {BRANDS.map((b) => (<option key={b.value} value={b.value}>{b.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">門市/部門</label>
              <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} disabled={!form.brand} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-100">
                <option value="">不指定</option>
                {allLocations.map((loc) => (<option key={loc.value} value={loc.value}>{loc.label}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slack ID</label>
            <input type="text" value={form.slack_id} onChange={(e) => setForm({ ...form, slack_id: e.target.value })} placeholder="用於 Slack 通知（選填）" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {user ? '重設密碼' : '密碼'} {!user && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={user ? '留空表示不修改密碼' : '請設定密碼（至少 4 個字元）'}
              required={!user}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            {user && <p className="mt-1 text-xs text-gray-400">如需重設密碼才填寫，留空則不修改</p>}
          </div>
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">{isSaving ? '儲存中...' : '儲存'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// User Selector — 從用戶列表選人
// ============================================================
function UserSelector({
  label,
  selectedName,
  users,
  colorClass,
  onChange,
}: {
  label: string
  selectedName: string
  users: User[]
  colorClass: string
  onChange: (name: string, phone: string, slackId: string) => void
}) {
  const activeUsers = users.filter((u) => u.is_active)
  const selectedUser = activeUsers.find((u) => u.name === selectedName)

  return (
    <div className={`rounded-lg p-4 space-y-2 ${colorClass}`}>
      <p className="text-sm font-medium">{label}</p>
      <select
        value={selectedName}
        onChange={(e) => {
          const user = activeUsers.find((u) => u.name === e.target.value)
          if (user) onChange(user.name, user.phone, user.slack_id || '')
          else onChange('', '', '')
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      >
        <option value="">不指定</option>
        {activeUsers.map((u) => (
          <option key={u.id} value={u.name}>
            {u.name}{u.brand ? ` — ${getBrandLabel(u.brand)}` : ''}{u.slack_id ? ` (Slack: ${u.slack_id})` : ''}
          </option>
        ))}
      </select>
      {selectedUser && (
        <div className="text-xs text-gray-500">
          手機：{selectedUser.phone}
          {selectedUser.slack_id && <span className="ml-3">Slack：{selectedUser.slack_id}</span>}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Routing Management — 審批層級（只管審批人）
// ============================================================
const CATEGORY_LABELS: Record<string, string> = {
  all: '全部類別',
  finance: '財務費用',
  procurement: '採購',
  hr: '人事',
  operations: '門市營運',
  marketing: '行銷',
}

function RoutingManagement() {
  const [routes, setRoutes] = useState<Routing[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState<{ brand: string; location: string; category: string; routes: Routing[] } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [rRes, uRes] = await Promise.all([fetch('/api/routing'), fetch('/api/users')])
      const [rData, uData] = await Promise.all([rRes.json(), uRes.json()])
      setRoutes(rData.routes || [])
      setUsers(uData.users || [])
    } catch { console.error('Failed to fetch') }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDeleteGroup = async (brand: string, location: string, category: string, routeGroup: Routing[]) => {
    if (!confirm(`確定要刪除「${getBrandLabel(brand)} / ${getLocationLabel(location)}」的所有審批層級嗎？`)) return
    await Promise.all(routeGroup.map((r) => fetch(`/api/routing/${r.id}`, { method: 'DELETE' })))
    fetchData()
  }

  // 按 brand|location|category 分組
  const grouped = routes.reduce<Record<string, Routing[]>>((acc, route) => {
    const key = `${route.brand}|${route.location}|${route.category}`
    if (!acc[key]) acc[key] = []
    acc[key].push(route)
    return acc
  }, {})

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-500">設定各品牌/門市的審批層級與審批人</p>
          <p className="text-xs text-gray-400 mt-1">可一次設定 1~3 層審批流程，追蹤人與結案人在「追蹤與結案」分頁設定</p>
        </div>
        <button
          onClick={() => { setEditingGroup(null); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 新增審批流程
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">載入中...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-2">尚未設定審批層級</p>
          <p className="text-xs text-gray-400">點擊「新增審批流程」來設定品牌/門市的多層審批</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, routeGroup]) => {
            const [brand, location, category] = key.split('|')
            const sortedRoutes = routeGroup.sort((a, b) => a.level - b.level)
            const totalLevels = Math.max(...sortedRoutes.map((r) => r.level))
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{getBrandLabel(brand)}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600">{getLocationLabel(location)}</span>
                    {category !== 'all' && (
                      <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">{CATEGORY_LABELS[category] || category}</span>
                    )}
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {totalLevels} 層審批
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingGroup({ brand, location, category, routes: sortedRoutes }); setShowForm(true) }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(brand, location, category, routeGroup)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      刪除
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {sortedRoutes.map((route, idx) => (
                      <div key={route.id} className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            route.level === 1 ? 'bg-blue-100 text-blue-700' :
                            route.level === 2 ? 'bg-purple-100 text-purple-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {route.level}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">第{route.level}層</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-3 py-2 min-w-[120px]">
                          <p className="text-xs text-gray-400">
                            {route.reviewer_role ? '審批角色' : '審批人'}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {route.reviewer_role ? (ORG_ROLE_LABELS[route.reviewer_role] || route.reviewer_role) : (route.reviewer_name || '未指定')}
                          </p>
                          {route.reviewer_role && route.reviewer_name && (
                            <p className="text-[10px] text-gray-400 mt-0.5">覆蓋：{route.reviewer_name}</p>
                          )}
                        </div>
                        {idx < sortedRoutes.length - 1 && (
                          <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <RoutingFormModal
          editingGroup={editingGroup}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchData() }}
        />
      )}
    </div>
  )
}

interface LevelConfig {
  level: number
  reviewer_role: ReviewerRole | ''
  reviewer_name: string
  reviewer_phone: string
  reviewer_slack_id: string
}

function RoutingFormModal({
  editingGroup,
  users,
  onClose,
  onSaved,
}: {
  editingGroup: { brand: string; location: string; category: string; routes: Routing[] } | null
  users: User[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEditing = !!editingGroup

  const buildInitialLevels = (): LevelConfig[] => {
    if (editingGroup && editingGroup.routes.length > 0) {
      const maxLevel = Math.max(...editingGroup.routes.map((r) => r.level))
      const levels: LevelConfig[] = []
      for (let i = 1; i <= maxLevel; i++) {
        const existing = editingGroup.routes.find((r) => r.level === i)
        levels.push({
          level: i,
          reviewer_role: (existing?.reviewer_role as ReviewerRole) || '',
          reviewer_name: existing?.reviewer_name || '',
          reviewer_phone: existing?.reviewer_phone || '',
          reviewer_slack_id: existing?.reviewer_slack_id || '',
        })
      }
      return levels
    }
    return [{ level: 1, reviewer_role: '', reviewer_name: '', reviewer_phone: '', reviewer_slack_id: '' }]
  }

  const [brand, setBrand] = useState(editingGroup?.brand || '')
  const [location, setLocation] = useState(editingGroup?.location || '')
  const [category, setCategory] = useState(editingGroup?.category || 'all')
  const [totalLevels, setTotalLevels] = useState(editingGroup ? Math.max(...editingGroup.routes.map((r) => r.level)) : 1)
  const [levels, setLevels] = useState<LevelConfig[]>(buildInitialLevels)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const allLocations = brand
    ? [...LOCATIONS[brand as keyof typeof LOCATIONS] || [], ...HQ_DEPARTMENTS.map((d) => ({ value: d.value, label: `總部 - ${d.label}` }))]
    : []

  const handleTotalLevelsChange = (newTotal: number) => {
    setTotalLevels(newTotal)
    setLevels((prev) => {
      const updated: LevelConfig[] = []
      for (let i = 1; i <= newTotal; i++) {
        const existing = prev.find((l) => l.level === i)
        updated.push(existing || { level: i, reviewer_role: '', reviewer_name: '', reviewer_phone: '', reviewer_slack_id: '' })
      }
      return updated
    })
  }

  const handleLevelRoleChange = (levelNum: number, role: ReviewerRole | '') => {
    setLevels((prev) =>
      prev.map((l) => l.level === levelNum ? { ...l, reviewer_role: role } : l)
    )
  }

  const handleLevelUserChange = (levelNum: number, name: string, phone: string, slackId: string) => {
    setLevels((prev) =>
      prev.map((l) =>
        l.level === levelNum
          ? { ...l, reviewer_name: name, reviewer_phone: phone, reviewer_slack_id: slackId }
          : l
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')

    // 驗證：每層都要有角色或指定人員
    const missingLevels = levels.filter((l) => !l.reviewer_role && !l.reviewer_name)
    if (missingLevels.length > 0) {
      setError(`第 ${missingLevels.map((l) => l.level).join('、')} 層尚未指定審批角色或審批人`)
      setIsSaving(false)
      return
    }

    try {
      const res = await fetch('/api/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          location,
          category,
          totalLevels,
          levels,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '儲存失敗'); return }
      onSaved()
    } catch { setError('儲存失敗') } finally { setIsSaving(false) }
  }

  const LEVEL_COLORS = [
    { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    { bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
    { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', border: 'border-orange-200' },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? '編輯審批流程' : '新增審批流程'}</h2>
          <p className="text-xs text-gray-400 mt-1">設定品牌/門市的多層審批流程，每一層指定一位審批人</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* 品牌 & 門市 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品牌 *</label>
              <select
                value={brand}
                onChange={(e) => { setBrand(e.target.value); setLocation('') }}
                required
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              >
                <option value="">請選擇</option>
                {BRANDS.map((b) => (<option key={b.value} value={b.value}>{b.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">門市/部門 *</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                disabled={!brand || isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              >
                <option value="">請選擇</option>
                {allLocations.map((loc) => (<option key={loc.value} value={loc.value}>{loc.label}</option>))}
              </select>
            </div>
          </div>

          {/* 適用類別 & 審批層數 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">適用類別</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              >
                <option value="all">全部類別</option>
                <option value="finance">財務費用</option>
                <option value="procurement">採購</option>
                <option value="hr">人事</option>
                <option value="operations">門市營運</option>
                <option value="marketing">行銷</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">審批層數 *</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleTotalLevelsChange(n)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      totalLevels === n
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {n} 層
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 審批流程視覺化 */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-3">審批流程</p>
            <div className="space-y-3">
              {levels.map((levelConfig, idx) => {
                const colors = LEVEL_COLORS[idx] || LEVEL_COLORS[0]
                return (
                  <div key={levelConfig.level}>
                    {/* 箭頭連接線 */}
                    {idx > 0 && (
                      <div className="flex justify-center -mt-1 -mb-1">
                        <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </div>
                    )}
                    <div className={`rounded-lg border ${colors.border} overflow-hidden`}>
                      <div className={`px-3 py-2 ${colors.bg} flex items-center gap-2`}>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colors.badge}`}>
                          {levelConfig.level}
                        </span>
                        <span className="text-sm font-medium text-gray-700">第 {levelConfig.level} 層審批</span>
                      </div>
                      <div className="px-3 py-2 bg-white space-y-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">審批角色</label>
                          <select
                            value={levelConfig.reviewer_role}
                            onChange={(e) => handleLevelRoleChange(levelConfig.level, e.target.value as ReviewerRole | '')}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">請選擇角色</option>
                            {REVIEWER_ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                        <details className="group">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                            進階：指定特定人員（覆蓋角色制）
                          </summary>
                          <div className="mt-2">
                            <UserSelector
                              label=""
                              selectedName={levelConfig.reviewer_name}
                              users={users}
                              colorClass=""
                              onChange={(name, phone, slackId) => handleLevelUserChange(levelConfig.level, name, phone, slackId)}
                            />
                            {levelConfig.reviewer_name && (
                              <button
                                type="button"
                                onClick={() => handleLevelUserChange(levelConfig.level, '', '', '')}
                                className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                              >
                                清除指定人員
                              </button>
                            )}
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* 流程摘要 */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-400">
                流程：申請人提交
                {levels.map((l) => {
                  const roleLabel = l.reviewer_role ? ORG_ROLE_LABELS[l.reviewer_role] : null
                  const display = l.reviewer_name
                    ? <strong className="text-gray-600">{l.reviewer_name}</strong>
                    : roleLabel
                      ? <span className="text-blue-600 font-medium">{roleLabel}</span>
                      : <span className="text-red-400">待指定</span>
                  return (
                    <span key={l.level}>
                      {' '}→ {display}
                      <span className="text-gray-300">（第{l.level}層）</span>
                    </span>
                  )
                })}
                {' '}→ 核准
              </p>
            </div>
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{isSaving ? '儲存中...' : '儲存'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// Post-Approval Management — 追蹤人與結案人（按 brand+location）
// ============================================================
function PostApprovalManagement() {
  const [items, setItems] = useState<PostApproval[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<PostApproval | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [pRes, uRes] = await Promise.all([fetch('/api/post-approval'), fetch('/api/users')])
      const [pData, uData] = await Promise.all([pRes.json(), uRes.json()])
      setItems(pData.items || [])
      setUsers(uData.users || [])
    } catch { console.error('Failed to fetch') }
    finally { setIsLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除嗎？')) return
    await fetch(`/api/post-approval/${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-500">設定審批全部通過後的追蹤人與結案人</p>
          <p className="text-xs text-gray-400 mt-1">按品牌/門市設定，所有審批層級通過後才會生效</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 新增設定
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">載入中...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-2">尚未設定追蹤與結案人</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-medium text-gray-900">{getBrandLabel(item.brand)}</span>
                  <span className="text-gray-400 mx-2">/</span>
                  <span className="text-gray-600">{getLocationLabel(item.location)}</span>
                  {item.category !== 'all' && (
                    <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{item.category}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(item); setShowForm(true) }} className="text-sm text-blue-600 hover:text-blue-800 font-medium">編輯</button>
                  <button onClick={() => handleDelete(item.id)} className="text-sm text-red-600 hover:text-red-800 font-medium">刪除</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {item.tracker_name && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">追蹤人</span>
                    <span className="text-sm text-gray-700">{item.tracker_name}</span>
                  </div>
                )}
                {item.closer_name && (
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">結案人</span>
                    <span className="text-sm text-gray-700">{item.closer_name}</span>
                  </div>
                )}
                {!item.tracker_name && !item.closer_name && (
                  <span className="text-xs text-gray-400">尚未指派</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <PostApprovalFormModal
          item={editingItem}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchData() }}
        />
      )}
    </div>
  )
}

function PostApprovalFormModal({ item, users, onClose, onSaved }: { item: PostApproval | null; users: User[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    brand: item?.brand || '',
    location: item?.location || '',
    category: item?.category || 'all',
    tracker_name: item?.tracker_name || '',
    tracker_phone: item?.tracker_phone || '',
    tracker_slack_id: item?.tracker_slack_id || '',
    closer_name: item?.closer_name || '',
    closer_phone: item?.closer_phone || '',
    closer_slack_id: item?.closer_slack_id || '',
  })
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const allLocations = form.brand
    ? [...LOCATIONS[form.brand as keyof typeof LOCATIONS] || [], ...HQ_DEPARTMENTS.map((d) => ({ value: d.value, label: `總部 - ${d.label}` }))]
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError('')
    try {
      const url = item ? `/api/post-approval/${item.id}` : '/api/post-approval'
      const method = item ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '儲存失敗'); return }
      onSaved()
    } catch { setError('儲存失敗') } finally { setIsSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{item ? '編輯追蹤與結案' : '新增追蹤與結案設定'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品牌 *</label>
              <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value, location: '' })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">請選擇</option>
                {BRANDS.map((b) => (<option key={b.value} value={b.value}>{b.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">門市/部門 *</label>
              <select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required disabled={!form.brand} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100">
                <option value="">請選擇</option>
                {allLocations.map((loc) => (<option key={loc.value} value={loc.value}>{loc.label}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">適用類別</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">全部類別</option>
              <option value="finance">財務費用</option>
              <option value="procurement">採購</option>
              <option value="hr">人事</option>
              <option value="operations">門市營運</option>
              <option value="marketing">行銷</option>
            </select>
          </div>
          <UserSelector
            label="追蹤人 — 審批全部通過後，負責追蹤執行進度"
            selectedName={form.tracker_name}
            users={users}
            colorClass="bg-amber-50"
            onChange={(name, phone, slackId) => setForm({ ...form, tracker_name: name, tracker_phone: phone, tracker_slack_id: slackId })}
          />
          <UserSelector
            label="結案人 — 執行完成後，負責確認結案"
            selectedName={form.closer_name}
            users={users}
            colorClass="bg-emerald-50"
            onChange={(name, phone, slackId) => setForm({ ...form, closer_name: name, closer_phone: phone, closer_slack_id: slackId })}
          />
          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">取消</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{isSaving ? '儲存中...' : '儲存'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
