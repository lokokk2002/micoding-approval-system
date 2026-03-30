'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    email: '',
    slack_id: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 密碼驗證
    if (form.password.length < 4) {
      setError('密碼至少需要 4 個字元')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('兩次輸入的密碼不一致')
      return
    }

    setIsSubmitting(true)

    try {
      const { confirmPassword, ...submitData } = form
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '註冊失敗')
        return
      }

      setSuccess(true)
    } catch {
      setError('註冊失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg text-center">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-900">註冊成功！</h2>
          <p className="text-gray-600">
            您的帳號已建立，現在可以使用手機號碼和密碼登入。
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            前往登入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">MiCoding</h1>
          <p className="mt-2 text-sm text-gray-600">建立帳號</p>
          <p className="mt-1 text-xs text-gray-400">倍速運動 × 放筋鬆 ReChill</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="請輸入您的姓名"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              手機號碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="09xxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">登入時使用此手機號碼</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="請設定密碼（至少 4 個字元）"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              確認密碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="請再次輸入密碼"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="用於接收審批通知"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">填寫後可收到申請狀態變更的 Email 通知</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slack ID
            </label>
            <input
              type="text"
              value={form.slack_id}
              onChange={(e) => setForm({ ...form, slack_id: e.target.value })}
              placeholder="例如：U07XXXXXXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="mt-1.5 flex items-start gap-1.5">
              <span className="text-amber-500 text-xs mt-0.5">ℹ️</span>
              <p className="text-xs text-amber-600">
                主管 / 審批人員才需要填寫，用於接收 Slack 審批通知。一般員工可跳過此欄位。
              </p>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !form.name || !form.phone || !form.password || !form.confirmPassword}
            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '註冊中...' : '建立帳號'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            已有帳號？
            <Link href="/" className="ml-1 text-blue-600 hover:text-blue-800 font-medium">
              前往登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
