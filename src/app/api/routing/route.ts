import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('routing')
    .select('*')
    .order('brand')
    .order('location')
    .order('level')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ routes: data })
}

/**
 * POST /api/routing
 * 支援兩種模式：
 * 1. 單筆新增（舊格式，向後相容）: { brand, location, category, level, reviewer_name, ... }
 * 2. 批次設定（新格式）: { brand, location, category, totalLevels, levels: [{ level, reviewer_name, ... }] }
 *    會先刪除該 brand+location+category 的所有舊路由，再批次新增
 */
export async function POST(request: Request) {
  const body = await request.json()
  const supabase = createServiceClient()

  // 批次模式：包含 levels 陣列
  if (body.levels && Array.isArray(body.levels)) {
    const { brand, location, category, levels } = body

    if (!brand || !location) {
      return Response.json({ error: '品牌、門市為必填' }, { status: 400 })
    }

    const cat = category || 'all'

    const { error: deleteError } = await supabase
      .from('routing')
      .delete()
      .eq('brand', brand)
      .eq('location', location)
      .eq('category', cat)

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 })
    }

    // 至少要有 reviewer_role 或 reviewer_name 其中之一
    const rowsToInsert = levels
      .filter((l: { reviewer_role?: string; reviewer_name?: string }) =>
        (l.reviewer_role && l.reviewer_role.trim()) || (l.reviewer_name && l.reviewer_name.trim())
      )
      .map((l: {
        level: number
        reviewer_role?: string
        reviewer_name?: string
        reviewer_phone?: string
        reviewer_slack_id?: string
      }) => ({
        brand,
        location,
        category: cat,
        level: l.level,
        reviewer_role: l.reviewer_role || null,
        reviewer_name: l.reviewer_name || null,
        reviewer_phone: l.reviewer_phone || null,
        reviewer_slack_id: l.reviewer_slack_id || null,
      }))

    if (rowsToInsert.length === 0) {
      return Response.json({ routes: [] }, { status: 201 })
    }

    const { data, error } = await supabase
      .from('routing')
      .insert(rowsToInsert)
      .select()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ routes: data }, { status: 201 })
  }

  // 單筆模式（向後相容）
  const {
    brand, location, category, level,
    reviewer_role, reviewer_name, reviewer_phone, reviewer_slack_id,
  } = body

  if (!brand || !location || level === undefined) {
    return Response.json({ error: '品牌、門市、層級為必填' }, { status: 400 })
  }
  if (!reviewer_role && !reviewer_name) {
    return Response.json({ error: '須指定審批角色或審批人' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('routing')
    .insert({
      brand,
      location,
      category: category || 'all',
      level,
      reviewer_role: reviewer_role || null,
      reviewer_name: reviewer_name || null,
      reviewer_phone: reviewer_phone || null,
      reviewer_slack_id: reviewer_slack_id || null,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ route: data }, { status: 201 })
}
