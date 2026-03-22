import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ users: data })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { phone, name, email, role, brand, location, slack_id } = body

  if (!phone || !name || !role) {
    return Response.json({ error: '手機、姓名、角色為必填' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .insert({ phone, name, email, role, brand, location, slack_id })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: '此手機號碼已存在' }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ user: data }, { status: 201 })
}
