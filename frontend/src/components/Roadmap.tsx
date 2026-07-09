import { useState, useRef, useEffect } from 'react'
import { Task, TaskCreate, TaskUpdate, ReleaseNote, ProjectMilestone } from '../types'
import { moduleColor } from '../utils/moduleColor'
import TaskModal from './TaskModal'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { getReleaseNotes, getProjectMilestones } from '../api'

interface Props {
  tasks: Task[]
  onUpdate: (id: number, task: TaskUpdate) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onCreate: (task: TaskCreate) => Promise<void>
  activeProjectId?: number | null
  boardId?: number | null
  canEdit?: boolean
  projectModules?: string[]
}

const DEFAULT_MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']
function getProjectModules(projectId?: number | null): string[] {
  try {
    if (projectId) {
      const stored = localStorage.getItem(`modules-${projectId}`)
      if (stored) return JSON.parse(stored)
    }
    return DEFAULT_MODULES
  } catch { return DEFAULT_MODULES }
}
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  pending:  { background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' },
  progress: { background: '#dbeafe', color: '#2563eb', border: '1px solid #bfdbfe' },
  done:     { background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' },
}

type ViewMode = 'week' | 'month' | 'quarter' | 'all'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7)
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeeksInMonth(year: number, month: number) {
  const weeks: { label: string; weekNum: number; dates: Date[] }[] = []
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  let monday = getMonday(firstDay)
  let weekIdx = 1
  while (monday <= lastDay) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(d.getDate() + i); return d
    })
    weeks.push({ label: `Week ${weekIdx}`, weekNum: getWeekNumber(monday), dates: days })
    monday = new Date(monday); monday.setDate(monday.getDate() + 7)
    weekIdx++
  }
  return weeks
}

const NOW = new Date()
const TODAY_MONTH = NOW.getMonth() + 1
const TODAY_YEAR = NOW.getFullYear()
const TODAY_WEEK = getWeekNumber(NOW)
const TODAY_QUARTER_IDX = Math.ceil(TODAY_MONTH / 3)

const QUARTERS_DEF = [
  { key: 'Q1', months: [1,2,3],   labels: ['JAN','FEB','MAR'] },
  { key: 'Q2', months: [4,5,6],   labels: ['APR','MAY','JUN'] },
  { key: 'Q3', months: [7,8,9],   labels: ['JUL','AUG','SEP'] },
  { key: 'Q4', months: [10,11,12],labels: ['OCT','NOV','DEC'] },
]
const ALL_MONTHS = QUARTERS_DEF.flatMap(q => q.months.map((m, i) => ({ month: m, label: q.labels[i], quarter: q.key })))

export default function Roadmap({ tasks, onUpdate, onDelete, onCreate, activeProjectId, boardId, canEdit = true, projectModules = [] }: Props) {
  const taskModules = Array.from(new Set(tasks.map(t => t.module).filter(Boolean)))
  const MODULES = Array.from(new Set([...projectModules, ...taskModules]))
  const [view, setView] = useState<ViewMode>('all')
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [creating, setCreating] = useState<Partial<{ quarter: string; month: number; week: number }> | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const [dragTaskId, setDragTaskId] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [releases, setReleases] = useState<ReleaseNote[]>([])
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([])

  useEffect(() => {
    if (!activeProjectId) { setReleases([]); setMilestones([]); return }
    getReleaseNotes(activeProjectId, boardId ?? undefined).then(setReleases).catch(() => setReleases([]))
    getProjectMilestones(activeProjectId, boardId ?? undefined).then(setMilestones).catch(() => setMilestones([]))
  }, [activeProjectId, boardId])

  // ── Column definitions per view ──
  type Col = { key: string; label: string; sub?: string; isToday?: boolean }

  const columns: Col[] = (() => {
    if (view === 'week') {
      const monday = getMonday(NOW)
      return DAY_LABELS.map((label, i) => {
        const d = new Date(monday); d.setDate(d.getDate() + i)
        const isToday = d.toDateString() === NOW.toDateString()
        return { key: String(i + 1), label, sub: `${d.getDate()}/${d.getMonth() + 1}`, isToday }
      })
    }
    if (view === 'month') {
      const weeks = getWeeksInMonth(TODAY_YEAR, TODAY_MONTH)
      return weeks.map(w => ({
        key: String(w.weekNum),
        label: w.label,
        sub: `W${w.weekNum}`,
        isToday: w.weekNum === TODAY_WEEK,
      }))
    }
    if (view === 'quarter') {
      const q = QUARTERS_DEF[TODAY_QUARTER_IDX - 1]
      return q.months.map((m, i) => ({
        key: String(m), label: q.labels[i],
        isToday: m === TODAY_MONTH,
      }))
    }
    // all — 12 months
    return ALL_MONTHS.map(({ month, label, quarter }) => ({
      key: String(month), label,
      sub: quarter,
      isToday: month === TODAY_MONTH,
    }))
  })()

  // ── Get tasks for a cell ──
  const getColTasks = (module: string, col: Col): Task[] => {
    if (view === 'week') {
      // Show tasks for current month, placed by deadline day of week
      return tasks.filter(t => {
        if (t.module !== module) return false
        if (t.deadline) {
          const d = new Date(t.deadline)
          const weekNum = getWeekNumber(d)
          if (weekNum !== TODAY_WEEK) return false
          const dayOfWeek = d.getDay() || 7
          return String(dayOfWeek) === col.key
        }
        // Tasks without deadline: show in current month, placed on Monday
        return t.month === TODAY_MONTH && t.year === TODAY_YEAR && col.key === '1'
      })
    }
    if (view === 'month') {
      const weekNum = Number(col.key)
      return tasks.filter(t => {
        if (t.module !== module) return false
        if (t.month !== TODAY_MONTH || t.year !== TODAY_YEAR) return false
        if (t.deadline) {
          return getWeekNumber(new Date(t.deadline)) === weekNum
        }
        // Tasks without deadline: show in current week column
        return weekNum === TODAY_WEEK
      })
    }
    if (view === 'quarter' || view === 'all') {
      const month = Number(col.key)
      return tasks.filter(t => {
        if (t.module !== module) return false
        if (t.month === month) return true
        // tasks with no month: show in first month of their quarter
        if (!t.month && t.quarter) {
          const qDef = QUARTERS_DEF.find(q => q.key === t.quarter)
          return qDef?.months[0] === month
        }
        return false
      })
    }
    return []
  }

  const handleDrop = (module: string, col: Col) => {
    if (dragTaskId == null) return
    const task = tasks.find(t => t.id === dragTaskId)
    if (!task || task.module !== module) return
    setDragOver(null)
    setDragTaskId(null)

    if (view === 'all' || view === 'quarter') {
      const month = Number(col.key)
      const qDef = QUARTERS_DEF.find(q => q.months.includes(month))
      onUpdate(task.id, { month, quarter: qDef?.key as Task['quarter'] ?? task.quarter })
    } else if (view === 'month') {
      const weekNum = Number(col.key)
      // Update deadline to Monday of the target week in current month/year
      const jan1 = new Date(TODAY_YEAR, 0, 1)
      const daysOffset = (weekNum - 1) * 7 - (jan1.getDay() || 7) + 1
      const monday = new Date(TODAY_YEAR, 0, 1 + daysOffset)
      const deadline = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
      onUpdate(task.id, { month: TODAY_MONTH, week: weekNum, deadline })
    } else if (view === 'week') {
      const dayOfWeek = Number(col.key) // 1=Mon ... 7=Sun
      const monday = getMonday(NOW)
      const target = new Date(monday)
      target.setDate(monday.getDate() + dayOfWeek - 1)
      const deadline = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
      onUpdate(task.id, { deadline, month: target.getMonth() + 1, week: TODAY_WEEK })
    }
  }

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

  // Get column key for a YYYY-MM-DD date string
  const getColKeyForDate = (dateStr: string): string | null => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    if (view === 'all' || view === 'quarter') return String(d.getMonth() + 1)
    if (view === 'month') return String(getWeekNumber(d))
    if (view === 'week') { const day = d.getDay() || 7; return String(day) }
    return null
  }

  const th: React.CSSProperties = {
    padding: '7px 10px', fontSize: 11, fontWeight: 600,
    color: '#6b7280', border: '1px solid #e5e7eb',
    background: '#f9fafb', textAlign: 'center', whiteSpace: 'nowrap',
  }

  const VIEWS: { key: ViewMode; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'quarter', label: 'Quarter' },
    { key: 'all', label: 'All' },
  ]

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        {/* View toggle */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
          {VIEWS.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              style={{
                padding: '5px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: view === v.key ? '#fff' : 'transparent',
                color: view === v.key ? '#111827' : '#6b7280',
                boxShadow: view === v.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Export */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportPNG} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            ↓ PNG
          </button>
          <button onClick={exportPDF} style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            ↓ PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} style={{ overflowX: 'auto', background: '#fff', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 110, textAlign: 'left' }}>MODULE</th>
              {columns.map(col => (
                <th key={col.key} style={{
                  ...th,
                  background: col.isToday ? '#dcfce7' : '#f9fafb',
                  color: col.isToday ? '#16a34a' : '#6b7280',
                  minWidth: 90,
                }}>
                  <div>{col.label}</div>
                  {col.sub && <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>{col.sub}</div>}
                  {col.isToday && <div style={{ fontSize: 9, color: '#16a34a', fontWeight: 700 }}>TODAY</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ── Release markers row ── */}
            {releases.length > 0 && (
              <tr>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontWeight: 700, fontSize: 11, color: '#0052cc', background: '#e9f2ff', whiteSpace: 'nowrap' }}>
                  🏷 Releases
                </td>
                {columns.map(col => {
                  const colReleases = releases.filter(r => getColKeyForDate(r.date) === col.key)
                  return (
                    <td key={col.key} style={{ padding: colReleases.length ? 4 : 6, border: '1px solid #e5e7eb', background: col.isToday ? '#f0fdf4' : '#f8faff', verticalAlign: 'top' }}>
                      {colReleases.length === 0
                        ? <div style={{ color: '#e5e7eb', fontSize: 14, textAlign: 'center' }}>—</div>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {colReleases.map(r => (
                            <div key={r.id} style={{ background: '#0052cc', color: '#fff', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {r.version}
                            </div>
                          ))}
                        </div>
                      }
                    </td>
                  )
                })}
              </tr>
            )}
            {/* ── Milestone markers row ── */}
            {milestones.length > 0 && (
              <tr>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontWeight: 700, fontSize: 11, color: '#d97706', background: '#fff7e6', whiteSpace: 'nowrap' }}>
                  🎯 Milestones
                </td>
                {columns.map(col => {
                  const colMs = milestones.filter(m => getColKeyForDate(m.target_date) === col.key)
                  return (
                    <td key={col.key} style={{ padding: colMs.length ? 4 : 6, border: '1px solid #e5e7eb', background: col.isToday ? '#f0fdf4' : '#fffdf5', verticalAlign: 'top' }}>
                      {colMs.length === 0
                        ? <div style={{ color: '#e5e7eb', fontSize: 14, textAlign: 'center' }}>—</div>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {colMs.map(m => (
                            <div key={m.id} style={{
                              background: m.status === 'completed' ? '#16a34a' : m.status === 'in_progress' ? '#d97706' : '#42526e',
                              color: '#fff', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                            }}>
                              🎯 {m.name}
                            </div>
                          ))}
                        </div>
                      }
                    </td>
                  )
                })}
              </tr>
            )}
            {MODULES.map(mod => (
              <tr key={mod}>
                <td style={{
                  padding: '8px 10px', border: '1px solid #e5e7eb',
                  fontWeight: 600, fontSize: 12,
                  color: moduleColor(mod),
                  background: '#fafafa', whiteSpace: 'nowrap',
                }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: moduleColor(mod), marginRight: 6 }} />
                  {mod}
                </td>
                {columns.map(col => {
                  const colTasks = getColTasks(mod, col)
                  const cellKey = `${mod}:${col.key}`
                  const isDropTarget = dragOver === cellKey
                  return (
                    <td
                      key={col.key}
                      onDragOver={canEdit ? (e => { e.preventDefault(); setDragOver(cellKey) }) : undefined}
                      onDragLeave={canEdit ? (() => setDragOver(prev => prev === cellKey ? null : prev)) : undefined}
                      onDrop={canEdit ? (() => handleDrop(mod, col)) : undefined}
                      style={{
                        padding: colTasks.length ? 4 : 8,
                        border: isDropTarget ? '2px dashed #16a34a' : '1px solid #e5e7eb',
                        verticalAlign: 'top',
                        background: isDropTarget ? '#f0fdf4' : col.isToday ? '#f0fdf4' : '#fff',
                        cursor: canEdit ? 'pointer' : 'default',
                        transition: 'background 0.1s',
                      }}
                      onClick={() => canEdit && colTasks.length === 0 && !dragTaskId && setCreating({ month: Number(col.key) })}
                    >
                      {colTasks.length === 0 ? (
                        <div style={{ color: '#e5e7eb', fontSize: 16, textAlign: 'center' }}>—</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {colTasks.map(task => (
                            <div
                              key={task.id}
                              draggable={canEdit}
                              onDragStart={canEdit ? (e => { setDragTaskId(task.id); e.dataTransfer.effectAllowed = 'move' }) : undefined}
                              onDragEnd={canEdit ? (() => { setDragTaskId(null); setDragOver(null) }) : undefined}
                              onClick={e => { e.stopPropagation(); setEditTask(task) }}
                              style={{
                                ...STATUS_STYLE[task.status],
                                borderRadius: 5, padding: '3px 6px', fontSize: 11,
                                cursor: canEdit ? 'grab' : 'pointer', lineHeight: 1.4,
                                opacity: dragTaskId === task.id ? 0.4 : 1,
                                transition: 'opacity 0.15s',
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
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editTask && (
        <TaskModal task={editTask} onClose={() => setEditTask(null)}
          onSave={data => onUpdate(editTask.id, data as TaskUpdate)}
          onDelete={() => onDelete(editTask.id)} />
      )}
      {canEdit && creating && (
        <TaskModal defaultQuarter={`Q${TODAY_QUARTER_IDX}`} onClose={() => setCreating(null)}
          onSave={data => onCreate(data as TaskCreate)} />
      )}
    </>
  )
}
