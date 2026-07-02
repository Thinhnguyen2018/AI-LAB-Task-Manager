import { Task } from '../types'

interface Props {
  task: Task
}

const MODULE_COLORS: Record<string, string> = {
  GreenRAG: '#16a34a',
  'Doc-Intelli': '#2563eb',
  Infra: '#d97706',
  Integration: '#7c3aed',
  Milestone: '#db2777',
  Release: '#0891b2',
}

export default function TaskCardOverlay({ task }: Props) {
  const color = MODULE_COLORS[task.module] ?? '#6b7280'

  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      border: '1px solid #e5e7eb',
      padding: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      transform: 'rotate(3deg)',
      width: 260,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.4, flex: 1 }}>{task.title}</p>
        <span style={{ fontSize: 11, background: color + '18', color, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {task.module}
        </span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{task.quarter} {task.year}</span>
        {task.assignee && <span style={{ fontSize: 11, color: '#6b7280' }}>· {task.assignee}</span>}
      </div>
    </div>
  )
}
