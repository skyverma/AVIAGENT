import { Check, Circle, Loader2, XCircle } from 'lucide-react'
import { formatDurationMs } from '@/lib/formatDuration'
import { cn } from '@/lib/utils'

export type PipelineStep = {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  detail?: string
  duration_ms?: number
}

export function PipelineProgress({ steps, className }: { steps: PipelineStep[]; className?: string }) {
  const running = steps.find((s) => s.status === 'running')
  const done = steps.filter((s) => s.status === 'completed').length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{running ? `Running: ${running.name}` : 'Pipeline'}</span>
        <span>{pct}%</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="pipeline-progress-fill h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-sm">
            <StepIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-qm-navy">{step.name}</div>
              {(step.detail || step.duration_ms != null) && (
                <div className="text-xs text-slate-500">
                  {[step.detail, step.duration_ms != null ? formatDurationMs(step.duration_ms) : null].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StepIcon({ status }: { status: PipelineStep['status'] }) {
  if (status === 'completed') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-qm-green/15"><Check className="h-3.5 w-3.5 text-qm-green" /></span>
  if (status === 'running') return <span className="pipeline-step-active flex h-6 w-6 items-center justify-center rounded-full bg-qm-blue/15"><Loader2 className="h-3.5 w-3.5 animate-spin text-qm-blue" /></span>
  if (status === 'failed') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50"><XCircle className="h-3.5 w-3.5 text-red-500" /></span>
  return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100"><Circle className="h-3 w-3 text-slate-300" /></span>
}
