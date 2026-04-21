import { createServiceClient } from '@/lib/supabase'

// 取單筆申請（不套 deleted_at filter，讓 withdrawn / returned / revoked 都看得到）
export async function GET(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/detail'>
) {
  const { id } = await ctx.params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return Response.json({ error: '找不到此申請' }, { status: 404 })
  }
  return Response.json({ request: data })
}
