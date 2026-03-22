/**
 * Email 通知模組
 * 當申請狀態變更時，寄送 Email 通知給申請人
 *
 * 使用 Gmail MCP 或 n8n webhook 來寄送
 * 目前先建立介面，實際寄送透過 /api/notify/email 呼叫
 */

const STATUS_LABELS: Record<string, string> = {
  pending: '已提交申請',
  approved: '已核准',
  rejected: '已駁回',
  executing: '執行追蹤中',
  in_progress: '執行中',
  completed: '已完成',
  closed: '已結案',
  withdrawn: '已撤回',
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: '您的申請已成功提交，目前正在等待審核。',
  approved: '您的申請已經核准通過，即將進入執行階段。',
  rejected: '很抱歉，您的申請已被駁回。如有疑問請洽詢審批人。',
  executing: '您的申請已進入執行追蹤階段。',
  in_progress: '您的申請正在執行中。',
  completed: '您的申請已執行完成，等待結案確認。',
  closed: '您的申請已正式結案。',
  withdrawn: '您的申請已撤回。',
}

interface RequestInfo {
  request_number: string
  type: string
  applicant_name: string
  applicant_email: string
  brand: string
  location: string
}

export async function sendStatusEmail(
  request: RequestInfo,
  newStatus: string,
): Promise<void> {
  // Skip if no email
  if (!request.applicant_email) return

  const statusLabel = STATUS_LABELS[newStatus] || newStatus
  const statusDesc = STATUS_DESCRIPTIONS[newStatus] || ''

  const subject = `【MiCoding審批】${request.request_number} — ${statusLabel}`

  const body = [
    `${request.applicant_name} 您好，`,
    '',
    `您的申請單 ${request.request_number} 狀態已更新：`,
    '',
    `📋 狀態：${statusLabel}`,
    `${statusDesc}`,
    '',
    `---`,
    `此信件由 MiCoding 審批系統自動發送，請勿直接回覆。`,
  ].join('\n')

  try {
    // Call internal notify API
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notify/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: request.applicant_email,
        subject,
        body,
        request_number: request.request_number,
        status: newStatus,
      }),
    })
  } catch (err) {
    console.error('Failed to send email notification:', err)
    // Don't throw — email failure shouldn't block the main operation
  }
}
