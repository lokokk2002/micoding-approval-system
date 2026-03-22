'use client'

import { useAuth } from '@/contexts/AuthContext'
import LoginForm from '@/components/LoginForm'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/dashboard')
      } else if (user.role === 'reviewer') {
        router.push('/admin')
      } else {
        router.push('/apply')
      }
    }
  }, [user, router])

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">跳轉中...</p>
      </div>
    )
  }

  return <LoginForm />
}
