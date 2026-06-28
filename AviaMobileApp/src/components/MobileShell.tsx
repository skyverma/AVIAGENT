import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function MobileShell() {
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-qm-bg">
      <main className="safe-top flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(3.75rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
