'use client'

import { useState, useEffect, useCallback } from 'react'
import { BRANDS, LOCATIONS, getBrandLabel, getLocationLabel } from '@/lib/constants'
import type { Area } from '@/types/database'

export default function AreasTab() {
  const [items, setItems] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Area | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/areas')
      const data = await res.json()
      setItems(data.items || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDelete = async (area: Area) => {
    if (!confirm(`確定刪除區域「${area.name}」？所屬人員的區域欄位會被清空`)) return
    await fetch(`/api/areas/${area.id}`, { method: 'DELETE' })
    fetchAll()
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <p className="text-sm text-gray-500">定義區域名稱 + 包含哪些門市，供區主管路由使用</p>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + 新增區域
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">載入中...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-400">尚未定義任何區域</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{a.name}</span>
                  <span className="text-xs text-gray-400">· {getBrandLabel(a.brand)}</span>
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                    {a.location_codes.length} 間門市
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setEditing(a); setShowForm(true) }} className="text-sm text-blue-600 hover:text-blue-800 font-medium">編輯</button>
                  <button onClick={() => handleDelete(a)} className="text-sm text-red-600 hover:text-red-800 font-medium">刪除</button>
                </div>
              </div>
              <div className="px-4 py-3">
                {a.location_codes.length === 0 ? (
                  <p className="text-sm text-gray-400">尚未指派門市</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {a.location_codes.map((c) => (
                      <span key={c} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                        {getLocationLabel(c)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AreaFormModal
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchAll() }}
        />
      )}
    </div>
  )
}

function AreaFormModal({
  editing, onClose, onSaved,
}: {
  editing: Area | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEditing = !!editing
  const [brand, setBrand] = useState(editing?.brand || '')
  const [name, setName] = useState(editing?.name || '')
  const [selected, setSelected] = useState<Set<string>>(new Set(editing?.location_codes || []))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const storeLocations = brand ? LOCATIONS[brand as keyof typeof LOCATIONS] || [] : []

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code); else next.add(code)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const body = { brand, name, location_codes: Array.from(selected) }
      const url = isEditing ? `/api/areas/${editing.id}` : '/api/areas'
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
          <h2 className="text-lg font-bold text-gray-900">{isEditing ? '編輯區域' : '新增區域'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品牌 *</label>
              <select
                value={brand}
                onChange={(e) => { setBrand(e.target.value); setSelected(new Set()) }}
                required
                disabled={isEditing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              >
                <option value="">請選擇</option>
                {BRANDS.map((b) => (<option key={b.value} value={b.value}>{b.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">區域名稱 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="例：台南區 / 高雄區"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              包含門市 <span className="text-xs text-gray-400">（{selected.size} 間已選）</span>
            </label>
            <div className="border border-gray-200 rounded-lg max-h-[240px] overflow-y-auto p-2 bg-gray-50">
              {storeLocations.length === 0 ? (
                <p className="text-sm text-gray-400 p-3 text-center">請先選擇品牌</p>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {storeLocations.map((loc) => (
                    <label key={loc.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.has(loc.value)}
                        onChange={() => toggle(loc.value)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{loc.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

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
