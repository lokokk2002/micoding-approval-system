import { createServiceClient } from '@/lib/supabase'
import { notifyEmailRaw, notifySlack } from '@/lib/notify'

// 審批人「退回修改」— 把單子打回給申請人
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/return'>
) {
  const { id } = await ctx.params
  const { comment, actor_name, actor_role } = await request.json()

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
  }
  if (!comment || !String(comment).trim()) {
    return Response.json({ error: '退回原因為必填' }, { status: 400 })
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
  if (req.status !== 'pending') {
    return Response.json({ error: '只有待審核的申請才能退回' }, { status: 400 })
  }

  await supabase
    .from('history')
    .insert({
      request_id: id,
      level: req.current_level,
      actor_name,
      actor_role: actor_role || null,
      action: 'returned',
      comment: String(comment).trim(),
    })

  await supabase
    .from('requests')
    .update({ status: 'returned' })
    .eq('id', id)

  // Notify applicant
  const subject = `【MiCoding審批】${req.request_number} — 已被退回修改`
  const body = [
    `${req.applicant_name} 您好，`,
    '',
    `您的審批單 ${req.request_number} 已被 ${actor_name} 退回修改。`,
    '',
    `退回原因：`,
    String(comment).trim(),
    '',
    '請登入系統後在「我的申請」中修改並重送。',
  ].join('\n')

  await notifyEmailRaw(req.applicant_email, subject, body, req.request_number).catch(() => {})
  await notifySlack({
    slack_id: null, // applicant slack_id not stored on request currently
    text: `您的審批單 ${req.request_number} 已被退回，原因：${String(comment).trim()}`,
    request_number: req.request_number,
  }).catch(() => {})

  return Response.json({ success: true })
}
