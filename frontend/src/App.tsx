import { useState, useEffect, useCallback } from 'react'
import { Task, TaskCreate, TaskUpdate } from './types'
import { getTasks, createTask, updateTask, deleteTask, seedTasks } from './api'
import Board from './components/Board'
import Roadmap from './components/Roadmap'
import FilterBar from './components/FilterBar'
import MilestonesTab from './components/MilestonesTab'
import Dashboard from './components/Dashboard'

type Tab = 'board' | 'roadmap' | 'milestones' | 'dashboard'

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('board')
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterQuarter, setFilterQuarter] = useState('')
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

  const handleSeed = async () => {
    await seedTasks()
    load()
  }

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterModule && t.module !== filterModule) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterQuarter && t.quarter !== filterQuarter) return false
    if (filterAssignee && t.assignee !== filterAssignee) return false
    return true
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'board', label: 'Kanban Board' },
    { key: 'roadmap', label: 'Roadmap' },
    { key: 'milestones', label: 'Milestones' },
    { key: 'dashboard', label: 'Dashboard' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header */}
      <header style={{ background: '#15803d', color: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 56 }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>GreenNode AI Lab</span>
        <span style={{ opacity: 0.6, fontSize: 14 }}>Task Manager</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={load}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 13 }}
          >
            Refresh
          </button>
          <button
            onClick={handleSeed}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 13 }}
          >
            Seed
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex', gap: 4 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#16a34a' : '#6b7280',
              borderBottom: tab === t.key ? '2px solid #16a34a' : '2px solid transparent',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
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
        filterAssignee={filterAssignee}
        setFilterAssignee={setFilterAssignee}
      />

      {/* Content */}
      <main style={{ padding: 24 }}>
        {loading && <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading...</p>}
        {error && <p style={{ color: '#dc2626', textAlign: 'center' }}>{error}</p>}
        {!loading && !error && (
          <>
            {tab === 'board' && (
              <Board
                tasks={filtered}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onCreate={handleCreate}
              />
            )}
            {tab === 'roadmap' && (
              <Roadmap
                tasks={filtered}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onCreate={handleCreate}
              />
            )}
            {tab === 'milestones' && (
              <MilestonesTab
                tasks={filtered}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onCreate={handleCreate}
              />
            )}
            {tab === 'dashboard' && (
              <Dashboard tasks={filtered} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
