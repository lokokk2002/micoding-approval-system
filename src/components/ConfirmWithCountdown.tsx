'use client'

import { useState, useEffect, type ReactNode } from 'react'

interface Props {
  title: string
  description: string
  confirmLabel: string
  seconds?: number
  confirmClassName?: string
  disabled?: boolean
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

// 需要倒數才能按確認的 dialog（撤回 / 申請撤銷 / 上級撤銷 等高風險動作）
// - 倒數期間確認按鈕 disabled 並顯示「確認 (3s)」「確認 (2s)」…
// - 取消按鈕始終可點
export default function ConfirmWithCountdown({
  title,
  description,
  confirmLabel,
  seconds = 3,
  confirmClassName = 'bg-red-600 hover:bg-red-700',
  disabled = false,
  children,
  onConfirm,
  onCancel,
}: Props) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) return
    const t = setTimeout(() => setRemaining((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining])

  const countdownActive = remaining > 0
  const confirmDisabled = countdownActive || disabled

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4 whitespace-pre-wrap">{description}</p>

        {children && <div className="mb-4">{children}</div>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmClassName}`}
          >
            {countdownActive ? `${confirmLabel}（${remaining}s）` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
