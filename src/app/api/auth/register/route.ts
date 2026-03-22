import { createServiceClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const { name, phone, email, slack_id } = await request.json()

  if (!name || !phone) {
    return Response.json({ error: '姓名和手機為必填' }, { status: 400 })
  }

  // Basic phone format validation
  const cleanPhone = phone.replace(/[\s-]/g, '')
  if (!/^09\d{8}$/.test(cleanPhone)) {
    return Response.json({ error: '手機格式不正確，請輸入 09 開頭的 10 碼手機號碼' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Check if phone already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('phone', cleanPhone)
    .maybeSingle()

  if (existing) {
    return Response.json({ error: '此手機號碼已註冊，請直接登入' }, { status: 409 })
  }

  // Create user with default role 'user'
  const { data, error } = await supabase
    .from('users')
    .insert({
      name,
      phone: cleanPhone,
      email: email || null,
      slack_id: slack_id || null,
      role: 'user',
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: '此手機號碼已註冊' }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ user: data }, { status: 201 })
}
