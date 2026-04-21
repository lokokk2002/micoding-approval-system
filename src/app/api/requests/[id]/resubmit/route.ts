import { createServiceClient } from '@/lib/supabase'
import { extractAmount } from '@/lib/notify'

// 申請人「修改重送」— 僅限 returned / withdrawn 狀態
// 會把當前 form_data/attachments 快照存入 form_data_versions，再覆蓋新內容
// status → pending，current_level → 1（全部重審）
export async function POST(
  request: Request,
  ctx: RouteContext<'/api/requests/[id]/resubmit'>
) {
  const { id } = await ctx.params
  const { form_data, attachments, reason, actor_name } = await request.json()

  if (!actor_name) {
    return Response.json({ error: '缺少操作人資訊' }, { status: 400 })
  }
  if (!form_data || typeof form_data !== 'object') {
    return Response.json({ error: '缺少表單內容' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: req, error: fetchError } = await supabase
    .from('requests')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !req) {
    return Response.json({ error: '找不到此申請' }, { status: 404 })
  }
  if (!['returned', 'withdrawn'].includes(req.status)) {
    return Response.json({ error: '只有退回或撤回的申請才能修改重送' }, { status: 400 })
  }
  if (req.applicant_name !== actor_name) {
    return Response.json({ error: '只有申請人本人能修改重送' }, { status: 403 })
  }

  // Snapshot current version into form_data_versions
  const existingVersions = Array.isArray(req.form_data_versions) ? req.form_data_versions : []
  const currentVersion = req.version || 1
  const snapshotReason = currentVersion === 1 ? '初次提交' : (req.form_data_versions?.slice(-1)[0]?.reason || '舊版本')

  const snapshot = {
    version: currentVersion,
    form_data: req.form_data || {},
    attachments: req.attachments || [],
    saved_at: new Date().toISOString(),
    reason: snapshotReason,
  }

  const newVersion = currentVersion + 1
  const newVersions = [...existingVersions, snapshot]
  const newAmount = extractAmount(form_data as Record<string, unknown>)

  const { error: updateError } = await supabase
    .from('requests')
    .update({
      form_data,
      attachments: attachments || req.attachments || [],
      form_data_versions: newVersions,
      version: newVersion,
      status: 'pending',
      current_level: 1,
      amount: newAmount,
      deleted_at: null, // withdrawn may set deleted_at; clear on resubmit
    })
    .eq('id', id)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  await supabase
    .from('history')
    .insert({
      request_id: id,
      level: 0,
      actor_name,
      action: 'resubmitted',
      comment: reason ? String(reason).trim() : `修改重送至版本 v${newVersion}`,
    })

  return Response.json({ success: true, version: newVersion })
}
