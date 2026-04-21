import { createServiceClient } from './supabase'
import type { ReviewerRole, OrgStructure } from '@/types/database'

export interface ResolvedReviewer {
  name: string
  phone: string | null
  slack_id: string | null
  source_role: ReviewerRole
  source_id: string // org_structure row id
}

export interface ResolveContext {
  brand: string
  location?: string | null
  department?: string | null
  area?: string | null
}

// 從 org_structure 找出申請人本人的組織記錄（用 phone 對應）
export async function getApplicantOrg(phone: string): Promise<OrgStructure | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('org_structure')
    .select('*')
    .eq('user_phone', phone)
    .eq('is_active', true)
    .maybeSingle()
  return (data as OrgStructure | null) || null
}

// 當申請人的 area 沒被直接登記時，由 location 反查 areas 表
async function findAreaByLocation(brand: string, location: string): Promise<string | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('areas')
    .select('name, location_codes')
    .eq('brand', brand)

  if (!data) return null
  for (const row of data as Array<{ name: string; location_codes: string[] }>) {
    if (Array.isArray(row.location_codes) && row.location_codes.includes(location)) {
      return row.name
    }
  }
  return null
}

// 核心：根據角色 + 申請人歸屬找出對應的審批人
export async function resolveReviewer(
  ctx: ResolveContext,
  role: ReviewerRole,
): Promise<{ ok: true; reviewer: ResolvedReviewer } | { ok: false; error: string }> {
  const supabase = createServiceClient()

  let query = supabase
    .from('org_structure')
    .select('*')
    .eq('org_role', role)
    .eq('is_active', true)
    .eq('brand', ctx.brand)

  switch (role) {
    case 'store_manager': {
      if (!ctx.location) {
        return { ok: false, error: '申請人未登記門市，無法解析門店主管' }
      }
      query = query.eq('location', ctx.location)
      break
    }
    case 'area_manager': {
      let area = ctx.area || null
      if (!area && ctx.location) {
        area = await findAreaByLocation(ctx.brand, ctx.location)
      }
      if (!area) {
        return { ok: false, error: '申請人未登記區域，無法解析區主管' }
      }
      query = query.eq('area', area)
      break
    }
    case 'dept_head': {
      if (!ctx.department) {
        return { ok: false, error: '申請人未登記部門，無法解析部門主管' }
      }
      query = query.eq('department', ctx.department)
      break
    }
    case 'gm':
      // 品牌下唯一的 gm
      break
  }

  const { data, error } = await query.limit(1).maybeSingle()
  if (error) return { ok: false, error: error.message }

  if (!data) {
    const targetDesc =
      role === 'store_manager' ? `門市 ${ctx.location} 的門店主管` :
      role === 'area_manager' ? `區域 ${ctx.area || '（未指定）'} 的區主管` :
      role === 'dept_head' ? `部門 ${ctx.department || '（未指定）'} 的部門主管` :
      `品牌 ${ctx.brand} 的總經理`
    return { ok: false, error: `尚未設定${targetDesc}，請聯繫管理員` }
  }

  const row = data as OrgStructure
  return {
    ok: true,
    reviewer: {
      name: row.user_name,
      phone: row.user_phone,
      slack_id: row.user_slack_id,
      source_role: role,
      source_id: row.id,
    },
  }
}

// 對一個申請請求的 level 查 routing，再解析審批人
// - 如果 routing.reviewer_role 有設：走角色制
// - 否則：回落到 routing.reviewer_name（舊模式）
export async function resolveRouteAt(
  brand: string,
  location: string,
  category: string,
  level: number,
  applicantCtx: ResolveContext,
): Promise<{ ok: true; reviewer: ResolvedReviewer; legacy?: boolean } | { ok: false; error: string }> {
  const supabase = createServiceClient()

  // 先找 brand+location+category 特定；沒有再回落 'all'
  const findRoute = async () => {
    const { data: specific } = await supabase
      .from('routing')
      .select('*')
      .eq('brand', brand)
      .eq('location', location)
      .eq('category', category)
      .eq('level', level)
      .maybeSingle()
    if (specific) return specific
    const { data: fallback } = await supabase
      .from('routing')
      .select('*')
      .eq('brand', brand)
      .eq('location', location)
      .eq('category', 'all')
      .eq('level', level)
      .maybeSingle()
    return fallback
  }

  const route = await findRoute()
  if (!route) {
    return { ok: false, error: `找不到第 ${level} 層的路由設定` }
  }

  if (route.reviewer_role) {
    return resolveReviewer(applicantCtx, route.reviewer_role as ReviewerRole)
  }

  // 舊式人名 fallback
  if (route.reviewer_name) {
    return {
      ok: true,
      legacy: true,
      reviewer: {
        name: route.reviewer_name,
        phone: route.reviewer_phone,
        slack_id: route.reviewer_slack_id,
        source_role: 'gm', // placeholder — 舊模式沒角色概念
        source_id: route.id,
      },
    }
  }

  return { ok: false, error: `第 ${level} 層未指定審批角色或審批人` }
}
