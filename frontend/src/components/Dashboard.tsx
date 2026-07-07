import { Task } from '../types'
import { moduleColor } from '../utils/moduleColor'

interface Props {
  tasks: Task[]
}

export default function Dashboard({ tasks }: Props) {
  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const progress = tasks.filter(t => t.status === 'progress').length
  const pending = tasks.filter(t => t.status === 'pending').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const byModule: Record<string, { total: number; done: number }> = {}
  for (const t of tasks) {
    if (!byModule[t.module]) byModule[t.module] = { total: 0, done: 0 }
    byModule[t.module].total++
    if (t.status === 'done') byModule[t.module].done++
  }

  const byQuarter: Record<string, { total: number; done: number }> = {}
  for (const t of tasks) {
    if (!byQuarter[t.quarter]) byQuarter[t.quarter] = { total: 0, done: 0 }
    byQuarter[t.quarter].total++
    if (t.status === 'done') byQuarter[t.quarter].done++
  }

  const statCard = (label: string, value: number | string, color: string) => (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  )

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20 }}>Dashboard</h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {statCard('Total Tasks', total, '#374151')}
        {statCard('Done', done, '#16a34a')}
        {statCard('In Progress', progress, '#2563eb')}
        {statCard('Pending', pending, '#d97706')}
      </div>

      {/* Progress bar */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Overall Progress</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: '#e5e7eb', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#16a34a', borderRadius: 5, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* By Module */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>By Module</h3>
          {Object.entries(byModule).map(([mod, { total: t, done: d }]) => {
            const p = Math.round((d / t) * 100)
            const color = moduleColor(mod)
            return (
              <div key={mod} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color }}>{mod}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{d}/{t} ({p}%)</span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p}%`, background: color, borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
          {Object.keys(byModule).length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No data</p>}
        </div>

        {/* By Quarter */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>By Quarter</h3>
          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
            const data = byQuarter[q]
            if (!data) return null
            const p = Math.round((data.done / data.total) * 100)
            return (
              <div key={q} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{q}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{data.done}/{data.total} ({p}%)</span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p}%`, background: '#16a34a', borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
          {Object.keys(byQuarter).length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No data</p>}
        </div>
      </div>
    </div>
  )
}
