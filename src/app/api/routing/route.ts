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

    // 先刪除該 brand+location+category 的所有舊路由
    const { error: deleteError } = await supabase
      .from('routing')
      .delete()
      .eq('brand', brand)
      .eq('location', location)
      .eq('category', cat)

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 })
    }

    // 過濾掉沒有審批人的層級，然後批次新增
    const rowsToInsert = levels
      .filter((l: { reviewer_name?: string }) => l.reviewer_name)
      .map((l: { level: number; reviewer_name: string; reviewer_phone: string; reviewer_slack_id: string }) => ({
        brand,
        location,
        category: cat,
        level: l.level,
        reviewer_name: l.reviewer_name,
        reviewer_phone: l.reviewer_phone,
        reviewer_slack_id: l.reviewer_slack_id,
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
    reviewer_name, reviewer_phone, reviewer_slack_id,
  } = body

  if (!brand || !location || level === undefined) {
    return Response.json({ error: '品牌、門市、層級為必填' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('routing')
    .insert({
      brand,
      location,
      category: category || 'all',
      level,
      reviewer_name,
      reviewer_phone,
      reviewer_slack_id,
    })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ route: data }, { status: 201 })
}
