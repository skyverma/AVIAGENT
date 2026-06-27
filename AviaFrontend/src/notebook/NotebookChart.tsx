import { ChartBar } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { ChartObject } from './types'

const COLORS = ['#2d8cff', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#14b8a6']

function firstKey(row: Record<string, unknown>, fallback: string) {
  return Object.keys(row).find((k) => typeof row[k] === 'string') || Object.keys(row)[0] || fallback
}

function numericKey(row: Record<string, unknown>, fallback: string) {
  return Object.keys(row).find((k) => typeof row[k] === 'number') || Object.keys(row)[1] || fallback
}

export function NotebookChart({ chart }: { chart: ChartObject }) {
  const data = Array.isArray(chart.data) ? chart.data : []
  if (data.length === 0) return null
  const first = data[0] || {}
  const xKey = chart.xKey || firstKey(first, 'name')
  const yKey = chart.yKey || numericKey(first, 'value')
  const type = chart.type || 'bar'

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-qm-navy">
        <ChartBar className="h-3.5 w-3.5 text-qm-blue" />
        {chart.title || 'Chart'}
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey={yKey} stroke="#2d8cff" strokeWidth={2} dot={false} />
            </LineChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Tooltip />
              <Pie data={data} dataKey={yKey} nameKey={xKey} outerRadius={72}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey={yKey} fill="#2d8cff" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
