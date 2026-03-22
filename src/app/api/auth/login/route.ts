import { createServiceClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const { phone } = await request.json()

  if (!phone) {
    return Response.json({ error: '請輸入手機號碼' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return Response.json({ error: '找不到此手機號碼的用戶，請聯繫管理員', detail: error?.message, code: error?.code }, { status: 404 })
  }

  return Response.json({ user: data })
}
