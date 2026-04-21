import { createServiceClient } from '@/lib/supabase'
import { TYPE_CODES } from '@/lib/constants'
import { sendStatusEmail } from '@/lib/email'
import { extractAmount } from '@/lib/notify'

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

  // Filter by reviewer — show only requests at the level this person reviews
  if (reviewer) {
    const { data: routes } = await supabase
      .from('routing')
      .select('brand, location, category, level')
      .eq('reviewer_name', reviewer)

    if (routes && routes.length > 0) {
      const filtered = (data || []).filter((req) => {
        // pending_revoke 是申請人提出撤銷審核，交由原核准人決定 —
        // 以 current_level（= 最後核准時的層級）做 routing 比對
        if (req.status === 'pending_revoke') {
          return routes.some((route) => {
            return route.brand === req.brand &&
              route.location === req.location &&
              (route.category === 'all' || route.category === req.category) &&
              route.level === req.current_level
          })
        }
        return routes.some((route) => {
          const brandMatch = route.brand === req.brand
          const locationMatch = route.location === req.location
          const categoryMatch = route.category === 'all' || route.category === req.category
          const levelMatch = route.level === req.current_level
          return brandMatch && locationMatch && categoryMatch && levelMatch
        })
      })
      return Response.json({ requests: filtered })
    }
    return Response.json({ requests: [] })
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
