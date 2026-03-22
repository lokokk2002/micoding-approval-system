import { createServiceClient } from '@/lib/supabase'

export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/undo'>
) {
  const { id } = await ctx.params
  const { actor_name, actor_role } = await request.json()

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get current request - must be rejected
  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .eq('status', 'rejected')
    .single()

  if (fetchError || !req) {
    return Response.json({ error: '找不到此駁回的申請，或狀態不是「已駁回」' }, { status: 404 })
  }

  // Get the last rejection history to find the level
  const { data: lastHistory } = await supabase
    .from('history')
    .select('*')
    .eq('request_id', id)
    .eq('action', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const restoreLevel = lastHistory?.level || req.current_level

  // Restore to pending at the same level
  await supabase
    .from('requests')
    .update({ status: 'pending', current_level: restoreLevel })
    .eq('id', id)

  // Record the undo in history
  await supabase.from('history').insert({
    request_id: id,
    level: restoreLevel,
    actor_name,
    actor_role: actor_role || null,
    action: 'approved', // we record a note about undo
    comment: `[復原駁回] 由 ${actor_name} 將此申請恢復為待審核狀態`,
  })

  return Response.json({ success: true, restored_level: restoreLevel })
}
