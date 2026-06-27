import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const BTN =
  'flex items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all hover:border-qm-blue hover:text-qm-blue'

type Props = {
  gapId: string
  hoveredGapId: string | null
  onHover: (id: string | null) => void
  onInsert: () => void
  alwaysVisible?: boolean
}

export function CellInsertZone({ gapId, hoveredGapId, onHover, onInsert, alwaysVisible }: Props) {
  const hovered = hoveredGapId === gapId
  if (alwaysVisible) {
    return (
      <div className="flex justify-center py-2">
        <button type="button" onClick={onInsert} className={BTN} title="Add cell" aria-label="Add cell">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }
  return (
    <div
      className="relative -my-1 py-3"
      onMouseEnter={() => onHover(gapId)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          onClick={onInsert}
          title="Insert cell"
          aria-label="Insert cell"
          className={cn(BTN, hovered ? 'scale-100 opacity-100' : 'scale-95 opacity-0')}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
