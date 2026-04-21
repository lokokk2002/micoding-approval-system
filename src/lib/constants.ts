export const BRANDS = [
  { value: 'double_fitness', label: '倍速運動' },
  { value: 'rechill', label: '放筋鬆 ReChill' },
] as const

export const LOCATIONS = {
  double_fitness: [
    { value: 'df_hq', label: '倍速總部' },
    { value: 'df_store_01', label: '倍速門市1' },
    { value: 'df_store_02', label: '倍速門市2' },
    { value: 'df_store_03', label: '倍速門市3' },
    { value: 'df_store_04', label: '倍速門市4' },
    { value: 'df_store_05', label: '倍速門市5' },
    { value: 'df_store_06', label: '倍速門市6' },
    { value: 'df_store_07', label: '倍速門市7' },
    { value: 'df_store_08', label: '倍速門市8' },
    { value: 'df_store_09', label: '倍速門市9' },
    { value: 'df_store_10', label: '倍速門市10' },
    { value: 'df_store_11', label: '倍速門市11' },
    { value: 'df_store_12', label: '倍速門市12' },
    { value: 'df_store_13', label: '倍速門市13' },
    { value: 'df_store_14', label: '倍速門市14' },
    { value: 'df_store_15', label: '倍速門市15' },
  ],
  rechill: [
    { value: 'rc_hq', label: '放筋鬆總部' },
    { value: 'rc_store_01', label: '放筋鬆門市1' },
    { value: 'rc_store_02', label: '放筋鬆門市2' },
    { value: 'rc_store_03', label: '放筋鬆門市3' },
    { value: 'rc_store_04', label: '放筋鬆門市4' },
    { value: 'rc_store_05', label: '放筋鬆門市5' },
    { value: 'rc_store_06', label: '放筋鬆門市6' },
    { value: 'rc_store_07', label: '放筋鬆門市7' },
    { value: 'rc_store_08', label: '放筋鬆門市8' },
    { value: 'rc_store_09', label: '放筋鬆門市9' },
    { value: 'rc_store_10', label: '放筋鬆門市10' },
    { value: 'rc_store_11', label: '放筋鬆門市11' },
    { value: 'rc_store_12', label: '放筋鬆門市12' },
    { value: 'rc_store_13', label: '放筋鬆門市13' },
  ],
} as const

// 總部部門
export const HQ_DEPARTMENTS = [
  { value: 'marketing', label: '行銷部' },
  { value: 'cs', label: '客服部' },
  { value: 'operations', label: '營運部' },
  { value: 'hr', label: '人資部' },
  { value: 'finance', label: '財務行政' },
  { value: 'content', label: '內容部' },
] as const

export const REQUEST_CATEGORIES = [
  { value: 'finance', label: '財務費用' },
  { value: 'procurement', label: '採購' },
  { value: 'hr', label: '人事' },
  { value: 'operations', label: '門市營運' },
  { value: 'marketing', label: '行銷' },
] as const

export const REQUEST_TYPES = {
  finance: [
    { value: 'expense_report', label: '費用報銷', hasAI: true },
    { value: 'cash_advance', label: '現金墊款', hasAI: false },
    { value: 'over_budget', label: '預算外支出', hasAI: false },
  ],
  procurement: [
    { value: 'purchase_general', label: '一般採購', hasAI: true },
    { value: 'purchase_equipment', label: '設備採購', hasAI: true },
  ],
  hr: [
    { value: 'recruitment', label: '招募需求', hasAI: false },
    { value: 'promotion', label: '升職/調薪', hasAI: false },
    { value: 'resignation', label: '離職申請', hasAI: false },
  ],
  operations: [
    { value: 'equipment_repair', label: '設備維修', hasAI: false },
    { value: 'supply_restock', label: '耗材補貨', hasAI: false },
    { value: 'complaint_auth', label: '客訴處理授權', hasAI: false },
    { value: 'event_proposal', label: '活動/促銷方案', hasAI: false },
  ],
  marketing: [
    { value: 'ad_budget', label: '廣告預算', hasAI: false },
    { value: 'kol_collaboration', label: 'KOL/外部合作', hasAI: false },
    { value: 'content_approval', label: '素材上架授權', hasAI: false },
  ],
} as const

// 依身份篩選可用類型
export const ROLE_AVAILABLE_CATEGORIES: Record<string, string[]> = {
  store: ['finance', 'procurement', 'operations'], // 門市人員: 費用報銷 + 採購(2) + 門市營運(4) = 7種
  hr: ['finance', 'procurement', 'hr'],             // HR: 財務(3) + 採購(2) + 人事(3) = 8種
  marketing: ['finance', 'procurement', 'marketing'], // 行銷: 財務(3) + 採購(2) + 行銷(3) = 8種
  finance: ['finance', 'procurement', 'hr', 'operations', 'marketing'], // 財務/行政: 全部15種
}

// 門市/部門名稱對照（統一查詢函數）
const LOCATION_LABEL_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const brand of Object.keys(LOCATIONS) as Array<keyof typeof LOCATIONS>) {
    for (const loc of LOCATIONS[brand]) {
      map[loc.value] = loc.label
    }
  }
  for (const dept of HQ_DEPARTMENTS) {
    map[dept.value] = `總部 - ${dept.label}`
  }
  return map
})()

export function getLocationLabel(locationValue: string): string {
  return LOCATION_LABEL_MAP[locationValue] || locationValue
}

export function getBrandLabel(brandValue: string): string {
  const found = BRANDS.find((b) => b.value === brandValue)
  return found ? found.label : brandValue
}

// 單號類型碼
export const TYPE_CODES: Record<string, string> = {
  expense_report: 'ER',
  cash_advance: 'CA',
  over_budget: 'OB',
  purchase_general: 'PG',
  purchase_equipment: 'PE',
  recruitment: 'RC',
  promotion: 'PM',
  resignation: 'RS',
  equipment_repair: 'EP',
  supply_restock: 'SR',
  complaint_auth: 'CP',
  event_proposal: 'EV',
  ad_budget: 'AB',
  kol_collaboration: 'KL',
  content_approval: 'CT',
}

// 表單欄位中文對照 + 類型
export const FIELD_LABELS: Record<string, string> = {
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

export const MONEY_FIELD_KEYS = new Set([
  'amount', 'over_amount', 'unit_price', 'total_price', 'estimated_amount',
  'current_salary', 'proposed_salary', 'compensation_amount', 'estimated_cost',
  'budget_amount', 'fee',
])

export const TYPE_LABELS: Record<string, string> = {
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

export const HISTORY_ACTION_LABELS: Record<string, string> = {
  approved: '核准',
  rejected: '駁回',
  withdrawn: '撤回',
  admin_deleted: '管理員刪除',
  executing: '開始執行',
  in_progress: '進行中',
  completed: '完成',
  closed: '結案',
  returned: '退回修改',
  resubmitted: '修改重送',
  revoke_requested: '申請撤銷',
  revoked: '撤銷生效',
  revoke_rejected: '撤銷請求被拒',
  tracking_started: '進入追蹤',
  payment_marked: '撥款標記',
}

export const HISTORY_ACTION_COLORS: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-orange-100 text-orange-700',
  returned: 'bg-amber-100 text-amber-700',
  resubmitted: 'bg-blue-100 text-blue-700',
  revoke_requested: 'bg-rose-100 text-rose-700',
  revoked: 'bg-red-100 text-red-700',
  revoke_rejected: 'bg-gray-100 text-gray-700',
  tracking_started: 'bg-cyan-100 text-cyan-700',
  payment_marked: 'bg-blue-100 text-blue-700',
  closed: 'bg-emerald-100 text-emerald-700',
  executing: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-gray-100 text-gray-700',
  admin_deleted: 'bg-red-100 text-red-700',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待審核',
  approved: '已核准',
  rejected: '已駁回',
  executing: '待執行',
  in_progress: '執行中',
  completed: '已完成',
  closed: '已結案',
  withdrawn: '已撤回',
  deleted: '已刪除',
  returned: '退回修改',
  tracking: '追蹤中',
  pending_revoke: '撤銷審核中',
  revoked: '已撤銷',
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  executing: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-gray-100 text-gray-800',
  closed: 'bg-emerald-100 text-emerald-800',
  withdrawn: 'bg-orange-100 text-orange-800',
  deleted: 'bg-red-100 text-red-800',
  returned: 'bg-amber-100 text-amber-800',
  tracking: 'bg-cyan-100 text-cyan-800',
  pending_revoke: 'bg-rose-100 text-rose-800',
  revoked: 'bg-red-100 text-red-800',
}

export const TRACKING_STATUS_LABELS: Record<string, string> = {
  pending_payment: '待撥款',
  paid: '已撥款',
  pending_verification: '待核銷',
  closed: '已結案',
}

export const TRACKING_STATUS_COLORS: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  pending_verification: 'bg-purple-100 text-purple-800',
  closed: 'bg-emerald-100 text-emerald-800',
}
