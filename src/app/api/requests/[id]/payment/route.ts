import { createServiceClient } from '@/lib/supabase'
import type { TrackingStatus } from '@/types/database'

// §5：追蹤者（出納）更新撥款狀態
// body: { tracking_status: 'paid' | 'pending_verification' | 'pending_payment',
//         payment_date?: string, payment_due_date?: string, payment_note?: string,
//         actor_name, actor_role }
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/payment'>
) {
  const { id } = await ctx.params
  const body = await request.json()
  const {
    tracking_status,
    payment_date,
    payment_due_date,
    payment_note,
    actor_name,
    actor_role,
  } = body as {
    tracking_status: TrackingStatus
    payment_date?: string
    payment_due_date?: string
    payment_note?: string
    actor_name: string
    actor_role?: string
  }

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
  }
  if (!tracking_status || !['pending_payment', 'paid', 'pending_verification'].includes(tracking_status)) {
    return Response.json({ error: 'tracking_status 不合法（closed 必須走 close-tracking endpoint）' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !req) {
    return Response.json({ error: '找不到此申請' }, { status: 404 })
  }
  if (req.status !== 'tracking') {
    return Response.json({ error: '只有追蹤中的申請才能更新撥款狀態' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { tracking_status }
  if (payment_date !== undefined) patch.payment_date = payment_date || null
  if (payment_due_date !== undefined) patch.payment_due_date = payment_due_date || null
  if (payment_note !== undefined) patch.payment_note = payment_note || null

  // 進 paid 時若沒指定日期，自動填現在
  if (tracking_status === 'paid' && payment_date === undefined && !req.payment_date) {
    patch.payment_date = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('requests')
    .update(patch)
    .eq('id', id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  await supabase.from('history').insert({
    request_id: id,
    level: req.current_level,
    actor_name,
    actor_role: actor_role || null,
    action: 'payment_marked',
    comment: `${tracking_status}${payment_note ? ` — ${payment_note}` : ''}`,
  })

  return Response.json({ success: true })
}
