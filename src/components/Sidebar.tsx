'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { href: '/apply', label: '發起申請', icon: '📝', roles: ['user', 'reviewer', 'admin'] },
  { href: '/my-requests', label: '我的申請', icon: '📋', roles: ['user', 'reviewer', 'admin'] },
  { href: '/admin', label: '審批管理', icon: '✅', roles: ['reviewer', 'admin'] },
  { href: '/approvals/tracking', label: '核准後追蹤', icon: '💰', roles: ['reviewer', 'admin'] },
  { href: '/dashboard', label: '儀表板', icon: '📊', roles: ['reviewer', 'admin'] },
  { href: '/settings', label: '系統設定', icon: '⚙️', roles: ['admin'] },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  if (!user) return null

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role))

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">MiCoding</h1>
        <p className="text-xs text-gray-500 mt-1">審批管理系統</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.phone}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          登出
        </button>
      </div>
    </aside>
  )
}
