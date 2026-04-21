import { createServiceClient } from '@/lib/supabase'

// GET：列表（可過濾 brand / role / department / is_active）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brand = searchParams.get('brand')
  const role = searchParams.get('role')
  const department = searchParams.get('department')
  const active = searchParams.get('active') // 'all' | 'active' | 'inactive'

  const supabase = createServiceClient()
  let q = supabase
    .from('org_structure')
    .select('*')
    .order('org_role')
    .order('user_name')

  if (brand) q = q.eq('brand', brand)
  if (role) q = q.eq('org_role', role)
  if (department) q = q.eq('department', department)
  if (active === 'active' || !active) q = q.eq('is_active', true)
  else if (active === 'inactive') q = q.eq('is_active', false)

  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ items: data || [] })
}

interface PostBody {
  user_id?: string
  user_name: string
  user_phone?: string
  user_slack_id?: string
  org_role: 'staff' | 'store_manager' | 'area_manager' | 'dept_head' | 'gm'
  brand?: string
  department?: string
  location?: string
  area?: string
}

function validatePayload(body: PostBody): string | null {
  if (!body.user_name) return '姓名必填'
  if (!body.org_role) return '角色必填'
  if (!body.brand) return '品牌必填'
  if (body.org_role === 'store_manager' && !body.location) return '門店主管必須指定門市'
  if (body.org_role === 'area_manager' && !body.area) return '區主管必須指定區域'
  if (body.org_role === 'dept_head' && !body.department) return '部門主管必須指定部門'
  return null
}

// POST：新增
export async function POST(request: Request) {
  const body: PostBody = await request.json()
  const err = validatePayload(body)
  if (err) return Response.json({ error: err }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('org_structure')
    .insert({
      user_id: body.user_id || null,
      user_name: body.user_name,
      user_phone: body.user_phone || null,
      user_slack_id: body.user_slack_id || null,
      org_role: body.org_role,
      brand: body.brand || null,
      department: body.department || null,
      location: body.location || null,
      area: body.area || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    // 踩到唯一索引（例如同門市已有 store_manager）
    return Response.json({ error: `新增失敗：${error.message}` }, { status: 409 })
  }
  return Response.json({ item: data }, { status: 201 })
}
