import { createServiceClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const { ids, action, comment, actor_name, actor_role } = await request.json()

  if (!ids?.length || !action || !actor_name) {
    return Response.json({ error: '缺少必要參數' }, { status: 400 })
  }

  if (!['approved', 'rejected'].includes(action)) {
    return Response.json({ error: '無效的操作' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const results: { id: string; success: boolean; error?: string }[] = []

  for (const id of ids) {
    try {
      // Get current request
      const { data: req, error: fetchError } = await supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .eq('status', 'pending')
        .single()

      if (fetchError || !req) {
        results.push({ id, success: false, error: '找不到此待審申請' })
        continue
      }

      // Insert history
      await supabase.from('history').insert({
        request_id: id,
        level: req.current_level,
        actor_name,
        actor_role,
        action,
        comment: comment || null,
      })

      if (action === 'rejected') {
        await supabase
          .from('requests')
          .update({ status: 'rejected' })
          .eq('id', id)
      } else if (action === 'approved') {
        // Check next level with category fallback
        const findRoute = async (level: number) => {
          const { data: specific } = await supabase
            .from('routing')
            .select('*')
            .eq('brand', req.brand)
            .eq('location', req.location)
            .eq('category', req.category)
            .eq('level', level)
            .maybeSingle()
          if (specific) return specific

          const { data: fallback } = await supabase
            .from('routing')
            .select('*')
            .eq('brand', req.brand)
            .eq('location', req.location)
            .eq('category', 'all')
            .eq('level', level)
            .maybeSingle()
          return fallback
        }

        const nextRoute = await findRoute(req.current_level + 1)
        if (nextRoute) {
          await supabase
            .from('requests')
            .update({ current_level: req.current_level + 1 })
            .eq('id', id)
        } else {
          await supabase
            .from('requests')
            .update({ status: 'approved' })
            .eq('id', id)
        }
      }

      results.push({ id, success: true })
    } catch {
      results.push({ id, success: false, error: '處理失敗' })
    }
  }

  const successCount = results.filter((r) => r.success).length
  return Response.json({ results, successCount, totalCount: ids.length })
}
