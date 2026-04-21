'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { BRANDS, LOCATIONS, HQ_DEPARTMENTS, REQUEST_CATEGORIES, REQUEST_TYPES, ROLE_AVAILABLE_CATEGORIES } from '@/lib/constants'
import type { Brand, RequestCategory, RequestType, OrgStructure } from '@/types/database'

interface SupplyItem {
  name: string
  quantity: string
}

export default function ApplyPage() {
  const { user } = useAuth()
  const [brand, setBrand] = useState<Brand | ''>('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState<RequestCategory | ''>('')
  const [type, setType] = useState<RequestType | ''>('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [reason, setReason] = useState('')
  const [formData, setFormData] = useState<Record<string, string | number | SupplyItem[]>>({})
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)
  const [orgRecord, setOrgRecord] = useState<OrgStructure | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)

  // 載入申請人組織歸屬 → 自動帶入 brand / location
  useEffect(() => {
    if (!user) return
    let cancel = false
    ;(async () => {
      try {
        const res = await fetch(`/api/org-structure/me?phone=${encodeURIComponent(user.phone)}`)
        const data = await res.json()
        if (cancel) return
        const org: OrgStructure | null = data.item || null
        setOrgRecord(org)
        if (org) {
          if (org.brand) setBrand(org.brand as Brand)
          if (org.location) setLocation(org.location)
          else if (org.department) setLocation(org.department)
        }
      } finally {
        if (!cancel) setOrgLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [user])

  // 判斷身份類型（優先用 org record）
  const getIdentityType = (): string => {
    if (orgRecord) {
      if (orgRecord.department) {
        const d = orgRecord.department
        if (d === 'hr') return 'hr'
        if (d === 'marketing' || d === 'content') return 'marketing'
        if (d === 'finance' || d === 'operations' || d === 'cs') return 'finance'
      }
      if (orgRecord.location) return 'store'
    }
    if (!location) return 'store'
    if (location === 'hr') return 'hr'
    if (location === 'marketing' || location === 'content') return 'marketing'
    if (location === 'finance' || location === 'operations' || location === 'cs') return 'finance'
    return 'store'
  }

  const identityType = getIdentityType()
  const isOrgLocked = !!orgRecord // 組織歸屬已登記 → 品牌/單位鎖定
  const availableCategories = ROLE_AVAILABLE_CATEGORIES[identityType] || []

  const locationOptions = brand
    ? [
        ...LOCATIONS[brand as keyof typeof LOCATIONS],
        ...HQ_DEPARTMENTS.map((d) => ({ value: d.value, label: `總部 - ${d.label}` })),
      ]
    : []

  const categoryOptions = REQUEST_CATEGORIES.filter((c) => availableCategories.includes(c.value))
  const typeOptions = category ? REQUEST_TYPES[category] || [] : []

  const updateFormData = (key: string, value: string | number | SupplyItem[]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !brand || !location || !category || !type) return

    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          type,
          brand,
          location,
          applicant_name: user.name,
          applicant_phone: user.phone,
          applicant_email: user.email || '',
          form_data: { ...formData, reason },
          is_urgent: isUrgent,
          attachments: [],
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSubmitResult({ success: true, message: `申請已送出！單號：${data.request_number}` })
        // Reset form
        setCategory('')
        setType('')
        setIsUrgent(false)
        setReason('')
        setFormData({})
        setAttachments([])
      } else {
        setSubmitResult({ success: false, message: data.error || '送出失敗' })
      }
    } catch {
      setSubmitResult({ success: false, message: '送出失敗，請稍後再試' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 動態渲染表單欄位
  const renderFormFields = () => {
    if (!type) return null

    switch (type) {
      case 'expense_report':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">發票/收據照片 *</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">支援 AI 自動辨識金額與科目</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">費用類別 *</label>
              <select
                value={(formData.expense_category as string) || ''}
                onChange={(e) => updateFormData('expense_category', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">請選擇</option>
                <option value="交通">交通</option>
                <option value="餐費">餐費</option>
                <option value="住宿">住宿</option>
                <option value="通訊">通訊</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">金額 *</label>
              <input
                type="number"
                value={(formData.amount as string) || ''}
                onChange={(e) => updateFormData('amount', e.target.value)}
                required
                placeholder="請輸入金額"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">發生日期 *</label>
              <input
                type="date"
                value={(formData.expense_date as string) || ''}
                onChange={(e) => updateFormData('expense_date', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">廠商</label>
              <input
                type="text"
                value={(formData.vendor as string) || ''}
                onChange={(e) => updateFormData('vendor', e.target.value)}
                placeholder="廠商名稱（選填）"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'cash_advance':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用途說明 *</label>
              <textarea
                value={(formData.purpose as string) || ''}
                onChange={(e) => updateFormData('purpose', e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">預計金額 *</label>
              <input
                type="number"
                value={(formData.amount as string) || ''}
                onChange={(e) => updateFormData('amount', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">預計使用日期 *</label>
              <input
                type="date"
                value={(formData.expected_date as string) || ''}
                onChange={(e) => updateFormData('expected_date', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'over_budget':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">原預算項目 *</label>
              <input
                type="text"
                value={(formData.original_item as string) || ''}
                onChange={(e) => updateFormData('original_item', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">超支金額 *</label>
              <input
                type="number"
                value={(formData.over_amount as string) || ''}
                onChange={(e) => updateFormData('over_amount', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">超支原因 *</label>
              <textarea
                value={(formData.over_reason as string) || ''}
                onChange={(e) => updateFormData('over_reason', e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'purchase_general':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報價單照片</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">支援 AI 自動辨識</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">品項名稱 *</label>
              <input
                type="text"
                value={(formData.item_name as string) || ''}
                onChange={(e) => updateFormData('item_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">數量 *</label>
                <input
                  type="number"
                  value={(formData.quantity as string) || ''}
                  onChange={(e) => updateFormData('quantity', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">預估單價 *</label>
                <input
                  type="number"
                  value={(formData.unit_price as string) || ''}
                  onChange={(e) => updateFormData('unit_price', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">預估總額</label>
                <input
                  type="number"
                  value={Number(formData.quantity || 0) * Number(formData.unit_price || 0)}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">需求日期 *</label>
              <input
                type="date"
                value={(formData.needed_by as string) || ''}
                onChange={(e) => updateFormData('needed_by', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'purchase_equipment':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">報價單照片</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">支援 AI 自動辨識</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">設備名稱 *</label>
              <input
                type="text"
                value={(formData.equipment_name as string) || ''}
                onChange={(e) => updateFormData('equipment_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">規格型號 *</label>
              <input
                type="text"
                value={(formData.spec_model as string) || ''}
                onChange={(e) => updateFormData('spec_model', e.target.value)}
                required
                placeholder="品牌/型號/規格"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">數量 *</label>
                <input
                  type="number"
                  value={(formData.quantity as string) || ''}
                  onChange={(e) => updateFormData('quantity', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">預估金額 *</label>
                <input
                  type="number"
                  value={(formData.estimated_amount as string) || ''}
                  onChange={(e) => updateFormData('estimated_amount', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">廠商建議</label>
              <input
                type="text"
                value={(formData.vendor_suggestion as string) || ''}
                onChange={(e) => updateFormData('vendor_suggestion', e.target.value)}
                placeholder="建議的供應商（選填）"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">需求日期 *</label>
              <input
                type="date"
                value={(formData.needed_by as string) || ''}
                onChange={(e) => updateFormData('needed_by', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'recruitment':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">職位名稱 *</label>
              <input
                type="text"
                value={(formData.position as string) || ''}
                onChange={(e) => updateFormData('position', e.target.value)}
                required
                placeholder="例：私人教練、筋膜治療師"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">需求人數 *</label>
              <input
                type="number"
                value={(formData.headcount as string) || ''}
                onChange={(e) => updateFormData('headcount', e.target.value)}
                required
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">工作內容摘要 *</label>
              <textarea
                value={(formData.job_description as string) || ''}
                onChange={(e) => updateFormData('job_description', e.target.value)}
                required
                rows={3}
                placeholder="請簡述主要工作職責"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期望到職日 *</label>
              <input
                type="date"
                value={(formData.expected_onboard as string) || ''}
                onChange={(e) => updateFormData('expected_onboard', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'promotion':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">被提報人姓名 *</label>
              <input
                type="text"
                value={(formData.employee_name as string) || ''}
                onChange={(e) => updateFormData('employee_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">現職 *</label>
                <input
                  type="text"
                  value={(formData.current_position as string) || ''}
                  onChange={(e) => updateFormData('current_position', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">建議新職 *</label>
                <input
                  type="text"
                  value={(formData.proposed_position as string) || ''}
                  onChange={(e) => updateFormData('proposed_position', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">現薪</label>
                <input
                  type="number"
                  value={(formData.current_salary as string) || ''}
                  onChange={(e) => updateFormData('current_salary', e.target.value)}
                  placeholder="選填"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">建議新薪</label>
                <input
                  type="number"
                  value={(formData.proposed_salary as string) || ''}
                  onChange={(e) => updateFormData('proposed_salary', e.target.value)}
                  placeholder="選填"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">推薦理由 *</label>
              <textarea
                value={(formData.recommendation as string) || ''}
                onChange={(e) => updateFormData('recommendation', e.target.value)}
                required
                rows={3}
                placeholder="請說明升職/調薪的理由"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'resignation':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">離職人員姓名 *</label>
              <input
                type="text"
                value={(formData.employee_name as string) || ''}
                onChange={(e) => updateFormData('employee_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">預計最後工作日 *</label>
              <input
                type="date"
                value={(formData.last_work_date as string) || ''}
                onChange={(e) => updateFormData('last_work_date', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">交接事項 *</label>
              <textarea
                value={(formData.handover_note as string) || ''}
                onChange={(e) => updateFormData('handover_note', e.target.value)}
                required
                rows={4}
                placeholder="請列出需要交接的工作事項"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'equipment_repair':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">設備名稱 *</label>
              <input
                type="text"
                value={(formData.equipment_name as string) || ''}
                onChange={(e) => updateFormData('equipment_name', e.target.value)}
                required
                placeholder="例：跑步機、按摩椅"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">故障描述 *</label>
              <textarea
                value={(formData.fault_description as string) || ''}
                onChange={(e) => updateFormData('fault_description', e.target.value)}
                required
                rows={3}
                placeholder="請描述設備故障的現象"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">急迫程度 *</label>
              <select
                value={(formData.urgency as string) || ''}
                onChange={(e) => updateFormData('urgency', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">請選擇</option>
                <option value="low">低 - 不影響營業</option>
                <option value="medium">中 - 部分影響</option>
                <option value="high">高 - 嚴重影響營業</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">故障照片</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </>
        )

      case 'supply_restock':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">補貨品項 *</label>
              {((formData.items as SupplyItem[]) || [{ name: '', quantity: '' }]).map((item, idx) => (
                <div key={idx} className="flex gap-3 mb-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const items = [...((formData.items as SupplyItem[]) || [{ name: '', quantity: '' }])]
                      items[idx] = { ...items[idx], name: e.target.value }
                      updateFormData('items', items)
                    }}
                    placeholder="品項名稱"
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) => {
                      const items = [...((formData.items as SupplyItem[]) || [{ name: '', quantity: '' }])]
                      items[idx] = { ...items[idx], quantity: e.target.value }
                      updateFormData('items', items)
                    }}
                    placeholder="數量"
                    required
                    className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const items = [...((formData.items as SupplyItem[]) || [])]
                        items.splice(idx, 1)
                        updateFormData('items', items)
                      }}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const items = [...((formData.items as SupplyItem[]) || [{ name: '', quantity: '' }])]
                  items.push({ name: '', quantity: '' })
                  updateFormData('items', items)
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + 新增品項
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">需求日期 *</label>
              <input
                type="date"
                value={(formData.needed_by as string) || ''}
                onChange={(e) => updateFormData('needed_by', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'complaint_auth':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客戶姓名/會員編號 *</label>
              <input
                type="text"
                value={(formData.customer_name as string) || ''}
                onChange={(e) => updateFormData('customer_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">客訴內容 *</label>
              <textarea
                value={(formData.complaint_content as string) || ''}
                onChange={(e) => updateFormData('complaint_content', e.target.value)}
                required
                rows={3}
                placeholder="請詳述客訴事件經過"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">建議處理方式 *</label>
              <textarea
                value={(formData.proposed_solution as string) || ''}
                onChange={(e) => updateFormData('proposed_solution', e.target.value)}
                required
                rows={2}
                placeholder="例：退費、補課、折扣"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">涉及金額</label>
              <input
                type="number"
                value={(formData.compensation_amount as string) || ''}
                onChange={(e) => updateFormData('compensation_amount', e.target.value)}
                placeholder="若有金額補償請填寫"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'event_proposal':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">活動名稱 *</label>
              <input
                type="text"
                value={(formData.event_name as string) || ''}
                onChange={(e) => updateFormData('event_name', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">起迄日期 *</label>
              <input
                type="text"
                value={(formData.date_range as string) || ''}
                onChange={(e) => updateFormData('date_range', e.target.value)}
                required
                placeholder="例：2026/04/01 - 2026/04/30"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">活動內容 *</label>
              <textarea
                value={(formData.event_description as string) || ''}
                onChange={(e) => updateFormData('event_description', e.target.value)}
                required
                rows={3}
                placeholder="請描述活動/促銷方案的內容"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">預估費用</label>
              <input
                type="number"
                value={(formData.estimated_cost as string) || ''}
                onChange={(e) => updateFormData('estimated_cost', e.target.value)}
                placeholder="選填"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'ad_budget':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">投放平台 *</label>
              <select
                value={(formData.platform as string) || ''}
                onChange={(e) => updateFormData('platform', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">請選擇</option>
                <option value="facebook">Facebook / Instagram</option>
                <option value="google">Google Ads</option>
                <option value="tiktok">TikTok</option>
                <option value="line">LINE LAP</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">投放期間 *</label>
              <input
                type="text"
                value={(formData.ad_period as string) || ''}
                onChange={(e) => updateFormData('ad_period', e.target.value)}
                required
                placeholder="例：2026/04/01 - 2026/04/30"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">預算金額 *</label>
              <input
                type="number"
                value={(formData.budget_amount as string) || ''}
                onChange={(e) => updateFormData('budget_amount', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">投放目標 *</label>
              <textarea
                value={(formData.objective as string) || ''}
                onChange={(e) => updateFormData('objective', e.target.value)}
                required
                rows={2}
                placeholder="例：獲客、品牌曝光、促銷導流"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </>
        )

      case 'kol_collaboration':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">合作對象 *</label>
              <input
                type="text"
                value={(formData.partner_name as string) || ''}
                onChange={(e) => updateFormData('partner_name', e.target.value)}
                required
                placeholder="KOL / 外部合作方名稱"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">合作內容 *</label>
              <textarea
                value={(formData.collaboration_content as string) || ''}
                onChange={(e) => updateFormData('collaboration_content', e.target.value)}
                required
                rows={3}
                placeholder="請描述合作方式與內容"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">費用 *</label>
                <input
                  type="number"
                  value={(formData.fee as string) || ''}
                  onChange={(e) => updateFormData('fee', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">合約期間 *</label>
                <input
                  type="text"
                  value={(formData.contract_period as string) || ''}
                  onChange={(e) => updateFormData('contract_period', e.target.value)}
                  required
                  placeholder="例：3個月"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </>
        )

      case 'content_approval':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">內容類型 *</label>
              <select
                value={(formData.content_type as string) || ''}
                onChange={(e) => updateFormData('content_type', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">請選擇</option>
                <option value="image">圖文</option>
                <option value="video">影片</option>
                <option value="story">限時動態</option>
                <option value="article">文章</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">發布平台 *</label>
              <select
                value={(formData.publish_platform as string) || ''}
                onChange={(e) => updateFormData('publish_platform', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">請選擇</option>
                <option value="ig">Instagram</option>
                <option value="fb">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="threads">Threads</option>
                <option value="website">官網</option>
                <option value="line">LINE OA</option>
                <option value="multiple">多平台</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">預計發布日 *</label>
              <input
                type="date"
                value={(formData.publish_date as string) || ''}
                onChange={(e) => updateFormData('publish_date', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">內容摘要 *</label>
              <textarea
                value={(formData.content_summary as string) || ''}
                onChange={(e) => updateFormData('content_summary', e.target.value)}
                required
                rows={3}
                placeholder="請簡述內容主題與重點"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">素材附件</label>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </>
        )
    }
  }

  // 計算當前步驟
  const currentStep = (() => {
    if (isSubmitting) return 4
    if (brand && location && type) return 3
    if (brand && location) return 2
    return 1
  })()

  const steps = [
    { number: 1, label: '基礎資訊', description: '選擇品牌與單位' },
    { number: 2, label: '選擇類型', description: '選擇申請類別與類型' },
    { number: 3, label: '填寫表單', description: '填寫申請內容' },
    { number: 4, label: '確認送出', description: '確認並送出' },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">發起申請</h1>

      {/* 步驟進度指示器 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1 last:flex-initial">
              {/* 步驟圓圈與標籤 */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    step.number < currentStep
                      ? 'bg-green-500 border-green-500 text-white'
                      : step.number === currentStep
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {step.number < currentStep ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap ${
                    step.number < currentStep
                      ? 'text-green-600'
                      : step.number === currentStep
                        ? 'text-blue-600'
                        : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
                <span
                  className={`text-[10px] whitespace-nowrap ${
                    step.number < currentStep
                      ? 'text-green-500'
                      : step.number === currentStep
                        ? 'text-blue-500'
                        : 'text-gray-300'
                  }`}
                >
                  {step.description}
                </span>
              </div>
              {/* 連接線 */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-1.75rem] ${
                    step.number < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {submitResult && (
        <div className={`mb-6 p-4 rounded-lg ${submitResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {submitResult.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {/* 基礎資訊 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              value={user?.name || ''}
              readOnly
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手機</label>
            <input
              type="text"
              value={user?.phone || ''}
              readOnly
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50"
            />
          </div>
        </div>

        {/* 組織歸屬檢查 */}
        {!orgLoading && !orgRecord && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-medium">尚未設定您的組織歸屬</p>
            <p className="text-xs text-amber-800 mt-1">請聯繫管理員在「系統設定 → 組織架構」為您新增記錄（角色 / 品牌 / 單位），設定完成後才能送出申請。</p>
          </div>
        )}

        {/* 品牌選擇（有 org record 時自動帶入並鎖定） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            所屬品牌 *
            {isOrgLocked && <span className="ml-2 text-xs text-gray-400">（已由組織歸屬帶入）</span>}
          </label>
          <div className="flex gap-4">
            {BRANDS.map((b) => (
              <label key={b.value} className={`flex items-center gap-2 ${isOrgLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="brand"
                  value={b.value}
                  checked={brand === b.value}
                  disabled={isOrgLocked}
                  onChange={(e) => {
                    setBrand(e.target.value as Brand)
                    setLocation('')
                    setCategory('')
                    setType('')
                  }}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{b.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 所屬單位 */}
        {brand && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所屬單位 *
              {isOrgLocked && <span className="ml-2 text-xs text-gray-400">（已由組織歸屬帶入）</span>}
            </label>
            <select
              value={location}
              disabled={isOrgLocked}
              onChange={(e) => {
                setLocation(e.target.value)
                setCategory('')
                setType('')
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">請選擇</option>
              <optgroup label="門市">
                {LOCATIONS[brand as keyof typeof LOCATIONS].map((loc) => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </optgroup>
              <optgroup label="總部">
                {HQ_DEPARTMENTS.map((dept) => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        {/* 身份提示 */}
        {location && (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              identityType === 'finance' ? 'bg-purple-100 text-purple-800' :
              identityType === 'hr' ? 'bg-green-100 text-green-800' :
              identityType === 'marketing' ? 'bg-orange-100 text-orange-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {identityType === 'store' ? '門市人員' :
               identityType === 'hr' ? 'HR / 人事' :
               identityType === 'marketing' ? '行銷部' :
               '財務 / 行政'}
            </span>
            <span className="text-xs text-gray-500">
              可用 {categoryOptions.reduce((sum, cat) => sum + (REQUEST_TYPES[cat.value as keyof typeof REQUEST_TYPES]?.length || 0), 0)} 種表單
            </span>
          </div>
        )}

        {/* 申請類型 */}
        {location && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申請類別 *</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as RequestCategory)
                setType('')
                setFormData({})
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">請選擇類別</option>
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        )}

        {category && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申請類型 *</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as RequestType)
                setFormData({})
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">請選擇類型</option>
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} {t.hasAI ? '(AI)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 急件開關 */}
        {type && (
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
            <span className="text-sm font-medium text-gray-700">急件申請</span>
            {isUrgent && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                急件將立即通知審批人並置頂顯示，非緊急事項請勿使用
              </span>
            )}
          </div>
        )}

        {/* 申請事由 */}
        {type && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">申請事由 *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="請說明申請原因"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* 動態表單欄位 */}
        {renderFormFields()}

        {/* 附件上傳 */}
        {type && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">附件</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => e.target.files && setAttachments([...attachments, ...Array.from(e.target.files)])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}
                      className="text-red-500 hover:text-red-700"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 送出按鈕 */}
        {type && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '送出中...' : '送出申請'}
          </button>
        )}
      </form>
    </div>
  )
}
