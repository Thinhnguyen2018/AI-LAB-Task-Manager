import { useState, useEffect, useCallback } from 'react'
import { Task, TaskCreate, TaskUpdate } from './types'
import { getTasks, createTask, updateTask, deleteTask } from './api'
import Board from './components/Board'
import Roadmap from './components/Roadmap'
import FilterBar from './components/FilterBar'
import MilestonesTab from './components/MilestonesTab'
import Dashboard from './components/Dashboard'
import MeetingNotes from './components/MeetingNotes'

type Tab = 'board' | 'roadmap' | 'milestones' | 'dashboard' | 'meeting-notes'

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: 'board', label: 'Board', icon: '▦' },
  { key: 'roadmap', label: 'Roadmap', icon: '◫' },
  { key: 'milestones', label: 'Milestones', icon: '◈' },
  { key: 'dashboard', label: 'Dashboard', icon: '◉' },
  { key: 'meeting-notes', label: 'Meeting Notes', icon: '◧' },
]

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('board')
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterQuarter, setFilterQuarter] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterWeek, setFilterWeek] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getTasks()
      setTasks(data)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (task: TaskCreate) => {
    const created = await createTask(task)
    setTasks(prev => [...prev, created])
  }

  const handleUpdate = async (id: number, task: TaskUpdate) => {
    const updated = await updateTask(id, task)
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
  }

  const handleDelete = async (id: number) => {
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterModule && t.module !== filterModule) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterQuarter && t.quarter !== filterQuarter) return false
    if (filterMonth && String(t.month) !== filterMonth) return false
    if (filterWeek && String(t.week) !== filterWeek) return false
    if (filterAssignee && t.assignee !== filterAssignee) return false
    return true
  })

  const sidebarW = collapsed ? 56 : 200

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarW,
        minWidth: sidebarW,
        background: '#111827',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '16px 0' : '16px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1f2937' }}>
          <div style={{ width: 28, height: 28, background: '#16a34a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#fff', fontWeight: 700, marginLeft: collapsed ? 14 : 0 }}>T</div>
          {!collapsed && <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>TaskFlow</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              title={collapsed ? n.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: collapsed ? '10px 0' : '10px 20px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: tab === n.key ? '#1f2937' : 'none',
                border: 'none', cursor: 'pointer',
                color: tab === n.key ? '#4ade80' : '#9ca3af',
                fontSize: 14, fontWeight: tab === n.key ? 600 : 400,
                borderLeft: tab === n.key ? '3px solid #16a34a' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{n.label}</span>}
            </button>
          ))}
        </nav>

        {/* User */}
        {!collapsed && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#374151', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>T</div>
            <span style={{ color: '#9ca3af', fontSize: 13, whiteSpace: 'nowrap' }}>Thinh</span>
          </div>
        )}

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            position: 'absolute', top: 14, right: -12,
            width: 24, height: 24, borderRadius: '50%',
            background: '#374151', border: '1px solid #4b5563',
            color: '#9ca3af', cursor: 'pointer', fontSize: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex', alignItems: 'center', height: 52, gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
            {NAV.find(n => n.key === tab)?.label}
          </h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '4px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
              Refresh
            </button>
          </div>
        </header>

        {/* Filter bar — only for task tabs */}
        {tab !== 'meeting-notes' && (
          <FilterBar
            tasks={tasks}
            search={search}
            setSearch={setSearch}
            filterModule={filterModule}
            setFilterModule={setFilterModule}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterQuarter={filterQuarter}
            setFilterQuarter={setFilterQuarter}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            filterWeek={filterWeek}
            setFilterWeek={setFilterWeek}
            filterAssignee={filterAssignee}
            setFilterAssignee={setFilterAssignee}
          />
        )}

        {/* Content */}
        <main style={{ flex: 1, padding: tab === 'meeting-notes' ? 0 : 24, overflow: 'auto' }}>
          {loading && tab !== 'meeting-notes' && <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading...</p>}
          {error && <p style={{ color: '#dc2626', textAlign: 'center' }}>{error}</p>}
          {tab === 'board' && !loading && !error && (
            <Board tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} />
          )}
          {tab === 'roadmap' && !loading && !error && (
            <Roadmap tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} />
          )}
          {tab === 'milestones' && !loading && !error && (
            <MilestonesTab tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} />
          )}
          {tab === 'dashboard' && !loading && !error && (
            <Dashboard tasks={filtered} />
          )}
          {tab === 'meeting-notes' && (
            <MeetingNotes tasks={tasks} onTasksChange={load} />
          )}
        </main>
      </div>
    </div>
  )
}
