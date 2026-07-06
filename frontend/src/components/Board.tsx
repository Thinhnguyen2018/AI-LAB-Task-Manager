import { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent,
  PointerSensor, useSensor, useSensors, closestCenter, useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { Task, TaskCreate, TaskUpdate } from '../types'
import TaskCard from './TaskCard'
import TaskCardOverlay from './TaskCardOverlay'
import TaskModal from './TaskModal'

interface Props {
  tasks: Task[]
  onUpdate: (id: number, task: TaskUpdate) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onCreate: (task: TaskCreate) => Promise<void>
}

const COLUMNS: { key: Task['status']; label: string; color: string; bg: string }[] = [
  { key: 'pending', label: 'Pending', color: '#f59e0b', bg: '#fffbeb' },
  { key: 'progress', label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'done', label: 'Done', color: '#16a34a', bg: '#f0fdf4' },
]

function DroppableColumn({
  col, tasks, activeId, overColKey, onAddClick, onCardClick,
}: {
  col: typeof COLUMNS[number]
  tasks: Task[]
  activeId: number | null
  overColKey: string | null
  onAddClick: () => void
  onCardClick: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.key}` })
  const isHighlighted = isOver || overColKey === col.key

  return (
    <div style={{
      background: isHighlighted ? col.bg : '#f9fafb',
      borderRadius: 12,
      padding: 12,
      minHeight: 400,
      border: isHighlighted ? `2px dashed ${col.color}` : '2px solid transparent',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>{col.label}</span>
          <span style={{ fontSize: 12, background: '#e5e7eb', borderRadius: 10, padding: '1px 7px', color: '#6b7280' }}>{tasks.length}</span>
        </div>
        <button
          onClick={onAddClick}
          style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
          title="Add task"
        >+</button>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onCardClick(task)}
              isBeingDragged={task.id === activeId}
            />
          ))}
          {/* Drop placeholder when hovering over empty space */}
          {isHighlighted && activeId && tasks.every(t => t.id !== activeId) && (
            <div style={{
              height: 60,
              borderRadius: 10,
              border: `2px dashed ${col.color}`,
              background: col.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: col.color,
              fontSize: 13,
              fontWeight: 600,
            }}>
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function Board({ tasks, onUpdate, onDelete, onCreate }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overColKey, setOverColKey] = useState<string | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [createStatus, setCreateStatus] = useState<Task['status'] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) { setOverColKey(null); return }
    const overId = String(over.id)
    if (overId.startsWith('col-')) {
      setOverColKey(overId.replace('col-', ''))
    } else {
      const overTask = tasks.find(t => t.id === over.id)
      setOverColKey(overTask?.status ?? null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    setOverColKey(null)
    const { active, over } = event
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task) return
    const overId = String(over.id)
    let targetStatus: Task['status'] | undefined
    if (overId.startsWith('col-')) {
      targetStatus = overId.replace('col-', '') as Task['status']
    } else {
      const overTask = tasks.find(t => t.id === over.id)
      targetStatus = overTask?.status
    }
    if (targetStatus && task.status !== targetStatus) {
      onUpdate(task.id, { status: targetStatus })
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col.key}
              col={col}
              tasks={tasks.filter(t => t.status === col.key)}
              activeId={activeTask?.id ?? null}
              overColKey={overColKey}
              onAddClick={() => setCreateStatus(col.key)}
              onCardClick={t => setEditTask(t)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {editTask && (
        <TaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={data => onUpdate(editTask.id, data as TaskUpdate)}
          onDelete={() => onDelete(editTask.id)}
        />
      )}
      {createStatus && (
        <TaskModal
          defaultStatus={createStatus}
          onClose={() => setCreateStatus(null)}
          onSave={data => onCreate(data as TaskCreate)}
        />
      )}
    </>
  )
}
