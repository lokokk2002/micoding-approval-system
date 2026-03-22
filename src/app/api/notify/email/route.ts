/**
 * Email 通知 API
 *
 * 接收內部呼叫，透過 n8n webhook 寄送 Email
 * n8n webhook 負責實際的 SMTP/Gmail 寄送
 *
 * 若 N8N_EMAIL_WEBHOOK_URL 未設定，僅 console.log 記錄
 */
export async function POST(request: Request) {
  const { to, subject, body, request_number, status } = await request.json()

  if (!to || !subject) {
    return Response.json({ error: '缺少收件人或主旨' }, { status: 400 })
  }

  const webhookUrl = process.env.N8N_EMAIL_WEBHOOK_URL

  if (!webhookUrl) {
    // No webhook configured — log and skip
    console.log(`[Email] Would send to ${to}: ${subject} (status: ${status}, request: ${request_number})`)
    return Response.json({ sent: false, reason: 'N8N_EMAIL_WEBHOOK_URL not configured' })
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        body,
        request_number,
        status,
      }),
    })

    if (!res.ok) {
      console.error(`[Email] Webhook returned ${res.status}`)
      return Response.json({ sent: false, reason: `webhook error: ${res.status}` })
    }

    return Response.json({ sent: true })
  } catch (err) {
    console.error('[Email] Failed to call webhook:', err)
    return Response.json({ sent: false, reason: 'webhook call failed' })
  }
}
