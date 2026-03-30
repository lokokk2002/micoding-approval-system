import { createServiceClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, name, email, role, brand, location, slack_id, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ users: data })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { phone, name, email, role, brand, location, slack_id, password } = body

  if (!phone || !name || !role) {
    return Response.json({ error: '手機、姓名、角色為必填' }, { status: 400 })
  }

  if (!password || password.length < 4) {
    return Response.json({ error: '密碼為必填，至少 4 個字元' }, { status: 400 })
  }

  // 密碼加密
  const password_hash = await bcrypt.hash(password, 10)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .insert({ phone, name, email, role, brand, location, slack_id, password_hash })
    .select('id, phone, name, email, role, brand, location, slack_id, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: '此手機號碼已存在' }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ user: data }, { status: 201 })
}
