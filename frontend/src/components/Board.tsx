import { useState } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
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

const COLUMNS: { key: Task['status']; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
  { key: 'progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'done', label: 'Done', color: '#16a34a' },
]

export default function Board({ tasks, onUpdate, onDelete, onCreate }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [createStatus, setCreateStatus] = useState<Task['status'] | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task) return
    const overTask = tasks.find(t => t.id === over.id)
    const targetStatus = overTask ? overTask.status : (over.id as string).replace('col-', '') as Task['status']
    if (targetStatus && task.status !== targetStatus) {
      onUpdate(task.id, { status: targetStatus })
    }
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key)
            return (
              <div key={col.key} style={{ background: '#f9fafb', borderRadius: 12, padding: 12, minHeight: 400 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>{col.label}</span>
                    <span style={{ fontSize: 12, background: '#e5e7eb', borderRadius: 10, padding: '1px 7px', color: '#6b7280' }}>{colTasks.length}</span>
                  </div>
                  <button
                    onClick={() => setCreateStatus(col.key)}
                    style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
                    title="Add task"
                  >
                    +
                  </button>
                </div>
                <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div id={`col-${col.key}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
                    {colTasks.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => setEditTask(task)} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>
        <DragOverlay>
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
