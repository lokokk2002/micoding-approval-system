'use client'

import Link from 'next/link'
import AreasTab from '@/components/settings/AreasTab'

export default function AreasPage() {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <Link href="/settings" className="hover:text-gray-700">系統設定</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">區域</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">區域管理</h1>
      <AreasTab />
    </div>
  )
}
