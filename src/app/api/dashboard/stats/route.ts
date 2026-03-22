import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()

  const [pending, executing, inProgress, completed, closed, rejected, urgent] = await Promise.all([
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'executing').is('deleted_at', null),
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'in_progress').is('deleted_at', null),
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'completed').is('deleted_at', null),
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'closed').is('deleted_at', null),
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'rejected').is('deleted_at', null),
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('is_urgent', true).is('deleted_at', null),
  ])

  return Response.json({
    stats: {
      pending: pending.count || 0,
      executing: executing.count || 0,
      in_progress: inProgress.count || 0,
      completed: completed.count || 0,
      closed: closed.count || 0,
      rejected: rejected.count || 0,
      urgent: urgent.count || 0,
    },
  })
}
