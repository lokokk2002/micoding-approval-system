import { sendStatusEmail } from './email'

interface RequestInfo {
  request_number: string
  type: string
  applicant_name: string
  applicant_email: string
  brand: string
  location: string
}

export async function notifyStatusChange(
  request: RequestInfo,
  newStatus: string,
): Promise<void> {
  await sendStatusEmail(request, newStatus).catch(() => {})
}

interface SlackMessage {
  slack_id: string | null | undefined
  text: string
  request_number?: string
}

export async function notifySlack({ slack_id, text, request_number }: SlackMessage): Promise<void> {
  if (!slack_id) return
  const webhookUrl = process.env.N8N_SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.log(`[Slack] would send to ${slack_id}: ${text} (${request_number || ''})`)
    return
  }
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slack_id, text, request_number }),
    })
  } catch (err) {
    console.error('[Slack] webhook call failed:', err)
  }
}

export async function notifyEmailRaw(
  to: string | null | undefined,
  subject: string,
  body: string,
  request_number?: string,
): Promise<void> {
  if (!to) return
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notify/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, request_number }),
    })
  } catch (err) {
    console.error('[Email] raw send failed:', err)
  }
}

const AMOUNT_KEYS = [
  'amount', 'total_amount', 'total_price', 'over_amount',
  'estimated_amount', 'estimated_cost', 'budget_amount',
  'compensation_amount', 'fee',
]

export function extractAmount(formData: Record<string, unknown>): number | null {
  if (!formData) return null
  for (const key of AMOUNT_KEYS) {
    const v = formData[key]
    if (v === null || v === undefined || v === '') continue
    const n = typeof v === 'number' ? v : parseFloat(String(v))
    if (!isNaN(n) && n > 0) return n
  }
  return null
}
