import { createServiceClient } from '@/lib/supabase'

export async function PUT(
  request: Request,
  ctx: RouteContext<'/api/org-structure/[id]'>
) {
  const { id } = await ctx.params
  const body = await request.json()

  const patch: Record<string, unknown> = {}
  for (const k of ['user_id', 'user_name', 'user_phone', 'user_slack_id', 'org_role',
                    'brand', 'department', 'location', 'area', 'is_active'] as const) {
    if (k in body) patch[k] = body[k]
  }

  if (patch.org_role) {
    const r = patch.org_role as string
    if (r === 'store_manager' && !('location' in body ? body.location : true)) {
      return Response.json({ error: '門店主管必須指定門市' }, { status: 400 })
    }
    if (r === 'area_manager' && !('area' in body ? body.area : true)) {
      return Response.json({ error: '區主管必須指定區域' }, { status: 400 })
    }
    if (r === 'dept_head' && !('department' in body ? body.department : true)) {
      return Response.json({ error: '部門主管必須指定部門' }, { status: 400 })
    }
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('org_structure')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 409 })
  return Response.json({ item: data })
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<'/api/org-structure/[id]'>
) {
  const { id } = await ctx.params
  const supabase = createServiceClient()

  // soft delete：is_active = false
  const { error } = await supabase
    .from('org_structure')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
