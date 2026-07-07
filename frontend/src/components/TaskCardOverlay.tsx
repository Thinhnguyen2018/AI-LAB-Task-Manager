import { Task } from '../types'
import { moduleColor } from '../utils/moduleColor'

interface Props {
  task: Task
}

export default function TaskCardOverlay({ task }: Props) {
  const color = moduleColor(task.module)

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
