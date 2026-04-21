import { createServiceClient } from '@/lib/supabase'

export async function PUT(
  request: Request,
  ctx: RouteContext<'/api/areas/[id]'>
) {
  const { id } = await ctx.params
  const body = await request.json()
  const { brand, name, location_codes } = body as {
    brand?: string
    name?: string
    location_codes?: string[]
  }

  const supabase = createServiceClient()

  // 取舊資料做比對
  const { data: oldArea } = await supabase
    .from('areas')
    .select('*')
    .eq('id', id)
    .single()
  if (!oldArea) return Response.json({ error: '找不到區域' }, { status: 404 })

  const patch: Record<string, unknown> = {}
  if (brand !== undefined) patch.brand = brand
  if (name !== undefined) patch.name = name
  if (location_codes !== undefined) patch.location_codes = Array.isArray(location_codes) ? location_codes : []

  const { data: updated, error } = await supabase
    .from('areas')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 409 })

  const newBrand = brand ?? oldArea.brand
  const oldName = oldArea.name
  const newName = name ?? oldName
  const oldCodes: string[] = Array.isArray(oldArea.location_codes) ? oldArea.location_codes : []
  const newCodes: string[] = location_codes ?? oldCodes

  // rename：把所有舊 area 值改成新值
  if (newName !== oldName) {
    await supabase
      .from('org_structure')
      .update({ area: newName })
      .eq('brand', newBrand)
      .eq('area', oldName)
  }

  // 加入門市：新入門市成員的 area 設為 newName
  const added = newCodes.filter((c) => !oldCodes.includes(c))
  if (added.length > 0) {
    await supabase
      .from('org_structure')
      .update({ area: newName })
      .eq('brand', newBrand)
      .in('location', added)
      .neq('org_role', 'area_manager')
  }

  // 移除門市：被移除的 location 成員若還掛著此 area，清空
  const removed = oldCodes.filter((c) => !newCodes.includes(c))
  if (removed.length > 0) {
    await supabase
      .from('org_structure')
      .update({ area: null })
      .eq('brand', newBrand)
      .eq('area', newName)
      .in('location', removed)
      .neq('org_role', 'area_manager')
  }

  return Response.json({ item: updated })
}

export async function DELETE(
  request: Request,
  ctx: RouteContext<'/api/areas/[id]'>
) {
  const { id } = await ctx.params
  const supabase = createServiceClient()

  const { data: area } = await supabase.from('areas').select('*').eq('id', id).single()
  const { error } = await supabase.from('areas').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // 清空該 area 值於 org_structure
  if (area) {
    await supabase
      .from('org_structure')
      .update({ area: null })
      .eq('brand', area.brand)
      .eq('area', area.name)
  }

  return Response.json({ success: true })
}
