import { createServiceClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: Request,
  ctx: RouteContext<'/api/users/[id]'>
) {
  const { id } = await ctx.params
  const body = await request.json()
  const { name, email, role, brand, location, slack_id, is_active, password } = body

  const supabase = createServiceClient()
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (email !== undefined) updates.email = email
  if (role !== undefined) updates.role = role
  if (brand !== undefined) updates.brand = brand
  if (location !== undefined) updates.location = location
  if (slack_id !== undefined) updates.slack_id = slack_id
  if (is_active !== undefined) updates.is_active = is_active

  // 有傳密碼就重新 hash 更新（管理員重設密碼用）
  if (password && password.length >= 4) {
    updates.password_hash = await bcrypt.hash(password, 10)
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, phone, name, email, role, brand, location, slack_id, is_active, created_at')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ user: data })
}
