import { createServiceClient } from '@/lib/supabase'

// §5：結案者（財務主管）批次結案
// body: { ids: string[], comment?: string, actor_name, actor_role }
export async function POST(request: Request) {
  const { ids, comment, actor_name, actor_role } = await request.json()

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
  }
  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: '請選擇要結案的申請' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // 只對 status=tracking 的生效；其他略過
  const { data: targets, error: fetchError } = await supabase
    .from('requests')
    .select('id, current_level, status')
    .in('id', ids)
    .eq('status', 'tracking')

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 })
  }

  const validIds = (targets || []).map((t) => t.id)
  if (validIds.length === 0) {
    return Response.json({ success: true, closedCount: 0, skippedCount: ids.length })
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
    .in('id', validIds)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  const historyRows = (targets || []).map((t) => ({
    request_id: t.id,
    level: t.current_level,
    actor_name,
    actor_role: actor_role || null,
    action: 'closed' as const,
    comment: comment ? String(comment).trim() : null,
  }))
  await supabase.from('history').insert(historyRows)

  return Response.json({
    success: true,
    closedCount: validIds.length,
    skippedCount: ids.length - validIds.length,
  })
}
