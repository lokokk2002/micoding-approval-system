'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginForm() {
  const { login, isLoading } = useAuth()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await login(phone)
    if (!result.success) {
      setError(result.error || '登入失敗')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">MiCoding</h1>
          <p className="mt-2 text-sm text-gray-600">審批管理系統</p>
          <p className="mt-1 text-xs text-gray-400">倍速運動 × 放筋鬆 ReChill</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              手機號碼
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="請輸入手機號碼"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
              {error.includes('找不到') && (
                <p className="mt-2">
                  <Link href="/register" className="text-blue-600 hover:text-blue-800 font-medium underline">
                    尚未註冊？點此建立帳號
                  </Link>
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || !phone}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '登入中...' : '登入'}
          </button>
        </form>
        <div className="text-center">
          <p className="text-sm text-gray-500">
            還沒有帳號？
            <Link href="/register" className="ml-1 text-blue-600 hover:text-blue-800 font-medium">
              建立帳號
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
