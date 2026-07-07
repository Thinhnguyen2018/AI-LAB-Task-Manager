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
  canEdit?: boolean
}

const COLUMNS: { key: Task['status']; label: string; color: string; bg: string }[] = [
  { key: 'pending',  label: 'Pending',     color: '#f59e0b', bg: '#f0fdf4' },
  { key: 'progress', label: 'In Progress', color: '#3b82f6', bg: '#f0fdf4' },
  { key: 'done',     label: 'Done',        color: '#16a34a', bg: '#f0fdf4' },
]

type ColKey = Task['status']

function Column({
  col, ids, allItems, activeId, onAddClick, onCardClick, canEdit,
}: {
  col: typeof COLUMNS[number]
  ids: number[]
  allItems: Record<number, Task>
  activeId: number | null
  onAddClick: () => void
  onCardClick: (t: Task) => void
  canEdit: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${col.key}` })

  const [addHovered, setAddHovered] = useState(false)

  return (
    <div style={{
      background: isOver ? '#f0fdf4' : '#fafafa',
      borderRadius: 8,
      padding: 12,
      minHeight: 400,
      transition: 'background 0.15s',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
      }}>
        {/* Colored dot */}
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: col.color,
          display: 'inline-block',
          flexShrink: 0,
        }} />

        {/* Status label */}
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1a1a1a',
          flex: 1,
        }}>
          {col.label}
        </span>

        {/* Task count badge */}
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: '#71717a',
          background: '#f4f4f5',
          borderRadius: 10,
          padding: '1px 6px',
        }}>
          {ids.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 60 }}>
          {ids.map(id => {
            const task = allItems[id]
            if (!task) return null
            return (
              <TaskCard
                key={id}
                task={task}
                onClick={() => onCardClick(task)}
                isBeingDragged={id === activeId}
                canEdit={canEdit}
              />
            )
          })}
        </div>
      </SortableContext>

      {/* Add task button */}
      {canEdit && (
        <button
          onClick={onAddClick}
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          style={{
            marginTop: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            color: addHovered ? '#52525b' : '#a1a1aa',
            textAlign: 'left',
            padding: '4px 2px',
            transition: 'color 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          + Add task
        </button>
      )}
    </div>
  )
}

export default function Board({ tasks, onUpdate, onDelete, onCreate, canEdit = true }: Props) {
  const [colIds, setColIds] = useState<Record<ColKey, number[]>>({
    pending: [], progress: [], done: [],
  })
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeOriginCol, setActiveOriginCol] = useState<ColKey | null>(null)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [createStatus, setCreateStatus] = useState<Task['status'] | null>(null)

  useEffect(() => {
    setColIds(prev => {
      const next = {} as Record<ColKey, number[]>
      for (const col of COLUMNS) {
        const kept = prev[col.key].filter(id => tasks.some(t => t.id === id && t.status === col.key))
        const added = tasks.filter(t => t.status === col.key && !prev[col.key].includes(t.id)).map(t => t.id)
        next[col.key] = [...kept, ...added]
      }
      return next
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

  const allSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const noSensors = useSensors()
  const sensors = canEdit ? allSensors : noSensors

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find(t => t.id === active.id) ?? null
    setActiveTask(task)
    setActiveOriginCol(task ? task.status as ColKey : null)
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
        ? overItems.length
        : overItems.indexOf(Number(overId))

      const newOverItems = [...overItems]
      newOverItems.splice(overIndex >= 0 ? overIndex : overItems.length, 0, activeId)

      return { ...prev, [activeCol]: activeItems, [overCol]: newOverItems }
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const activeId = Number(active.id)
    const originCol = activeOriginCol
    setActiveTask(null)
    setActiveOriginCol(null)

    if (!over || !originCol) return

    const overCol = findCol(over.id)
    if (!overCol) return

    if (originCol === overCol) {
      const items = colIds[overCol]
      const oldIdx = items.indexOf(activeId)
      const newIdx = items.indexOf(Number(over.id))
      if (oldIdx !== newIdx && newIdx !== -1) {
        setColIds(prev => ({ ...prev, [overCol]: arrayMove(prev[overCol], oldIdx, newIdx) }))
      }
    } else {
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
              canEdit={canEdit}
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
          onSave={canEdit ? data => onUpdate(editTask.id, data as TaskUpdate) : undefined}
          onDelete={canEdit ? () => onDelete(editTask.id) : undefined}
        />
      )}
      {canEdit && createStatus && (
        <TaskModal
          defaultStatus={createStatus}
          onClose={() => setCreateStatus(null)}
          onSave={data => onCreate(data as TaskCreate)}
        />
      )}
    </>
  )
}
