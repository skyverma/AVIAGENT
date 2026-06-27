import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AUTH_API } from '@/lib/api'

export function LoginPage() {
  const [username, setUsername] = useState('demo')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    await fetch(`${AUTH_API}/csrf/`, { credentials: 'include' })
    const res = await fetch(`${AUTH_API}/login/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      setError('Invalid credentials')
      return
    }
    navigate('/app')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-qm-bg p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-qm-navy">AVIAGENT</h1>
        <p className="mb-6 text-sm text-slate-500">Free Agentic Framework</p>
        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
        <label className="mb-1 block text-xs font-semibold text-slate-600">Username</label>
        <input className="mb-3 w-full rounded-lg border px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label className="mb-1 block text-xs font-semibold text-slate-600">Password</label>
        <input type="password" className="mb-6 w-full rounded-lg border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="w-full rounded-lg bg-qm-blue py-2 font-semibold text-white">Sign in</button>
        <p className="mt-4 text-center text-xs text-slate-400">demo / demo1234</p>
      </form>
    </div>
  )
}
