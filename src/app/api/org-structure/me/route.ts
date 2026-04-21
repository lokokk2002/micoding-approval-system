import { createServiceClient } from '@/lib/supabase'

// GET /api/org-structure/me?phone=xxx
// 返回當前使用者的組織歸屬（因為 auth 是 client-side state，phone 由 client 傳）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  if (!phone) return Response.json({ error: 'phone required' }, { status: 400 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('org_structure')
    .select('*')
    .eq('user_phone', phone)
    .eq('is_active', true)
    .maybeSingle()

  return Response.json({ item: data || null })
}
