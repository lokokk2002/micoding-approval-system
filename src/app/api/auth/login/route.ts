import { createServiceClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const { phone, password } = await request.json()

  if (!phone) {
    return Response.json({ error: '請輸入手機號碼' }, { status: 400 })
  }

  if (!password) {
    return Response.json({ error: '請輸入密碼' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .select('*, password_hash')
    .eq('phone', phone)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return Response.json({ error: '手機號碼或密碼錯誤' }, { status: 401 })
  }

  // 檢查密碼
  if (!data.password_hash) {
    return Response.json({ error: '此帳號尚未設定密碼，請聯繫管理員設定' }, { status: 403 })
  }

  const isMatch = await bcrypt.compare(password, data.password_hash)
  if (!isMatch) {
    return Response.json({ error: '手機號碼或密碼錯誤' }, { status: 401 })
  }

  // 不回傳 password_hash 到前端
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...user } = data

  return Response.json({ user })
}
