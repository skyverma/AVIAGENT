import { NavLink } from 'react-router-dom'
import { MessageSquare, FolderOpen, Terminal, Settings } from 'lucide-react'

const tabs = [
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/files', icon: FolderOpen, label: 'Files' },
  { to: '/code', icon: Terminal, label: 'Python' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1 pb-1">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[52px] min-w-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-qm-blue' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
