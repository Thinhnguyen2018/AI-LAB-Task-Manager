import { useState } from 'react'
import { Task, TaskCreate, TaskUpdate } from '../types'
import TaskModal from './TaskModal'

interface Props {
  tasks: Task[]
  onUpdate: (id: number, task: TaskUpdate) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onCreate: (task: TaskCreate) => Promise<void>
}

export default function MilestonesTab({ tasks, onUpdate, onDelete, onCreate }: Props) {
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  const milestones = tasks.filter(t => t.module === 'Milestone' || t.module === 'Release')
  const byQuarter: Record<string, Task[]> = {}
  for (const t of milestones) {
    if (!byQuarter[t.quarter]) byQuarter[t.quarter] = []
    byQuarter[t.quarter].push(t)
  }

  const STATUS_COLORS: Record<string, string> = {
    pending: '#d97706',
    progress: '#2563eb',
    done: '#16a34a',
  }

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Milestones & Releases</h2>
          <button
            onClick={() => setCreating(true)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 600 }}
          >
            + Add Milestone
          </button>
        </div>

        {milestones.length === 0 && (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>No milestones yet. Create one with the button above.</p>
        )}

        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
          const qTasks = byQuarter[q]
          if (!qTasks || qTasks.length === 0) return null
          return (
            <div key={q} style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 12, paddingBottom: 6, borderBottom: '2px solid #e5e7eb' }}>{q}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {qTasks.sort((a, b) => (a.month ?? 99) - (b.month ?? 99)).map(task => (
                  <div
                    key={task.id}
                    onClick={() => setEditTask(task)}
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: STATUS_COLORS[task.status] ?? '#6b7280',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {task.module}
                        {task.assignee && ` · ${task.assignee}`}
                        {task.month && ` · Month ${task.month}`}
                        {task.week && ` · Week ${task.week}`}
                        {task.deadline && ` · Due ${task.deadline}`}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 12,
                      background: STATUS_COLORS[task.status] + '20',
                      color: STATUS_COLORS[task.status] ?? '#6b7280',
                    }}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {editTask && (
        <TaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={data => onUpdate(editTask.id, data as TaskUpdate)}
          onDelete={() => onDelete(editTask.id)}
        />
      )}
      {creating && (
        <TaskModal
          onClose={() => setCreating(false)}
          onSave={data => onCreate(data as TaskCreate)}
        />
      )}
    </>
  )
}
