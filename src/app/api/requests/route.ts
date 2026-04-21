import { createServiceClient } from '@/lib/supabase'
import { TYPE_CODES } from '@/lib/constants'
import { sendStatusEmail } from '@/lib/email'
import { extractAmount } from '@/lib/notify'
import { resolveRouteAt, getApplicantOrg } from '@/lib/reviewer-resolver'
import type { OrgStructure } from '@/types/database'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const phone = searchParams.get('phone')
  const reviewer = searchParams.get('reviewer') // reviewer name for permission filtering
  const tracker = searchParams.get('tracker') // tracker name for tracking tab
  const closer = searchParams.get('closer') // closer name for closing tab
  const role = searchParams.get('role') // user role

  const supabase = createServiceClient()
  let query = supabase
    .from('requests')
    .select('*')
    .is('deleted_at', null)
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false })

  if (status) {
    const statuses = status.split(',')
    query = query.in('status', statuses)
  }

  if (phone) {
    query = query.eq('applicant_phone', phone)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Filter by reviewer — 考量兩種來源：
  //   (a) routing.reviewer_name 直接指名（舊模式）
  //   (b) routing.reviewer_role 角色制 → 需要把申請人的組織歸屬代入解析
  if (reviewer) {
    const [{ data: legacyRoutes }, { data: reviewerOrgRows }] = await Promise.all([
      supabase.from('routing').select('brand, location, category, level').eq('reviewer_name', reviewer),
      supabase.from('org_structure').select('*').eq('user_name', reviewer).eq('is_active', true),
    ])
    const reviewerOrgs = (reviewerOrgRows || []) as OrgStructure[]

    // Pre-load applicant org records for all request applicants（一次查，避免 N+1）
    const applicantPhones = Array.from(new Set((data || []).map((r) => r.applicant_phone)))
    const { data: applicantOrgRows } = await supabase
      .from('org_structure')
      .select('*')
      .in('user_phone', applicantPhones)
      .eq('is_active', true)
    const orgByPhone: Record<string, OrgStructure> = {}
    for (const row of (applicantOrgRows || []) as OrgStructure[]) {
      if (row.user_phone) orgByPhone[row.user_phone] = row
    }

    const matchesLegacy = (req: { brand: string; location: string; category: string; current_level: number }) =>
      (legacyRoutes || []).some((route) =>
        route.brand === req.brand &&
        route.location === req.location &&
        (route.category === 'all' || route.category === req.category) &&
        route.level === req.current_level
      )

    // 檢查角色制：載入該 request 對應 routing 的 reviewer_role，再比對 reviewer 的角色+覆蓋範圍
    const filtered: typeof data = []
    for (const req of data || []) {
      if (matchesLegacy(req)) { filtered.push(req); continue }
      // 角色制
      const applicantOrg = orgByPhone[req.applicant_phone] || null
      const applicantCtx = {
        brand: req.brand,
        location: applicantOrg?.location ?? req.location ?? null,
        department: applicantOrg?.department ?? null,
        area: applicantOrg?.area ?? null,
      }
      const resolved = await resolveRouteAt(
        req.brand, req.location, req.category, req.current_level, applicantCtx,
      )
      if (resolved.ok && resolved.reviewer.name === reviewer) {
        filtered.push(req); continue
      }
      // 再退一步：用 reviewer 自己的 role 覆蓋範圍比對 routing.reviewer_role
      if (reviewerOrgs.length > 0) {
        const { data: roleRoute } = await supabase
          .from('routing')
          .select('*')
          .eq('brand', req.brand)
          .eq('location', req.location)
          .in('category', [req.category, 'all'])
          .eq('level', req.current_level)
          .not('reviewer_role', 'is', null)
          .maybeSingle()
        if (roleRoute) {
          const match = reviewerOrgs.find((o) => {
            if (o.org_role !== roleRoute.reviewer_role) return false
            if (o.brand !== req.brand) return false
            if (o.org_role === 'store_manager') return o.location === (applicantOrg?.location ?? req.location)
            if (o.org_role === 'area_manager') return o.area === applicantOrg?.area
            if (o.org_role === 'dept_head') return o.department === applicantOrg?.department
            return o.org_role === 'gm'
          })
          if (match) filtered.push(req)
        }
      }
    }
    return Response.json({ requests: filtered })
  }

  // Filter by tracker (追蹤人) — from post_approval table
  if (tracker) {
    const { data: pa } = await supabase
      .from('post_approval')
      .select('brand, location, category')
      .eq('tracker_name', tracker)

    if (pa && pa.length > 0) {
      const filtered = (data || []).filter((req) => {
        return pa.some((p) => {
          const brandMatch = p.brand === req.brand
          const locationMatch = p.location === req.location
          const categoryMatch = p.category === 'all' || p.category === req.category
          return brandMatch && locationMatch && categoryMatch
        })
      })
      return Response.json({ requests: filtered })
    }
    return Response.json({ requests: [] })
  }

  // Filter by closer (結案人) — from post_approval table
  if (closer) {
    const { data: pa } = await supabase
      .from('post_approval')
      .select('brand, location, category')
      .eq('closer_name', closer)

    if (pa && pa.length > 0) {
      const filtered = (data || []).filter((req) => {
        return pa.some((p) => {
          const brandMatch = p.brand === req.brand
          const locationMatch = p.location === req.location
          const categoryMatch = p.category === 'all' || p.category === req.category
          return brandMatch && locationMatch && categoryMatch
        })
      })
      return Response.json({ requests: filtered })
    }
    return Response.json({ requests: [] })
  }

  return Response.json({ requests: data })
}

export async function POST(request: Request) {
  const body = await request.json()
  const {
    category, type, brand, location,
    applicant_name, applicant_phone, applicant_email,
    form_data, is_urgent, attachments,
  } = body

  if (!category || !type || !brand || !location || !applicant_name || !applicant_phone) {
    return Response.json({ error: '缺少必填欄位' }, { status: 400 })
  }

  // Generate request number: {TYPE_CODE}-{YEAR}-{MMDD}-{SEQ}
  const now = new Date()
  const typeCode = TYPE_CODES[type] || 'XX'
  const year = now.getFullYear()
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
  const request_number = `${typeCode}-${year}-${mmdd}-${seq}`

  const supabase = createServiceClient()
  const amount = extractAmount(form_data as Record<string, unknown>)

  // 建單前先驗證 L1 審批人可解析（角色制或舊式皆可），避免送出後卡住
  const applicantOrg = await getApplicantOrg(applicant_phone)
  const applicantCtx = {
    brand,
    location: applicantOrg?.location ?? location,
    department: applicantOrg?.department ?? null,
    area: applicantOrg?.area ?? null,
  }
  const resolved = await resolveRouteAt(brand, location, category, 1, applicantCtx)
  if (!resolved.ok) {
    return Response.json({ error: `無法送出：${resolved.error}` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('requests')
    .insert({
      request_number,
      category,
      type,
      brand,
      location,
      applicant_name,
      applicant_phone,
      applicant_email: applicant_email || '',
      form_data: form_data || {},
      attachments: attachments || [],
      is_urgent: is_urgent || false,
      current_level: 1,
      status: 'pending',
      amount,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // Send email notification to applicant
  await sendStatusEmail(data, 'pending').catch(() => {})

  return Response.json({ request: data, request_number }, { status: 201 })
}
