import { createServiceClient } from '@/lib/supabase'

export async function PUT(
  request: Request,
  ctx: RouteContext<'/api/routing/[id]'>
) {
  const { id } = await ctx.params
  const body = await request.json()

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('routing')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ route: data })
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<'/api/routing/[id]'>
) {
  const { id } = await ctx.params

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('routing')
    .delete()
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
