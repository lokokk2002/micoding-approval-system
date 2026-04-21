import { createServiceClient } from '@/lib/supabase'
import { notifyEmailRaw } from '@/lib/notify'

// §4-B：申請人發起撤銷請求（approved → pending_revoke）
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/revoke-request'>
) {
  const { id } = await ctx.params
  const { comment, actor_name } = await request.json()

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
  if (req.applicant_name !== actor_name) {
    return Response.json({ error: '只有申請人本人能發起撤銷請求' }, { status: 403 })
  }
  if (req.status !== 'approved') {
    return Response.json({ error: '只有已核准的申請才能申請撤銷' }, { status: 400 })
  }

  await supabase
    .from('history')
    .insert({
      request_id: id,
      level: req.current_level,
      actor_name,
      action: 'revoke_requested',
      comment: String(comment).trim(),
    })

  await supabase
    .from('requests')
    .update({ status: 'pending_revoke' })
    .eq('id', id)

  // Notify last approver — best effort via email to applicant's email chain
  // Find the actor of the final approval
  const { data: lastApproval } = await supabase
    .from('history')
    .select('*')
    .eq('request_id', id)
    .eq('action', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const approverName = lastApproval?.actor_name || '原核准人'
  const subject = `【MiCoding審批】${req.request_number} — 申請人發起撤銷`
  const body = [
    `${approverName} 您好，`,
    '',
    `${actor_name} 申請撤銷已核准的審批單 ${req.request_number}。`,
    '',
    `申請撤銷原因：`,
    String(comment).trim(),
    '',
    '請登入系統至該申請的詳情頁決定是否同意撤銷。',
  ].join('\n')
  // We don't have approver email directly — best-effort to applicant email as fallback for now
  await notifyEmailRaw(req.applicant_email, subject, body, req.request_number).catch(() => {})

  return Response.json({ success: true })
}
