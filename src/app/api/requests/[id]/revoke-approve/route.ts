import { createServiceClient } from '@/lib/supabase'
import { notifyEmailRaw } from '@/lib/notify'

// §4-B：原核准人決定同意 / 駁回申請人的撤銷請求
// 同意 → revoked；拒絕 → 回到 approved
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/revoke-approve'>
) {
  const { id } = await ctx.params
  const { approve, comment, actor_name, actor_role } = await request.json()

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
  }
  if (typeof approve !== 'boolean') {
    return Response.json({ error: '缺少 approve 決定' }, { status: 400 })
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
  if (req.status !== 'pending_revoke') {
    return Response.json({ error: '此申請目前不在撤銷審核中' }, { status: 400 })
  }

  if (approve) {
    await supabase
      .from('history')
      .insert({
        request_id: id,
        level: req.current_level,
        actor_name,
        actor_role: actor_role || null,
        action: 'revoked',
        comment: comment ? String(comment).trim() : '同意申請人撤銷',
      })
    await supabase
      .from('requests')
      .update({ status: 'revoked' })
      .eq('id', id)

    const subject = `【MiCoding審批】${req.request_number} — 撤銷已生效`
    const body = [
      `${req.applicant_name} 您好，`,
      '',
      `您的撤銷申請已被 ${actor_name} 同意，審批單 ${req.request_number} 已撤銷。`,
      '',
      '此單為終態，如需重辦請重新建單。',
    ].join('\n')
    await notifyEmailRaw(req.applicant_email, subject, body, req.request_number).catch(() => {})
  } else {
    await supabase
      .from('history')
      .insert({
        request_id: id,
        level: req.current_level,
        actor_name,
        actor_role: actor_role || null,
        action: 'revoke_rejected',
        comment: comment ? String(comment).trim() : '駁回撤銷請求',
      })
    await supabase
      .from('requests')
      .update({ status: 'approved' })
      .eq('id', id)

    const subject = `【MiCoding審批】${req.request_number} — 撤銷請求已被駁回`
    const body = [
      `${req.applicant_name} 您好，`,
      '',
      `您對審批單 ${req.request_number} 提出的撤銷請求，已被 ${actor_name} 駁回。`,
      '該單恢復「已核准」狀態。',
    ].join('\n')
    await notifyEmailRaw(req.applicant_email, subject, body, req.request_number).catch(() => {})
  }

  return Response.json({ success: true })
}
