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

export const STATUS_LABELS: Record<string, string> = {
  pending: '待審核',
  approved: '已核准',
  rejected: '已駁回',
  executing: '待執行',
  in_progress: '執行中',
  completed: '已完成',
  closed: '已結案',
  withdrawn: '已撤回',
  deleted: '已刪除',
}

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  executing: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-gray-100 text-gray-800',
  closed: 'bg-emerald-100 text-emerald-800',
  withdrawn: 'bg-orange-100 text-orange-800',
  deleted: 'bg-red-100 text-red-800',
}
