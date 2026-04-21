import { createServiceClient } from '@/lib/supabase'
import { sendStatusEmail } from '@/lib/email'
import { notifyEmailRaw, notifySlack, extractAmount } from '@/lib/notify'

export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/approve'>
) {
  const { id } = await ctx.params
  const { action, comment, actor_name, actor_role } = await request.json()

  if (!action || !actor_name) {
    return Response.json({ error: '缺少必要參數' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get current request
  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !req) {
    return Response.json({ error: '找不到此申請' }, { status: 404 })
  }

  // Insert history record
  await supabase
    .from('history')
    .insert({
      request_id: id,
      level: req.current_level,
      actor_name,
      actor_role,
      action,
      comment: comment || null,
    })

  if (action === 'rejected') {
    await supabase
      .from('requests')
      .update({ status: 'rejected' })
      .eq('id', id)
    await sendStatusEmail(req, 'rejected').catch(() => {})

  } else if (action === 'approved') {
    // Helper: find routing by brand+location+level, with category fallback to 'all'
    const findRoute = async (level: number) => {
      const { data: specific } = await supabase
        .from('routing')
        .select('*')
        .eq('brand', req.brand)
        .eq('location', req.location)
        .eq('category', req.category)
        .eq('level', level)
        .maybeSingle()
      if (specific) return specific
      const { data: fallback } = await supabase
        .from('routing')
        .select('*')
        .eq('brand', req.brand)
        .eq('location', req.location)
        .eq('category', 'all')
        .eq('level', level)
        .maybeSingle()
      return fallback
    }

    const nextRoute = await findRoute(req.current_level + 1)

    if (nextRoute) {
      await supabase
        .from('requests')
        .update({ current_level: req.current_level + 1 })
        .eq('id', id)
    } else {
      // 最終核准 — 自動進追蹤（§5）
      // 先看 post_approval 有沒有指派追蹤者；沒有就回落 approved（讓既有流程處理）
      const findPostApproval = async () => {
        const { data: specific } = await supabase
          .from('post_approval')
          .select('*')
          .eq('brand', req.brand)
          .eq('location', req.location)
          .eq('category', req.category)
          .maybeSingle()
        if (specific) return specific
        const { data: fallback } = await supabase
          .from('post_approval')
          .select('*')
          .eq('brand', req.brand)
          .eq('location', req.location)
          .eq('category', 'all')
          .maybeSingle()
        return fallback
      }

      const postApproval = await findPostApproval()
      const amount = req.amount != null ? req.amount : extractAmount(req.form_data as Record<string, unknown>)

      if (postApproval && postApproval.tracker_name) {
        await supabase
          .from('requests')
          .update({
            status: 'tracking',
            tracking_status: 'pending_payment',
            tracker_name: postApproval.tracker_name,
            tracker_slack_id: postApproval.tracker_slack_id || null,
            completed_at: null, // 清掉舊值，結案時才寫入
            amount,
          })
          .eq('id', id)

        await supabase
          .from('history')
          .insert({
            request_id: id,
            level: req.current_level,
            actor_name: 'System',
            actor_role: 'system',
            action: 'tracking_started',
            comment: `審批通過，進入追蹤（追蹤者：${postApproval.tracker_name}）`,
          })

        // Notify tracker
        const subject = `【MiCoding審批】${req.request_number} — 已核准，待您追蹤`
        const body = [
          `${postApproval.tracker_name} 您好，`,
          '',
          `審批單 ${req.request_number}（${req.applicant_name}）已通過審批，請至「追蹤清單」安排後續處理。`,
          '',
          amount ? `涉及金額：NT$ ${amount.toLocaleString('zh-TW')}` : '',
        ].filter(Boolean).join('\n')
        await notifyEmailRaw(req.applicant_email, subject, body, req.request_number).catch(() => {})
        await notifySlack({
          slack_id: postApproval.tracker_slack_id,
          text: `審批單 ${req.request_number} 已核准，請安排後續處理`,
          request_number: req.request_number,
        }).catch(() => {})
      } else {
        // 沒設追蹤者 — 維持舊行為
        await supabase
          .from('requests')
          .update({ status: 'approved', amount })
          .eq('id', id)
      }
      await sendStatusEmail(req, 'approved').catch(() => {})
    }

  } else if (action === 'executing') {
    // Tracker marks as executing (待執行 → 執行中)
    await supabase
      .from('requests')
      .update({ status: 'executing' })
      .eq('id', id)
    await sendStatusEmail(req, 'executing').catch(() => {})

  } else if (action === 'in_progress') {
    await supabase
      .from('requests')
      .update({ status: 'in_progress' })
      .eq('id', id)

  } else if (action === 'completed') {
    await supabase
      .from('requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
    await sendStatusEmail(req, 'completed').catch(() => {})
  }

  return Response.json({ success: true })
}
