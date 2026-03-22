import { createServiceClient } from '@/lib/supabase'

export async function GET(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/history'>
) {
  const { id } = await ctx.params

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ history: data })
}
