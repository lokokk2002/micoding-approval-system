import { createServiceClient } from '@/lib/supabase'
import { notifyEmailRaw } from '@/lib/notify'

// §5：結案者（財務主管）逐筆結案
// tracking_status=closed + status=completed
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/close-tracking'>
) {
  const { id } = await ctx.params
  const { comment, actor_name, actor_role } = await request.json()

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
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
    return Response.json({ error: '只有追蹤中的申請才能結案' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('requests')
    .update({
      status: 'completed',
      tracking_status: 'closed',
      completed_at: nowIso,
      closed_at: nowIso,
    })
    .eq('id', id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  await supabase.from('history').insert({
    request_id: id,
    level: req.current_level,
    actor_name,
    actor_role: actor_role || null,
    action: 'closed',
    comment: comment ? String(comment).trim() : null,
  })

  const subject = `【MiCoding審批】${req.request_number} — 已結案`
  const body = [
    `${req.applicant_name} 您好，`,
    '',
    `您的審批單 ${req.request_number} 已由 ${actor_name} 完成結案。`,
  ].join('\n')
  await notifyEmailRaw(req.applicant_email, subject, body, req.request_number).catch(() => {})

  return Response.json({ success: true })
}
