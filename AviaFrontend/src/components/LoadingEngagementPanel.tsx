import { Loader2 } from 'lucide-react'
import { useElapsedTimer } from '@/hooks/useElapsedTimer'
import { formatDurationMs } from '@/lib/formatDuration'

const TIPS = [
  'Analyzing your dataset with the sparkle pipeline…',
  'Codegen → sandbox run → critic → insights',
  'Results are grounded in execution output only',
]

export function LoadingEngagementPanel({ active, compact }: { active: boolean; compact?: boolean }) {
  const elapsed = useElapsedTimer(active)
  const tip = TIPS[Math.floor(elapsed / 4000) % TIPS.length]
  if (!active) return null
  return (
    <div className={compact ? 'rounded-lg border bg-white p-3 text-sm' : 'rounded-xl border bg-white p-5 shadow-sm'}>
      <div className="mb-2 flex items-center gap-2 font-semibold text-qm-navy">
        <Loader2 className="h-4 w-4 animate-spin text-qm-blue" />
        Working… <span className="text-slate-400">{formatDurationMs(elapsed)}</span>
      </div>
      <p className="text-sm text-slate-600">{tip}</p>
    </div>
  )
}
