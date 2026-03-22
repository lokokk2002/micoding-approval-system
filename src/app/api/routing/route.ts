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

export async function POST(request: Request) {
  const body = await request.json()
  const {
    brand, location, category, level,
    reviewer_name, reviewer_phone, reviewer_slack_id,
  } = body

  if (!brand || !location || level === undefined) {
    return Response.json({ error: '品牌、門市、層級為必填' }, { status: 400 })
  }

  const supabase = createServiceClient()
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
