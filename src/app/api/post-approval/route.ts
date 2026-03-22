import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('post_approval')
    .select('*')
    .order('brand')
    .order('location')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ items: data })
}

export async function POST(request: Request) {
  const body = await request.json()
  const {
    brand, location, category,
    tracker_name, tracker_phone, tracker_slack_id,
    closer_name, closer_phone, closer_slack_id,
  } = body

  if (!brand || !location) {
    return Response.json({ error: '品牌、門市為必填' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('post_approval')
    .upsert({
      brand,
      location,
      category: category || 'all',
      tracker_name, tracker_phone, tracker_slack_id,
      closer_name, closer_phone, closer_slack_id,
    }, { onConflict: 'brand,location,category' })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ item: data }, { status: 201 })
}
