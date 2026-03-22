import { createServiceClient } from '@/lib/supabase'

export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/withdraw'>
) {
  const { id } = await ctx.params
  const { actor_name } = await request.json()

  const supabase = createServiceClient()

  // Update status
  await supabase
    .from('requests')
    .update({ status: 'withdrawn', deleted_at: new Date().toISOString() })
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
