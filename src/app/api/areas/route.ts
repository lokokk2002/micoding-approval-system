import { createServiceClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const brand = searchParams.get('brand')

  const supabase = createServiceClient()
  let q = supabase.from('areas').select('*').order('brand').order('name')
  if (brand) q = q.eq('brand', brand)
  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ items: data || [] })
}

// POST：新增區域 + 同步把 location_codes 內的門市員工/store_manager 的 area 欄位更新
export async function POST(request: Request) {
  const body = await request.json()
  const { brand, name, location_codes } = body as {
    brand: string
    name: string
    location_codes: string[]
  }
  if (!brand || !name) return Response.json({ error: '品牌和區域名稱必填' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: inserted, error } = await supabase
    .from('areas')
    .insert({
      brand,
      name,
      location_codes: Array.isArray(location_codes) ? location_codes : [],
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 409 })

  // 同步更新 org_structure：該品牌下 location ∈ location_codes 的非 area_manager 成員
  if (Array.isArray(location_codes) && location_codes.length > 0) {
    await supabase
      .from('org_structure')
      .update({ area: name })
      .eq('brand', brand)
      .in('location', location_codes)
      .neq('org_role', 'area_manager')
  }

  return Response.json({ item: inserted }, { status: 201 })
}
