import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './pages/AppShell'
import { LoginPage } from './pages/LoginPage'
import { NormalModePage } from './pages/NormalModePage'
import { NotebookPage } from './pages/NotebookPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="normal" replace />} />
        <Route path="normal" element={<NormalModePage />} />
        <Route path="notebook" element={<NotebookPage />} />
      </Route>
    </Routes>
  )
}
