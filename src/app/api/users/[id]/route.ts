import { createServiceClient } from '@/lib/supabase'

export async function PUT(
  request: Request,
  ctx: RouteContext<'/api/users/[id]'>
) {
  const { id } = await ctx.params
  const body = await request.json()
  const { name, email, role, brand, location, slack_id, is_active } = body

  const supabase = createServiceClient()
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (email !== undefined) updates.email = email
  if (role !== undefined) updates.role = role
  if (brand !== undefined) updates.brand = brand
  if (location !== undefined) updates.location = location
  if (slack_id !== undefined) updates.slack_id = slack_id
  if (is_active !== undefined) updates.is_active = is_active

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ user: data })
}
