import { createServiceClient } from '@/lib/supabase'

export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/withdraw'>
) {
  const { id } = await ctx.params
  const { actor_name } = await request.json()

  const supabase = createServiceClient()

  // 不再寫 deleted_at（那是「管理員刪除」專用）— withdrawn 保留在列表中才能讓申請人修改重送
  await supabase
    .from('requests')
    .update({ status: 'withdrawn' })
    .eq('id', id)
    .eq('status', 'pending')

  // Insert history
  await supabase
    .from('history')
    .insert({
      request_id: id,
      level: 0,
      actor_name: actor_name || 'Unknown',
      action: 'withdrawn',
    })

  return Response.json({ success: true })
}
