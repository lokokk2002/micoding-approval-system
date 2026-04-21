import { createServiceClient } from '@/lib/supabase'
import { notifyEmailRaw } from '@/lib/notify'

// §4-A：上級主動撤銷（不經審批流程，直接 revoked）
// 允許的現狀：approved / tracking / pending_revoke
// （pending_revoke 下上級直接拍板撤銷，不必再走 revoke-approve）
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/revoke'>
) {
  const { id } = await ctx.params
  const { comment, actor_name, actor_role } = await request.json()

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
  }
  if (!comment || !String(comment).trim()) {
    return Response.json({ error: '撤銷原因為必填' }, { status: 400 })
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
  if (!['approved', 'tracking', 'pending_revoke'].includes(req.status)) {
    return Response.json({ error: '只有已核准 / 追蹤中 / 撤銷審核中的申請才能撤銷' }, { status: 400 })
  }

  await supabase
    .from('history')
    .insert({
      request_id: id,
      level: req.current_level,
      actor_name,
      actor_role: actor_role || null,
      action: 'revoked',
      comment: String(comment).trim(),
    })

  await supabase
    .from('requests')
    .update({ status: 'revoked' })
    .eq('id', id)

  // Notify applicant
  const subject = `【MiCoding審批】${req.request_number} — 已被撤銷`
  const body = [
    `${req.applicant_name} 您好，`,
    '',
    `您的審批單 ${req.request_number}（原已核准）已被 ${actor_name} 撤銷。`,
    '',
    `撤銷原因：`,
    String(comment).trim(),
    '',
    '此單為終態，如需重辦請重新建單。',
  ].join('\n')
  await notifyEmailRaw(req.applicant_email, subject, body, req.request_number).catch(() => {})

  // Also notify tracker if assigned
  if (req.tracker_name && req.applicant_email) {
    // best-effort, no dedicated email field for tracker
  }

  return Response.json({ success: true })
}
