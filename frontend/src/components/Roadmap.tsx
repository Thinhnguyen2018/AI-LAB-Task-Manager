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

const QUARTERS = [
  { key: 'Q1', months: [1, 2, 3], labels: ['JAN', 'FEB', 'MAR'] },
  { key: 'Q2', months: [4, 5, 6], labels: ['APR', 'MAY', 'JUN'] },
  { key: 'Q3', months: [7, 8, 9], labels: ['JUL', 'AUG', 'SEP'] },
  { key: 'Q4', months: [10, 11, 12], labels: ['OCT', 'NOV', 'DEC'] },
]

const TODAY_MONTH = new Date().getMonth() + 1
const TODAY_QUARTER = QUARTERS.find(q => q.months.includes(TODAY_MONTH))?.key

export default function Roadmap({ tasks, onUpdate, onDelete, onCreate }: Props) {
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [creating, setCreating] = useState<{ quarter: string; month?: number } | null>(null)
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

  const getTasksForCell = (module: string, month: number) =>
    tasks.filter(t => t.module === module && t.month === month)

  const getTasksForQuarter = (module: string, quarter: string) =>
    tasks.filter(t => t.module === module && t.quarter === quarter && !t.month)

  const th: React.CSSProperties = {
    padding: '6px 10px', fontSize: 11, fontWeight: 600,
    color: '#6b7280', border: '1px solid #e5e7eb',
    background: '#f9fafb', textAlign: 'center', whiteSpace: 'nowrap',
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

      <div ref={tableRef} style={{ overflowX: 'auto', background: '#fff', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            {/* Quarter row */}
            <tr>
              <th style={{ ...th, width: 110 }}>MODULE</th>
              {QUARTERS.map(q => (
                <th
                  key={q.key}
                  colSpan={3}
                  style={{
                    ...th,
                    background: TODAY_QUARTER === q.key ? '#f0fdf4' : '#f9fafb',
                    color: TODAY_QUARTER === q.key ? '#16a34a' : '#374151',
                    fontWeight: 700, fontSize: 13,
                    borderBottom: 'none',
                  }}
                >
                  {q.key}
                  {TODAY_QUARTER === q.key && (
                    <span style={{ marginLeft: 6, background: '#16a34a', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>TODAY</span>
                  )}
                </th>
              ))}
            </tr>
            {/* Month row */}
            <tr>
              <th style={th} />
              {QUARTERS.flatMap(q =>
                q.labels.map((label, i) => {
                  const month = q.months[i]
                  const isToday = month === TODAY_MONTH
                  return (
                    <th key={`${q.key}-${label}`} style={{
                      ...th,
                      background: isToday ? '#dcfce7' : '#f9fafb',
                      color: isToday ? '#16a34a' : '#6b7280',
                      borderTop: 'none',
                      position: 'relative',
                    }}>
                      {label}
                      {isToday && <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 2, height: 4, background: '#16a34a' }} />}
                    </th>
                  )
                })
              )}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => (
              <tr key={mod}>
                <td style={{
                  padding: '8px 10px', border: '1px solid #e5e7eb',
                  fontWeight: 600, fontSize: 12,
                  color: MODULE_COLORS[mod] ?? '#374151',
                  background: '#fafafa', whiteSpace: 'nowrap',
                }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: MODULE_COLORS[mod], marginRight: 6 }} />
                  {mod}
                </td>
                {QUARTERS.flatMap(q =>
                  q.months.map(month => {
                    const monthTasks = getTasksForCell(mod, month)
                    const quarterTasks = month === q.months[0] ? getTasksForQuarter(mod, q.key) : []
                    const allTasks = [...monthTasks, ...quarterTasks]
                    const isToday = month === TODAY_MONTH
                    return (
                      <td
                        key={`${mod}-${month}`}
                        style={{
                          padding: allTasks.length ? 4 : 8,
                          border: '1px solid #e5e7eb',
                          verticalAlign: 'top',
                          background: isToday ? '#f0fdf4' : '#fff',
                          minWidth: 90,
                          cursor: 'pointer',
                        }}
                        onClick={() => allTasks.length === 0 && setCreating({ quarter: q.key, month })}
                      >
                        {allTasks.length === 0 ? (
                          <div style={{ color: '#d1d5db', fontSize: 18, textAlign: 'center', lineHeight: 1 }}>—</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {allTasks.map(task => (
                              <div
                                key={task.id}
                                onClick={e => { e.stopPropagation(); setEditTask(task) }}
                                style={{
                                  ...STATUS_STYLE[task.status],
                                  borderRadius: 5,
                                  padding: '3px 6px',
                                  fontSize: 11,
                                  cursor: 'pointer',
                                  lineHeight: 1.4,
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>{task.title}</div>
                                {task.assignee && <div style={{ opacity: 0.7, fontSize: 10 }}>{task.assignee}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )
                  })
                )}
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
