import { createServiceClient } from '@/lib/supabase'

// §5 追蹤清單（GET）
// Query：
//   role=tracker&name=X       → 只回該 tracker 負責的（requests.tracker_name 或 post_approval.tracker_name 範圍）
//   role=closer&name=X        → 只回該 closer 有結案權限的
//   role=admin                → 全部
//   tracking_status=xxx       → 選填過濾 tracking_status
//   brand=xxx / from=date / to=date → 選填
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') || ''
  const name = searchParams.get('name') || ''
  const trackingStatus = searchParams.get('tracking_status')
  const brand = searchParams.get('brand')
  const from = searchParams.get('from') // YYYY-MM-DD
  const to = searchParams.get('to')

  const supabase = createServiceClient()

  let query = supabase
    .from('requests')
    .select('*')
    .eq('status', 'tracking')
    .order('is_urgent', { ascending: false })
    .order('payment_due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (trackingStatus) query = query.eq('tracking_status', trackingStatus)
  if (brand) query = query.eq('brand', brand)
  if (from) query = query.gte('updated_at', `${from}T00:00:00+08:00`)
  if (to) query = query.lte('updated_at', `${to}T23:59:59+08:00`)

  const { data, error } = await query
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  let rows = data || []

  if (role === 'tracker' && name) {
    // 先看 requests.tracker_name 直接命中；再看 post_approval（退路，給沒自動指派到的舊資料）
    const { data: pa } = await supabase
      .from('post_approval')
      .select('brand, location, category')
      .eq('tracker_name', name)
    const paMap = new Set((pa || []).map((p) => `${p.brand}|${p.location}|${p.category}`))
    rows = rows.filter((r) =>
      r.tracker_name === name ||
      paMap.has(`${r.brand}|${r.location}|${r.category}`) ||
      paMap.has(`${r.brand}|${r.location}|all`)
    )
  } else if (role === 'closer' && name) {
    const { data: pa } = await supabase
      .from('post_approval')
      .select('brand, location, category')
      .eq('closer_name', name)
    const paMap = new Set((pa || []).map((p) => `${p.brand}|${p.location}|${p.category}`))
    rows = rows.filter((r) =>
      paMap.has(`${r.brand}|${r.location}|${r.category}`) ||
      paMap.has(`${r.brand}|${r.location}|all`)
    )
  }

  const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  return Response.json({
    requests: rows,
    totalAmount,
  })
}
