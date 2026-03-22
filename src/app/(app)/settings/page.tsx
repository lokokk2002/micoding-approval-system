'use client'

import { useState, useEffect, useCallback } from 'react'
import { BRANDS, LOCATIONS, HQ_DEPARTMENTS, getLocationLabel, getBrandLabel } from '@/lib/constants'
import type { User, UserRole, Routing, PostApproval } from '@/types/database'

type SettingsTab = 'users' | 'routing' | 'post-approval'

// ============================================================
// Main Settings Page
// ============================================================
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users')

  const tabs = [
    { key: 'users' as SettingsTab, label: '用戶管理' },
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
    try {
      const url = user ? `/api/users/${user.id}` : '/api/users'
      const method = user ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
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
function RoutingManagement() {
  const [routes, setRoutes] = useState<Routing[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Routing | null>(null)

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

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此審批層級嗎？')) return
    await fetch(`/api/routing/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const grouped = routes.reduce<Record<string, Routing[]>>((acc, route) => {
    const key = `${route.brand}|${route.location}`
    if (!acc[key]) acc[key] = []
    acc[key].push(route)
    return acc
  }, {})

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-500">設定各品牌/門市的審批層級與審批人</p>
          <p className="text-xs text-gray-400 mt-1">每一層只需指定審批人，追蹤人與結案人在「追蹤與結案」分頁設定</p>
        </div>
        <button
          onClick={() => { setEditingRoute(null); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + 新增審批層級
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">載入中...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500 mb-2">尚未設定審批層級</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, routeGroup]) => {
            const [brand, location] = key.split('|')
            return (
              <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <span className="font-medium text-gray-900">{getBrandLabel(brand)}</span>
                  <span className="text-gray-400 mx-2">/</span>
                  <span className="text-gray-600">{getLocationLabel(location)}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {routeGroup.sort((a, b) => a.level - b.level).map((route) => (
                    <div key={route.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800">
                          第 {route.level} 層
                        </span>
                        {route.category !== 'all' && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{route.category}</span>
                        )}
                        {route.reviewer_name && (
                          <span className="text-sm text-gray-700">審批人：<strong>{route.reviewer_name}</strong></span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingRoute(route); setShowForm(true) }} className="text-sm text-blue-600 hover:text-blue-800 font-medium">編輯</button>
                        <button onClick={() => handleDelete(route.id)} className="text-sm text-red-600 hover:text-red-800 font-medium">刪除</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <RoutingFormModal
          route={editingRoute}
          users={users}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchData() }}
        />
      )}
    </div>
  )
}

function RoutingFormModal({ route, users, onClose, onSaved }: { route: Routing | null; users: User[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    brand: route?.brand || '',
    location: route?.location || '',
    category: route?.category || 'all',
    level: route?.level ?? 1,
    reviewer_name: route?.reviewer_name || '',
    reviewer_phone: route?.reviewer_phone || '',
    reviewer_slack_id: route?.reviewer_slack_id || '',
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
      const url = route ? `/api/routing/${route.id}` : '/api/routing'
      const method = route ? 'PUT' : 'POST'
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
          <h2 className="text-lg font-bold text-gray-900">{route ? '編輯審批層級' : '新增審批層級'}</h2>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">審批層級 *</label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value={1}>第 1 層</option>
                <option value={2}>第 2 層</option>
                <option value={3}>第 3 層</option>
              </select>
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
          </div>
          <UserSelector
            label="審批人"
            selectedName={form.reviewer_name}
            users={users}
            colorClass="bg-blue-50"
            onChange={(name, phone, slackId) => setForm({ ...form, reviewer_name: name, reviewer_phone: phone, reviewer_slack_id: slackId })}
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
