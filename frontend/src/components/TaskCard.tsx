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

const STATUS_ACCENT: Record<string, string> = {
  pending: '#f59e0b',
  progress: '#3b82f6',
  done: '#16a34a',
}

export default function TaskCard({ task, onClick, isBeingDragged, canEdit = true }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const accentColor = STATUS_ACCENT[task.status] ?? '#a1a1aa'
  const dotColor = moduleColor(task.module)

  const assigneeInitial = task.assignee ? task.assignee.trim().charAt(0).toUpperCase() : null

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isBeingDragged ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative',
        background: '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: 6,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        padding: '10px 12px 10px 15px',
        cursor: canEdit ? 'grab' : 'pointer',
        userSelect: 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
        el.style.borderColor = '#d4d4d8'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
        el.style.borderColor = '#e8e8e8'
      }}
      {...attributes}
      {...(canEdit ? listeners : {})}
      onClick={onClick}
    >
      {/* Left accent border */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        borderRadius: '6px 0 0 6px',
        background: accentColor,
      }} />

      {/* Title */}
      <p style={{
        fontSize: 13,
        fontWeight: 500,
        color: '#1a1a1a',
        lineHeight: 1.4,
        margin: 0,
        marginBottom: 8,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {task.title}
      </p>

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Module tag */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          color: '#52525b',
          background: '#f4f4f5',
          borderRadius: 4,
          padding: '2px 7px',
          fontWeight: 500,
          maxWidth: 140,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            flexShrink: 0,
            display: 'inline-block',
          }} />
          {task.module}
        </span>

        {/* Assignee initial */}
        {assigneeInitial && (
          <span style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#e4e4e7',
            color: '#52525b',
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            userSelect: 'none',
          }} title={task.assignee}>
            {assigneeInitial}
          </span>
        )}
      </div>
    </div>
  )
}
