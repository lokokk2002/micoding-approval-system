import { createServiceClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const { name, phone, password, email, slack_id } = await request.json()

  if (!name || !phone) {
    return Response.json({ error: '姓名和手機為必填' }, { status: 400 })
  }

  if (!password || password.length < 4) {
    return Response.json({ error: '密碼為必填，至少 4 個字元' }, { status: 400 })
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

  // 密碼加密
  const password_hash = await bcrypt.hash(password, 10)

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
      password_hash,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: '此手機號碼已註冊' }, { status: 409 })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  // 不回傳 password_hash
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash: _hash, ...user } = data

  return Response.json({ user }, { status: 201 })
}
