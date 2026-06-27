import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type PillTab = { id: string; label: string }

type Props = {
  tabs: PillTab[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function SlidingPillTabs({ tabs, value, onChange, className }: Props) {
  const tabsRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const update = () => {
      const container = tabsRef.current
      if (!container) return
      const active = container.querySelector<HTMLButtonElement>(`[data-tab-id="${value}"]`)
      if (!active) return
      const cr = container.getBoundingClientRect()
      const ar = active.getBoundingClientRect()
      setPill({ left: ar.left - cr.left, width: ar.width })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [value, tabs])

  return (
    <div ref={tabsRef} className={cn('relative inline-flex items-center gap-1 rounded-full bg-slate-200/60 p-0.5', className)}>
      {pill.width > 0 && (
        <div
          className="absolute bottom-0.5 top-0.5 rounded-full bg-white shadow-sm transition-all duration-300 ease-out"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          data-tab-id={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative z-10 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
            value === tab.id ? 'text-qm-navy' : 'text-slate-500 hover:text-qm-navy',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
