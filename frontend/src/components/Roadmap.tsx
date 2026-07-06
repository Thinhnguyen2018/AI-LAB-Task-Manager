import { useState, useRef } from 'react'
import { Task, TaskCreate, TaskUpdate } from '../types'
import TaskModal from './TaskModal'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface Props {
  tasks: Task[]
  onUpdate: (id: number, task: TaskUpdate) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onCreate: (task: TaskCreate) => Promise<void>
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']

const MODULE_COLORS: Record<string, string> = {
  GreenRAG: '#16a34a',
  'Doc-Intelli': '#2563eb',
  Infra: '#d97706',
  Integration: '#7c3aed',
  Milestone: '#db2777',
  Release: '#0891b2',
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending: { background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' },
  progress: { background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' },
  done: { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' },
}

export default function Roadmap({ tasks, onUpdate, onDelete, onCreate }: Props) {
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [creating, setCreating] = useState<{ quarter: string } | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const exportPNG = async () => {
    if (!tableRef.current) return
    const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true })
    const link = document.createElement('a')
    link.download = 'roadmap.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const exportPDF = async () => {
    if (!tableRef.current) return
    const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2)
    pdf.save('roadmap.pdf')
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <button onClick={exportPNG} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
          ↓ Export PNG
        </button>
        <button onClick={exportPDF} style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
          ↓ Export PDF
        </button>
      </div>
      <div ref={tableRef} style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 13, color: '#6b7280', fontWeight: 600, border: '1px solid #e5e7eb', width: 120 }}>Module</th>
              {QUARTERS.map(q => (
                <th key={q} style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: '#6b7280', fontWeight: 600, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{q}</span>
                    <button
                      onClick={() => setCreating({ quarter: q })}
                      style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 16, cursor: 'pointer' }}
                      title="Add task"
                    >
                      +
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => (
              <tr key={mod}>
                <td style={{ padding: '10px 14px', border: '1px solid #e5e7eb', fontWeight: 600, fontSize: 13, color: MODULE_COLORS[mod] ?? '#374151' }}>
                  {mod}
                </td>
                {QUARTERS.map(q => {
                  const qTasks = tasks.filter(t => t.module === mod && t.quarter === q)
                  return (
                    <td key={q} style={{ padding: 8, border: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {qTasks.map(task => (
                          <div
                            key={task.id}
                            onClick={() => setEditTask(task)}
                            style={{
                              ...STATUS_STYLE[task.status],
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: 12,
                              cursor: 'pointer',
                              lineHeight: 1.4,
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{task.title}</div>
                            {task.assignee && <div style={{ opacity: 0.7 }}>{task.assignee}</div>}
                          </div>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
          defaultQuarter={creating.quarter}
          onClose={() => setCreating(null)}
          onSave={data => onCreate(data as TaskCreate)}
        />
      )}
    </>
  )
}
