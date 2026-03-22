import { createServiceClient } from '@/lib/supabase'
import { sendStatusEmail } from '@/lib/email'

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
      // Try specific category first
      const { data: specific } = await supabase
        .from('routing')
        .select('*')
        .eq('brand', req.brand)
        .eq('location', req.location)
        .eq('category', req.category)
        .eq('level', level)
        .maybeSingle()
      if (specific) return specific

      // Fallback to 'all'
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
      // Move to next level
      await supabase
        .from('requests')
        .update({ current_level: req.current_level + 1 })
        .eq('id', id)
    } else {
      // Final approval — move to approved
      await supabase
        .from('requests')
        .update({ status: 'approved' })
        .eq('id', id)
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
