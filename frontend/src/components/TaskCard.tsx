import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task } from '../types'
import { moduleColor } from '../utils/moduleColor'

interface Props {
  task: Task
  onClick: () => void
  isBeingDragged?: boolean
  canEdit?: boolean
}

export default function TaskCard({ task, onClick, isBeingDragged, canEdit = true }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isBeingDragged ? 0.3 : 1,
    outline: isDragging ? '2px dashed #16a34a' : 'none',
  }

  const color = moduleColor(task.module)

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        padding: 12,
        cursor: 'grab',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        userSelect: 'none',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.4, flex: 1 }}>{task.title}</p>
        <span style={{ fontSize: 11, background: color + '18', color, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {task.module}
        </span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{task.quarter} {task.year}</span>
        {task.assignee && <span style={{ fontSize: 11, color: '#6b7280' }}>· {task.assignee}</span>}
        {task.deadline && <span style={{ fontSize: 11, color: '#6b7280' }}>· {task.deadline}</span>}
        {task.month && <span style={{ fontSize: 11, color: '#6b7280' }}>· M{task.month}</span>}
        {task.week && <span style={{ fontSize: 11, color: '#6b7280' }}>· W{task.week}</span>}
      </div>
    </div>
  )
}
