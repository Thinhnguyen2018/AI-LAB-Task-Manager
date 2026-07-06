import { useState, useEffect } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent,
  PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
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
  { key: 'pending',  label: 'Pending',     color: '#f59e0b', bg: '#fffbeb' },
  { key: 'progress', label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'done',     label: 'Done',        color: '#16a34a', bg: '#f0fdf4' },
]

type ColKey = Task['status']

function Column({
  col, ids, allItems, activeId, onAddClick, onCardClick,
}: {
  col: typeof COLUMNS[number]
  ids: number[]
  allItems: Record<number, Task>
  activeId: number | null
  onAddClick: () => void
  onCardClick: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.key}` })

  return (
    <div style={{
      background: isOver ? col.bg : '#f9fafb',
      borderRadius: 12, padding: 12, minHeight: 400,
      border: isOver ? `2px dashed ${col.color}` : '2px solid transparent',
      transition: 'all 0.15s',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>{col.label}</span>
          <span style={{ fontSize: 12, background: '#e5e7eb', borderRadius: 10, padding: '1px 7px', color: '#6b7280' }}>{ids.length}</span>
        </div>
        <button onClick={onAddClick} style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 20, cursor: 'pointer', lineHeight: 1 }} title="Add task">+</button>
      </div>

      {/* Cards */}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 60 }}>
          {ids.map(id => {
            const task = allItems[id]
            if (!task) return null
            return (
              <TaskCard
                key={id}
                task={task}
                onClick={() => onCardClick(task)}
                isBeingDragged={id === activeId}
              />
            )
          })}
          {ids.length === 0 && (
            <div style={{
              flex: 1, minHeight: 60, borderRadius: 8, border: `2px dashed ${col.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#d1d5db', fontSize: 13,
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
  // Local ordered lists per column
  const [colIds, setColIds] = useState<Record<ColKey, number[]>>({
    pending: [], progress: [], done: [],
  })
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [createStatus, setCreateStatus] = useState<Task['status'] | null>(null)

  // Sync from props (when tasks change externally)
  useEffect(() => {
    setColIds({
      pending:  tasks.filter(t => t.status === 'pending').map(t => t.id),
      progress: tasks.filter(t => t.status === 'progress').map(t => t.id),
      done:     tasks.filter(t => t.status === 'done').map(t => t.id),
    })
  }, [tasks])

  const itemMap: Record<number, Task> = {}
  tasks.forEach(t => { itemMap[t.id] = t })

  const findCol = (id: number | string): ColKey | null => {
    const strId = String(id)
    if (strId.startsWith('col-')) return strId.replace('col-', '') as ColKey
    const numId = Number(id)
    for (const col of COLUMNS) {
      if (colIds[col.key].includes(numId)) return col.key
    }
    return null
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find(t => t.id === active.id) ?? null)
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const activeId = Number(active.id)
    const overId = over.id
    const activeCol = findCol(activeId)
    const overCol = findCol(overId)
    if (!activeCol || !overCol || activeCol === overCol) return

    setColIds(prev => {
      const activeItems = prev[activeCol].filter(id => id !== activeId)
      const overItems = [...prev[overCol]]
      const overIndex = String(overId).startsWith('col-')
        ? overItems.length          // dropped onto column itself → append
        : overItems.indexOf(Number(overId))

      const newOverItems = [...overItems]
      newOverItems.splice(overIndex >= 0 ? overIndex : overItems.length, 0, activeId)

      return { ...prev, [activeCol]: activeItems, [overCol]: newOverItems }
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeId = Number(active.id)
    const activeTask = tasks.find(t => t.id === activeId)
    setActiveTask(null)

    if (!over || !activeTask) return

    const activeCol = findCol(activeId)
    const overCol   = findCol(over.id)

    if (!activeCol || !overCol) return

    if (activeCol === overCol) {
      // Reorder within same column
      const items = colIds[activeCol]
      const oldIdx = items.indexOf(activeId)
      const newIdx = items.indexOf(Number(over.id))
      if (oldIdx !== newIdx && newIdx !== -1) {
        setColIds(prev => ({ ...prev, [activeCol]: arrayMove(prev[activeCol], oldIdx, newIdx) }))
      }
    } else {
      // Cross-column: status already updated in onDragOver, now persist
      onUpdate(activeId, { status: overCol })
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {COLUMNS.map(col => (
            <Column
              key={col.key}
              col={col}
              ids={colIds[col.key]}
              allItems={itemMap}
              activeId={activeTask?.id ?? null}
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
