import { createServiceClient } from '@/lib/supabase'
import { sendStatusEmail } from '@/lib/email'

export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/close'>
) {
  const { id } = await ctx.params
  const { actor_name, actor_role, comment } = await request.json()

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
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

  // Only completed requests can be closed
  if (req.status !== 'completed') {
    return Response.json({ error: '只有已完成的申請才能結案' }, { status: 400 })
  }

  // Insert history record
  await supabase
    .from('history')
    .insert({
      request_id: id,
      level: req.current_level,
      actor_name,
      actor_role,
      action: 'closed',
      comment: comment || null,
    })

  // Update request status to closed
  await supabase
    .from('requests')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', id)

  // Send email notification
  await sendStatusEmail(req, 'closed').catch(() => {})

  return Response.json({ success: true })
}
