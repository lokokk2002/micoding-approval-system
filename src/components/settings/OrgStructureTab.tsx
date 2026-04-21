'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BRANDS, LOCATIONS, HQ_DEPARTMENTS,
  getBrandLabel, getLocationLabel, ORG_ROLE_LABELS,
} from '@/lib/constants'
import type { User, OrgStructure, OrgRole, Area } from '@/types/database'

const ORG_ROLE_ORDER: OrgRole[] = ['gm', 'dept_head', 'area_manager', 'store_manager', 'staff']
const ROLE_COLORS: Record<OrgRole, string> = {
  gm: 'bg-purple-100 text-purple-700',
  dept_head: 'bg-indigo-100 text-indigo-700',
  area_manager: 'bg-blue-100 text-blue-700',
  store_manager: 'bg-cyan-100 text-cyan-700',
  staff: 'bg-gray-100 text-gray-600',
}

export default function OrgStructureTab() {
  const [items, setItems] = useState<OrgStructure[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<OrgStructure | null>(null)
  const [filterBrand, setFilterBrand] = useState('')
  const [filterRole, setFilterRole] = useState<OrgRole | ''>('')
  const [filterActive, setFilterActive] = useState<'active' | 'inactive' | 'all'>('active')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ active: filterActive })
      if (filterBrand) qs.set('brand', filterBrand)
      if (filterRole) qs.set('role', filterRole)
      const [oRes, uRes, aRes] = await Promise.all([
        fetch(`/api/org-structure?${qs.toString()}`),
        fetch('/api/users'),
        fetch('/api/areas'),
      ])
      const [oData, uData, aData] = await Promise.all([oRes.json(), uRes.json(), aRes.json()])
      setItems(oData.items || [])
      setUsers(uData.users || [])
      setAreas(aData.items || [])
    } finally { setLoading(false) }
  }, [filterBrand, filterRole, filterActive])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleToggle = async (item: OrgStructure) => {
    await fetch(`/api/org-structure/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    fetchAll()
  }

  const grouped = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const ra = ORG_ROLE_ORDER.indexOf(a.org_role)
      const rb = ORG_ROLE_ORDER.indexOf(b.org_role)
      if (ra !== rb) return ra - rb
      return a.user_name.localeCompare(b.user_name)
    })
    return sorted
  }, [items])

  return (
    <div>
      <div className="flex flex-wrap justify-between items-end mb-4 gap-3">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">品牌</label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">全部</option>
              {BRANDS.map((b) => (<option key={b.value} value={b.value}>{b.label}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">角色</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as OrgRole | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">全部</option>
              {ORG_ROLE_ORDER.map((r) => (
                <option key={r} value={r}>{ORG_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">狀態</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'active' | 'inactive' | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="active">啟用</option>
              <option value="inactive">停用</option>
              <option value="all">全部</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + 新增人員
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">載入中...</div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400">尚未新增人員</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">姓名</th>
                <th className="px-4 py-3 text-left">角色</th>
                <th className="px-4 py-3 text-left">品牌</th>
                <th className="px-4 py-3 text-left">部門</th>
                <th className="px-4 py-3 text-left">門市</th>
                <th className="px-4 py-3 text-left">區域</th>
                <th className="px-4 py-3 text-left">狀態</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {grouped.map((item) => (
                <tr key={item.id} className={item.is_active ? 'hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400'}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.user_name}</p>
                    {item.user_phone && <p className="text-xs text-gray-400">{item.user_phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[item.org_role]}`}>
                      {ORG_ROLE_LABELS[item.org_role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.brand ? getBrandLabel(item.brand) : '—'}</td>
                  <td className="px-4 py-3">{item.department ? getDepartmentLabel(item.department) : '—'}</td>
                  <td className="px-4 py-3">{item.location ? getLocationLabel(item.location) : '—'}</td>
                  <td className="px-4 py-3">{item.area || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {item.is_active ? '啟用' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { setEditing(item); setShowForm(true) }}
                      className="text-sm text-blue-600 hover:text-blue-800 mr-3"
                    >
                      編輯
                    </button>
                    <button
                      onClick={() => handleToggle(item)}
                      className={`text-sm ${item.is_active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                    >
                      {item.is_active ? '停用' : '啟用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <OrgFormModal
          editing={editing}
          users={users}
          areas={areas}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchAll() }}
        />
      )}
    </div>
  )
}

function getDepartmentLabel(code: string): string {
  const found = HQ_DEPARTMENTS.find((d) => d.value === code)
  return found ? found.label : code
}

function OrgFormModal({
  editing, users, areas, onClose, onSaved,
}: {
  editing: OrgStructure | null
  users: User[]
  areas: Area[]
  onClose: () => void
  onSaved: () => void
}) {
  const isEditing = !!editing
  const [userId, setUserId] = useState(editing?.user_id || '')
  const [userName, setUserName] = useState(editing?.user_name || '')
  const [userPhone, setUserPhone] = useState(editing?.user_phone || '')
  const [userSlackId, setUserSlackId] = useState(editing?.user_slack_id || '')
  const [orgRole, setOrgRole] = useState<OrgRole | ''>(editing?.org_role || '')
  const [brand, setBrand] = useState(editing?.brand || '')
  const [department, setDepartment] = useState(editing?.department || '')
  const [location, setLocation] = useState(editing?.location || '')
  const [area, setArea] = useState(editing?.area || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const storeLocations = brand ? LOCATIONS[brand as keyof typeof LOCATIONS] || [] : []
  const brandAreas = areas.filter((a) => a.brand === brand)

  // user dropdown → auto-populate name/phone/slack
  const handleUserSelect = (uid: string) => {
    setUserId(uid)
    const u = users.find((x) => x.id === uid)
    if (u) {
      setUserName(u.name)
      setUserPhone(u.phone)
      setUserSlackId(u.slack_id || '')
    }
  }

  const requireLocation = orgRole === 'store_manager'
  const requireArea = orgRole === 'area_manager'
  const requireDepartment = orgRole === 'dept_head'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const body = {
        user_id: userId || null,
        user_name: userName,
        user_phone: userPhone || null,
        user_slack_id: userSlackId || null,
        org_role: orgRole,
        brand: brand || null,
        department: department || null,
        location: location || null,
        area: area || null,
      }
      const url = isEditing ? `/api/org-structure/${editing.id}` : '/api/org-structure'
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '儲存失敗'); return }
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? '編輯人員' : '新增人員'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">從用戶清單選擇</label>
              <select
                value={userId}
                onChange={(e) => handleUserSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">（選填，或手動輸入姓名）</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} · {u.phone}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">角色 *</label>
              <select
                value={orgRole}
                onChange={(e) => setOrgRole(e.target.value as OrgRole | '')}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">請選擇</option>
                {ORG_ROLE_ORDER.slice().reverse().map((r) => (
                  <option key={r} value={r}>{ORG_ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">電話</label>
              <input
                type="text"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slack ID</label>
              <input
                type="text"
                value={userSlackId}
                onChange={(e) => setUserSlackId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品牌 *</label>
            <select
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setLocation(''); setArea('') }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">請選擇</option>
              {BRANDS.map((b) => (<option key={b.value} value={b.value}>{b.label}</option>))}
            </select>
          </div>

          {/* 動態依角色顯示必填欄位 */}
          {(orgRole === 'staff' || orgRole === 'store_manager') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                門市 {requireLocation && <span className="text-red-500">*</span>}
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required={requireLocation}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">（總部人員請選部門）</option>
                {storeLocations.map((loc) => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>
          )}

          {(orgRole === 'staff' || orgRole === 'dept_head') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                部門 {requireDepartment && <span className="text-red-500">*</span>}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required={requireDepartment}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">（門市人員請選門市）</option>
                {HQ_DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {(orgRole === 'staff' || orgRole === 'store_manager' || orgRole === 'area_manager') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                區域 {requireArea && <span className="text-red-500">*</span>}
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required={requireArea}
                disabled={brandAreas.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              >
                <option value="">{brandAreas.length === 0 ? '（該品牌尚未定義區域）' : '請選擇'}</option>
                {brandAreas.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
              {brandAreas.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">請先到「區域」分頁定義區域</p>
              )}
            </div>
          )}

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">取消</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
