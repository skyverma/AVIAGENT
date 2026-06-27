import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { SlidingPillTabs } from '@/components/SlidingPillTabs'
import { AUTH_API } from '@/lib/api'

const MODE_TABS = [
  { id: 'normal', label: 'Normal' },
  { id: 'notebook', label: 'Notebook' },
]

export function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<string | null>(null)
  const mode = location.pathname.includes('notebook') ? 'notebook' : 'normal'

  useEffect(() => {
    fetch(`${AUTH_API}/me/`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUser(d.user?.username))
      .catch(() => navigate('/'))
  }, [navigate])

  const logout = async () => {
    await fetch(`${AUTH_API}/logout/`, { method: 'POST', credentials: 'include' })
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-qm-bg">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-4">
          <span className="text-lg font-bold text-qm-navy">AVIAGENT</span>
          <SlidingPillTabs
            tabs={MODE_TABS}
            value={mode}
            onChange={(id) => navigate(id === 'notebook' ? '/app/notebook' : '/app/normal')}
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {user && <span className="font-medium text-qm-navy">{user}</span>}
          <button type="button" onClick={logout} title="Sign out" className="rounded-lg p-2 hover:bg-slate-100">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
