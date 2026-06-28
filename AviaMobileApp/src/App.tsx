import { Navigate, Route, Routes } from 'react-router-dom'
import { MobileShell } from '@/components/MobileShell'
import { AppProvider, useApp } from '@/context/AppContext'
import { ChatPage } from '@/pages/ChatPage'
import { CodePage } from '@/pages/CodePage'
import { FilesPage } from '@/pages/FilesPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { SettingsPage } from '@/pages/SettingsPage'

function AppRoutes() {
  const { settings, ready } = useApp()
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">Loading…</div>
    )
  }

  if (!settings.onboarded) {
    return (
      <Routes>
        <Route path="*" element={<OnboardingPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<MobileShell />}>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/code" element={<CodePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
