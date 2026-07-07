import { useState, useEffect, useCallback } from 'react'
import { Task, TaskCreate, TaskUpdate, Project } from './types'
import { getTasks, createTask, updateTask, deleteTask, getProjects, createProject, updateProject, deleteProject, authMe, AuthUser, getMembers } from './api'
import Board from './components/Board'
import Roadmap from './components/Roadmap'
import FilterBar from './components/FilterBar'
import MilestonesTab from './components/MilestonesTab'
import Dashboard from './components/Dashboard'
import MeetingNotes from './components/MeetingNotes'
import Settings from './components/Settings'
import KnowledgeBase from './components/KnowledgeBase'
import AuthPage from './components/AuthPage'
import NewProjectModal from './components/NewProjectModal'
import { AuthToken } from './api'

type Tab = 'board' | 'roadmap' | 'milestones' | 'dashboard' | 'meeting-notes' | 'knowledge-base' | 'settings'

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: 'board', label: 'Board', icon: '▦' },
  { key: 'roadmap', label: 'Roadmap', icon: '◫' },
  { key: 'milestones', label: 'Milestones', icon: '◈' },
  { key: 'dashboard', label: 'Dashboard', icon: '◉' },
  { key: 'meeting-notes', label: 'Meeting Notes', icon: '◧' },
  { key: 'knowledge-base', label: 'Knowledge Base', icon: '◭' },
]

const DEFAULT_MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']

const PROJECT_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function App() {
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('member')

  // Check existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) { setAuthLoading(false); return }
    authMe().then(u => setCurrentUser(u)).catch(() => {
      localStorage.removeItem('auth_token')
    }).finally(() => setAuthLoading(false))
  }, [])

  const handleAuth = (res: AuthToken) => {
    localStorage.setItem('auth_token', res.access_token)
    setCurrentUser(res.user)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setCurrentUser(null)
  }

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
  const [activeProjectId, setActiveProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem('activeProjectId')
    return saved ? Number(saved) : null
  })

  const setActiveProjectIdPersisted = (id: number | null) => {
    setActiveProjectId(id)
    if (id == null) localStorage.removeItem('activeProjectId')
    else localStorage.setItem('activeProjectId', String(id))
    setTab('board')
  }
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [editingProjectName, setEditingProjectName] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [data, projs] = await Promise.all([getTasks(), getProjects()])
      setTasks(data)
      setProjects(projs)
      // Auto-select first project if none selected
      if (projs.length > 0) setActiveProjectId(prev => { const id = prev ?? projs[0].id; localStorage.setItem('activeProjectId', String(id)); return id })
      setError(null)
    } catch (e: any) {
      if (e.message?.includes('401')) { handleLogout(); return }
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (currentUser) load() }, [load, currentUser])

  // Fetch role for current project
  useEffect(() => {
    if (!currentUser || !activeProjectId) return
    getMembers(activeProjectId).then(members => {
      const me = members.find(m => m.user_id === currentUser.id)
      setUserRole(me?.role ?? 'member')
    }).catch(() => setUserRole('member'))
  }, [activeProjectId, currentUser])

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

  const handleDeleteProjectTasks = async (projectId: number) => {
    const toDelete = tasks.filter(t => t.project_id === projectId)
    await Promise.all(toDelete.map(t => deleteTask(t.id)))
    setTasks(prev => prev.filter(t => t.project_id !== projectId))
  }

  const handleCreateProject = async (name: string, color: string, modules: string[]) => {
    const proj = await createProject(name, color, modules)
    setProjects(prev => [...prev, proj])
    setActiveProjectIdPersisted(proj.id)
    setShowNewProjectModal(false)
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
    if (activeProjectId === id) setActiveProjectIdPersisted(null)
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
  const isAdmin = userRole === 'admin'

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#6b7280', fontSize: 14 }}>
      Loading...
    </div>
  )

  if (!currentUser) return <AuthPage onAuth={handleAuth} />

  if (!loading && projects.length === 0) return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 56px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 440, width: '90vw', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#111827' }}>Bạn chưa có project nào</h2>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
          Tạo project mới hoặc nhờ admin của workspace invite bạn vào project hiện có.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => setShowNewProjectModal(true)}
            style={{ padding: '11px 0', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            + Tạo project mới
          </button>
          <button
            onClick={handleLogout}
            style={{ padding: '10px 0', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#6b7280', cursor: 'pointer' }}
          >
            Đăng xuất
          </button>
        </div>
      </div>
      {showNewProjectModal && (
        <NewProjectModal
          onConfirm={handleCreateProject}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarW, minWidth: sidebarW,
        background: '#0f172a', display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s', overflow: 'hidden',
        height: '100vh', position: 'sticky', top: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '12px 0' : '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e293b', flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, background: '#16a34a', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: '#fff', fontWeight: 700, marginLeft: collapsed ? 15 : 0 }}>T</div>
          {!collapsed && <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>TaskFlow</span>}
        </div>

        {/* Projects section */}
        {!collapsed && (
          <div style={{ borderBottom: '1px solid #1e293b', padding: '8px 0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 4px' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Projects</span>
              <button
                onClick={() => setShowNewProjectModal(true)}
                title="New project"
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}
              >+</button>
            </div>

            {projects.map(p => (
              <div
                key={p.id}
                style={{ position: 'relative' }}
                onMouseEnter={() => setHoveredProjectId(p.id)}
                onMouseLeave={() => setHoveredProjectId(null)}
              >
                {editingProjectId === p.id ? (
                  <div style={{ display: 'flex', padding: '4px 8px', gap: 4 }}>
                    <input
                      autoFocus
                      value={editingProjectName}
                      onChange={e => setEditingProjectName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(p.id); if (e.key === 'Escape') setEditingProjectId(null) }}
                      style={{ flex: 1, fontSize: 12, background: '#1e293b', border: '1px solid #334155', borderRadius: 4, color: '#f1f5f9', padding: '2px 6px', minWidth: 0 }}
                    />
                    <button onClick={() => handleRenameProject(p.id)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: 12 }}>✓</button>
                    <button onClick={() => setEditingProjectId(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveProjectIdPersisted(p.id)}
                    onDoubleClick={() => { setEditingProjectId(p.id); setEditingProjectName(p.name) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      width: '100%', height: 28, padding: '0 8px 0 12px',
                      background: activeProjectId === p.id || hoveredProjectId === p.id ? '#1e293b' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: activeProjectId === p.id ? '#f1f5f9' : '#94a3b8',
                      fontSize: 13, fontWeight: 400, textAlign: 'left',
                      borderLeft: activeProjectId === p.id ? '2px solid #16a34a' : '2px solid transparent',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteProject(p.id) }}
                      style={{
                        background: 'none', border: 'none', color: '#475569', fontSize: 10, cursor: 'pointer',
                        flexShrink: 0, padding: '0 2px', lineHeight: 1,
                        opacity: hoveredProjectId === p.id ? 1 : 0,
                        transition: 'opacity 0.1s',
                      }}
                      title="Delete project"
                    >✕</button>
                  </button>
                )}
              </div>
            ))}

          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 0' }}>
          {NAV.map(n => (
            <button
              key={n.key}
              onClick={() => setTab(n.key)}
              title={collapsed ? n.label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', height: 28,
                padding: collapsed ? '0' : '0 8px 0 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                boxSizing: 'border-box',
                background: tab === n.key ? '#1e293b' : 'none',
                border: 'none', cursor: 'pointer',
                color: tab === n.key ? '#e2e8f0' : '#64748b',
                fontSize: 13, fontWeight: 400,
                borderLeft: tab === n.key ? '2px solid #16a34a' : '2px solid transparent',
                transition: 'background 0.1s, color 0.1s',
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, fontFamily: 'monospace' }}>{n.icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{n.label}</span>}
            </button>
          ))}
        </nav>

        {/* Settings nav item — admin only */}
        {isAdmin && <div style={{ padding: '4px 0', borderTop: '1px solid #1e293b', flexShrink: 0 }}>
          <button
            onClick={() => setTab('settings')}
            title={collapsed ? 'Settings' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', height: 28,
              padding: collapsed ? '0' : '0 8px 0 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              boxSizing: 'border-box',
              background: tab === 'settings' ? '#1e293b' : 'none',
              border: 'none', cursor: 'pointer',
              color: tab === 'settings' ? '#e2e8f0' : '#64748b',
              fontSize: 13, fontWeight: 400,
              borderLeft: tab === 'settings' ? '2px solid #16a34a' : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0, fontFamily: 'monospace' }}>⚙</span>
            {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Settings</span>}
          </button>
        </div>}

        {/* User */}
        <div style={{
          padding: collapsed ? '0' : '0 12px',
          borderTop: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', gap: 8,
          justifyContent: collapsed ? 'center' : 'flex-start',
          height: 40, flexShrink: 0,
        }}>
          <div style={{ width: 24, height: 24, background: '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <>
              <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{currentUser.name}</span>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: '2px 4px', lineHeight: 1 }}
              >↩</button>
            </>
          )}
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            position: 'absolute', top: 14, right: -12,
            width: 22, height: 22, borderRadius: '50%',
            background: '#1e293b', border: '1px solid #334155',
            color: '#64748b', cursor: 'pointer', fontSize: 11,
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
        <header style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9', padding: '0 24px', display: 'flex', alignItems: 'center', height: 44, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeProject && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeProject.color, display: 'inline-block', flexShrink: 0 }} />
            )}
            <h1 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              {tab === 'settings' ? 'Settings' : `${activeProject && tab !== 'knowledge-base' ? `${activeProject.name} — ` : activeProject ? `${activeProject.name} — ` : ''}${NAV.find(n => n.key === tab)?.label ?? tab}`}
            </h1>
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
            activeProjectId={activeProjectId}
            projectModules={activeProject?.modules ?? []}
          />
        )}

        {/* Content */}
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading && tab !== 'meeting-notes' && <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>Loading...</p>}
          {error && <p style={{ color: '#dc2626', textAlign: 'center', padding: 24 }}>{error}</p>}
          {!loading && !error && (
            <>
              <div style={{ display: tab === 'board' ? 'block' : 'none', padding: 24 }}>
                <Board tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} canEdit={isAdmin} />
              </div>
              <div style={{ display: tab === 'roadmap' ? 'block' : 'none', padding: 24 }}>
                <Roadmap tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} activeProjectId={activeProjectId} canEdit={isAdmin} projectModules={activeProject?.modules ?? []} />
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
                  <MeetingNotes tasks={projectTasks} onTasksChange={load} activeProjectId={activeProjectId} canEdit={isAdmin} />
                </div>
              )}
              {tab === 'knowledge-base' && (
                <KnowledgeBase activeProjectId={activeProjectId} />
              )}
              {tab === 'settings' && (
                <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
                  <Settings
                    key={activeProjectId}
                    project={activeProject ?? null}
                    projects={projects}
                    tasks={tasks}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    onProjectChange={updated => setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))}
                    onProjectDelete={id => { setProjects(prev => prev.filter(p => p.id !== id)); if (activeProjectId === id) setActiveProjectIdPersisted(null) }}
                    onTasksChange={load}
                    onDeleteProjectTasks={handleDeleteProjectTasks}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {showNewProjectModal && (
        <NewProjectModal
          onConfirm={handleCreateProject}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}
    </div>
  )
}
