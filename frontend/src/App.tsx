import { useState, useEffect, useCallback } from 'react'
import { Task, TaskCreate, TaskUpdate, Project } from './types'
import { getTasks, createTask, updateTask, deleteTask, getProjects, createProject, updateProject, deleteProject } from './api'
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

const PROJECT_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('board')
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')

  // Projects
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0])
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [editingProjectName, setEditingProjectName] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [data, projs] = await Promise.all([getTasks(), getProjects()])
      setTasks(data)
      setProjects(projs)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (task: TaskCreate) => {
    const created = await createTask({ ...task, project_id: activeProjectId ?? undefined })
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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    const proj = await createProject(newProjectName.trim(), newProjectColor)
    setProjects(prev => [...prev, proj])
    setActiveProjectId(proj.id)
    setNewProjectName('')
    setNewProjectColor(PROJECT_COLORS[0])
    setShowNewProject(false)
  }

  const handleRenameProject = async (id: number) => {
    if (!editingProjectName.trim()) return
    const updated = await updateProject(id, { name: editingProjectName.trim() })
    setProjects(prev => prev.map(p => p.id === id ? updated : p))
    setEditingProjectId(null)
  }

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Delete this project? Tasks will remain but lose project association.')) return
    await deleteProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
    if (activeProjectId === id) setActiveProjectId(null)
  }

  // Filter tasks by active project, then by search/filter
  const projectTasks = activeProjectId === null
    ? tasks
    : tasks.filter(t => t.project_id === activeProjectId)

  const filtered = projectTasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterModule && t.module !== filterModule) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterAssignee && t.assignee !== filterAssignee) return false
    return true
  })

  const sidebarW = collapsed ? 56 : 220
  const activeProject = projects.find(p => p.id === activeProjectId)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW,
        background: '#111827', display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s', overflow: 'hidden', position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '16px 0' : '16px 20px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1f2937' }}>
          <div style={{ width: 28, height: 28, background: '#16a34a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#fff', fontWeight: 700, marginLeft: collapsed ? 14 : 0 }}>T</div>
          {!collapsed && <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>TaskFlow</span>}
        </div>

        {/* Projects section */}
        {!collapsed && (
          <div style={{ borderBottom: '1px solid #1f2937', padding: '10px 0 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 6px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Projects</span>
              <button
                onClick={() => setShowNewProject(v => !v)}
                title="New project"
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
              >+</button>
            </div>

            {/* All tasks option */}
            <button
              onClick={() => setActiveProjectId(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '6px 16px',
                background: activeProjectId === null ? '#1f2937' : 'none',
                border: 'none', cursor: 'pointer',
                color: activeProjectId === null ? '#f9fafb' : '#9ca3af',
                fontSize: 13, textAlign: 'left',
                borderLeft: activeProjectId === null ? '3px solid #4b5563' : '3px solid transparent',
              }}
            >
              <span style={{ fontSize: 14 }}>◈</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>All tasks</span>
            </button>

            {projects.map(p => (
              <div key={p.id} style={{ position: 'relative' }}>
                {editingProjectId === p.id ? (
                  <div style={{ display: 'flex', padding: '4px 10px', gap: 4 }}>
                    <input
                      autoFocus
                      value={editingProjectName}
                      onChange={e => setEditingProjectName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(p.id); if (e.key === 'Escape') setEditingProjectId(null) }}
                      style={{ flex: 1, fontSize: 12, background: '#1f2937', border: '1px solid #374151', borderRadius: 4, color: '#f9fafb', padding: '2px 6px', minWidth: 0 }}
                    />
                    <button onClick={() => handleRenameProject(p.id)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: 12 }}>✓</button>
                    <button onClick={() => setEditingProjectId(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveProjectId(p.id)}
                    onDoubleClick={() => { setEditingProjectId(p.id); setEditingProjectName(p.name) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '6px 16px',
                      background: activeProjectId === p.id ? '#1f2937' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: activeProjectId === p.id ? '#f9fafb' : '#9ca3af',
                      fontSize: 13, textAlign: 'left',
                      borderLeft: activeProjectId === p.id ? `3px solid ${p.color}` : '3px solid transparent',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <span
                      onClick={e => { e.stopPropagation(); handleDeleteProject(p.id) }}
                      style={{ color: '#4b5563', fontSize: 11, cursor: 'pointer', flexShrink: 0, opacity: 0.7 }}
                      title="Delete project"
                    >✕</span>
                  </button>
                )}
              </div>
            ))}

            {showNewProject && (
              <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  autoFocus
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setShowNewProject(false) }}
                  style={{ fontSize: 12, background: '#1f2937', border: '1px solid #374151', borderRadius: 4, color: '#f9fafb', padding: '4px 8px' }}
                />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {PROJECT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewProjectColor(c)}
                      style={{
                        width: 16, height: 16, borderRadius: '50%', background: c,
                        border: newProjectColor === c ? '2px solid #fff' : '2px solid transparent',
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateProject}
                  style={{ background: newProjectColor, border: 'none', borderRadius: 4, color: '#fff', fontSize: 12, padding: '4px 0', cursor: 'pointer', fontWeight: 600 }}
                >Create</button>
              </div>
            )}
          </div>
        )}

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeProject && (
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: activeProject.color, display: 'inline-block' }} />
            )}
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
              {activeProject ? `${activeProject.name} — ` : ''}{NAV.find(n => n.key === tab)?.label}
            </h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '4px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
              Refresh
            </button>
          </div>
        </header>

        {/* Filter bar — only for task tabs */}
        {(tab === 'board' || tab === 'roadmap') && (
          <FilterBar
            tasks={projectTasks}
            search={search}
            setSearch={setSearch}
            filterModule={filterModule}
            setFilterModule={setFilterModule}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterAssignee={filterAssignee}
            setFilterAssignee={setFilterAssignee}
          />
        )}

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading && tab !== 'meeting-notes' && <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>Loading...</p>}
          {error && <p style={{ color: '#dc2626', textAlign: 'center', padding: 24 }}>{error}</p>}
          {!loading && !error && (
            <>
              <div style={{ display: tab === 'board' ? 'block' : 'none', padding: 24 }}>
                <Board tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} />
              </div>
              <div style={{ display: tab === 'roadmap' ? 'block' : 'none', padding: 24 }}>
                <Roadmap tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} />
              </div>
              {tab === 'milestones' && (
                <div style={{ padding: 24 }}>
                  <MilestonesTab tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} />
                </div>
              )}
              {tab === 'dashboard' && (
                <div style={{ padding: 24 }}>
                  <Dashboard tasks={filtered} />
                </div>
              )}
              {tab === 'meeting-notes' && (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MeetingNotes tasks={tasks} onTasksChange={load} />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
