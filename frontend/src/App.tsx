import { useState, useEffect, useCallback, useRef } from 'react'
import { Task, TaskCreate, TaskUpdate, Project, Board } from './types'
import { getTasks, createTask, updateTask, deleteTask, getProjects, createProject, updateProject, deleteProject, authMe, AuthUser, getMembers, getBoards, createBoard, updateBoard, deleteBoard } from './api'
import BoardView from './components/Board'
import Roadmap from './components/Roadmap'
import FilterBar from './components/FilterBar'
import MilestonesTab from './components/MilestonesTab'
import Dashboard from './components/Dashboard'
import MeetingNotes from './components/MeetingNotes'
import Settings from './components/Settings'
import KnowledgeBase from './components/KnowledgeBase'
import AccountSettingsPage from './components/AccountSettings'
import AuthPage from './components/AuthPage'
import NewProjectModal from './components/NewProjectModal'
import { AuthToken } from './api'

type Tab = 'board' | 'roadmap' | 'milestones' | 'dashboard' | 'meeting-notes' | 'knowledge-base' | 'settings' | 'account-settings'

const NAV: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'board', label: 'Board', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="14" rx="1.5"/><rect x="9" y="1" width="6" height="9" rx="1.5"/></svg>
  )},
  { key: 'roadmap', label: 'Roadmap', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="3" width="9" height="2.5" rx="1.25"/><rect x="1" y="6.75" width="14" height="2.5" rx="1.25"/><rect x="5" y="10.5" width="10" height="2.5" rx="1.25"/></svg>
  )},
  { key: 'milestones', label: 'Milestones', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )},
  { key: 'dashboard', label: 'Dashboard', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6.5" height="6.5" rx="1.5"/><rect x="8.5" y="1" width="6.5" height="3" rx="1.5"/><rect x="8.5" y="5.5" width="6.5" height="3" rx="1.5"/><rect x="1" y="8.5" width="14" height="6.5" rx="1.5"/></svg>
  )},
  { key: 'meeting-notes', label: 'Meeting Notes', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1" width="12" height="14" rx="2"/><line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="11" x2="8" y2="11"/></svg>
  )},
  { key: 'knowledge-base', label: 'Knowledge Base', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M10 2v3h3"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="11" x2="9" y2="11"/></svg>
  )},
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
  // Boards
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null)
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null)
  const [editingBoardName, setEditingBoardName] = useState('')

  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
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

  // Close project dropdown on outside click
  useEffect(() => {
    if (!showProjectDropdown) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-project-switcher]')) setShowProjectDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showProjectDropdown])

  // Close account menu on outside click
  useEffect(() => {
    if (!showAccountMenu) return
    const handler = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node))
        setShowAccountMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAccountMenu])


  // Fetch role for current project
  useEffect(() => {
    if (!currentUser || !activeProjectId) return
    getMembers(activeProjectId).then(members => {
      const me = members.find(m => m.user_id === currentUser.id)
      setUserRole(me?.role ?? 'member')
    }).catch(() => setUserRole('member'))
  }, [activeProjectId, currentUser])

  // Load boards when project changes; auto-create default board for old projects
  useEffect(() => {
    if (!activeProjectId) { setBoards([]); setActiveBoardId(null); return }
    getBoards(activeProjectId).then(async bs => {
      if (bs.length === 0) {
        const b = await createBoard('Main Board', activeProjectId)
        setBoards([b]); setActiveBoardId(b.id)
      } else {
        setBoards(bs)
        setActiveBoardId(prev => bs.find(b => b.id === prev) ? prev : (bs[0]?.id ?? null))
      }
    }).catch(() => setBoards([]))
  }, [activeProjectId])

  const handleCreate = async (task: TaskCreate) => {
    const created = await createTask({ ...task, project_id: activeProjectId ?? undefined, board_id: activeBoardId ?? undefined })
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

  // Filter tasks by active project + active board, then by search/filter
  const projectTasks = activeProjectId === null
    ? tasks
    : tasks.filter(t => t.project_id === activeProjectId)

  const boardTasks = activeBoardId === null
    ? projectTasks
    : projectTasks.filter(t => t.board_id === activeBoardId || (!t.board_id && boards.length > 0 && boards[0].id === activeBoardId))

  const filtered = boardTasks.filter(t => {
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f4f5f7' }}>
      {/* Top global header — Jira style */}
      <header style={{
        height: 48, background: '#0052cc', display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 0, flexShrink: 0, zIndex: 100,
        boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24 }}>
          <div style={{ width: 28, height: 28, background: '#fff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0052cc', letterSpacing: '-1px' }}>T</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>TaskFlow</span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Create button */}
        <button
          onClick={() => setShowNewProjectModal(true)}
          style={{
            background: '#fff', color: '#0052cc', border: 'none',
            borderRadius: 3, padding: '0 12px', height: 30,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            marginRight: 12, whiteSpace: 'nowrap',
          }}
        >+ New Project</button>

        {/* User avatar + account menu */}
        <div ref={accountMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAccountMenu(v => !v)}
            title={`${currentUser.name} — ${userRole}`}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: showAccountMenu ? '#1a56db' : '#0747a6',
              border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            }}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </button>

          {showAccountMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 500,
              background: '#fff', borderRadius: 6, width: 180,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)', border: '1px solid #dfe1e6',
              overflow: 'hidden',
            }}>
              {/* User info row */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #dfe1e6' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#172b4d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
                <div style={{ fontSize: 11, color: '#6b778c', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email}</div>
              </div>
              {/* Settings */}
              <button
                onClick={() => { setTab('account-settings'); setShowAccountMenu(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#172b4d', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f4f5f7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/></svg>
                Account settings
              </button>
              {/* Logout */}
              <button
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 14px', background: 'none', border: 'none', borderTop: '1px solid #dfe1e6', cursor: 'pointer', fontSize: 13, color: '#de350b', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fff4f3')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3M10 11l4-4-4-4M14 8H6"/></svg>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <aside style={{
          width: sidebarW, minWidth: sidebarW,
          background: '#fff',
          borderRight: '1px solid #dfe1e6',
          display: 'flex', flexDirection: 'column',
          transition: 'width 0.2s', overflow: 'hidden',
          height: 'calc(100vh - 48px)', position: 'sticky', top: 48,
        }}>
          {/* Active project header — click to switch */}
          <div data-project-switcher style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowProjectDropdown(v => !v)}
              title={collapsed ? (activeProject?.name ?? 'Switch project') : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: collapsed ? '12px 0' : '12px 16px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: showProjectDropdown ? '#f4f5f7' : 'none',
                border: 'none', borderBottom: '1px solid #dfe1e6',
                cursor: 'pointer', boxSizing: 'border-box',
              }}
              onMouseEnter={e => { if (!showProjectDropdown) (e.currentTarget as HTMLButtonElement).style.background = '#f4f5f7' }}
              onMouseLeave={e => { if (!showProjectDropdown) (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
            >
              {activeProject ? (
                <div style={{
                  width: 30, height: 30, borderRadius: 6, background: activeProject.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {activeProject.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div style={{ width: 30, height: 30, borderRadius: 6, background: '#dfe1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>📋</div>
              )}
              {!collapsed && (
                <>
                  <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#172b4d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activeProject?.name ?? 'Select project'}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b778c', marginTop: 1 }}>Software project</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6b778c" strokeWidth="1.8"
                    style={{ flexShrink: 0, transform: showProjectDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <path d="M2 4l4 4 4-4"/>
                  </svg>
                </>
              )}
            </button>

            {/* Dropdown */}
            {showProjectDropdown && !collapsed && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                background: '#fff', border: '1px solid #dfe1e6', borderTop: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              }}>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setActiveProjectIdPersisted(p.id); setShowProjectDropdown(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 16px', boxSizing: 'border-box',
                      background: activeProjectId === p.id ? '#e9f2ff' : 'none',
                      border: 'none', borderBottom: '1px solid #f4f5f7',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (activeProjectId !== p.id) (e.currentTarget as HTMLButtonElement).style.background = '#f4f5f7' }}
                    onMouseLeave={e => { if (activeProjectId !== p.id) (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 4, background: p.color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                    }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, color: activeProjectId === p.id ? '#0052cc' : '#172b4d', fontWeight: activeProjectId === p.id ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </span>
                    {activeProjectId === p.id && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#0052cc" strokeWidth="2" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <path d="M2 6l3 3 5-5"/>
                      </svg>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => { setShowNewProjectModal(true); setShowProjectDropdown(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 16px', boxSizing: 'border-box',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: '#0052cc', fontWeight: 600,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#f4f5f7'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                >
                  + New project
                </button>
              </div>
            )}
          </div>

          {/* Nav section label */}
          {!collapsed && (
            <div style={{ padding: '12px 16px 4px', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6b778c', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Planning</span>
            </div>
          )}

          {/* Nav items */}
          <nav style={{ padding: '2px 8px', flexShrink: 0 }}>
            {NAV.map(n => {
              const active = tab === n.key
              return (
                <button
                  key={n.key}
                  onClick={() => setTab(n.key)}
                  title={collapsed ? n.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', height: 36,
                    padding: collapsed ? '0' : '0 10px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    boxSizing: 'border-box',
                    background: active ? '#e9f2ff' : 'none',
                    border: 'none', cursor: 'pointer',
                    color: active ? '#0052cc' : '#42526e',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    borderRadius: 4,
                    transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#f4f5f7' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: active ? '#0052cc' : '#6b778c' }}>{n.icon}</span>
                  {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{n.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Settings — admin only */}
          {isAdmin && (
            <div style={{ padding: '2px 8px', flexShrink: 0 }}>
              <button
                onClick={() => setTab('settings')}
                title={collapsed ? 'Settings' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', height: 36,
                  padding: collapsed ? '0' : '0 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  boxSizing: 'border-box',
                  background: tab === 'settings' ? '#e9f2ff' : 'none',
                  border: 'none', cursor: 'pointer',
                  color: tab === 'settings' ? '#0052cc' : '#42526e',
                  fontSize: 13, fontWeight: tab === 'settings' ? 600 : 400,
                  borderRadius: 4,
                }}
                onMouseEnter={e => { if (tab !== 'settings') (e.currentTarget as HTMLButtonElement).style.background = '#f4f5f7' }}
                onMouseLeave={e => { if (tab !== 'settings') (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: tab === 'settings' ? '#0052cc' : '#6b778c' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/></svg>
                </span>
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>Project Settings</span>}
              </button>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              position: 'absolute', top: 60, right: -12,
              width: 22, height: 22, borderRadius: '50%',
              background: '#fff', border: '1px solid #dfe1e6',
              color: '#6b778c', cursor: 'pointer', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </aside>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Sub-header */}
          <div style={{ background: '#fff', borderBottom: '1px solid #dfe1e6', padding: '0 24px', display: 'flex', alignItems: 'center', height: 40, gap: 8, flexShrink: 0 }}>
            {activeProject && (
              <>
                <span style={{ fontSize: 12, color: '#6b778c' }}>{activeProject.name}</span>
                <span style={{ color: '#dfe1e6' }}>/</span>
              </>
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: '#172b4d' }}>
              {tab === 'settings' ? 'Project Settings' : NAV.find(n => n.key === tab)?.label ?? tab}
            </span>
            {isAdmin && <span style={{ marginLeft: 8, fontSize: 11, background: '#e9f2ff', color: '#0052cc', borderRadius: 3, padding: '2px 7px', fontWeight: 600 }}>Admin</span>}
          </div>

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
        <main style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {loading && tab !== 'meeting-notes' && <p style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>Loading...</p>}
          {error && <p style={{ color: '#dc2626', textAlign: 'center', padding: 24 }}>{error}</p>}
          {!loading && !error && (
            <>
              <div style={{ display: tab === 'board' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                {/* Board switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 24px 0', borderBottom: '1px solid #dfe1e6', background: '#fff', flexShrink: 0 }}>
                  {boards.map(b => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {editingBoardId === b.id ? (
                        <input
                          autoFocus
                          value={editingBoardName}
                          onChange={e => setEditingBoardName(e.target.value)}
                          onBlur={async () => {
                            if (editingBoardName.trim() && editingBoardName !== b.name) {
                              const updated = await updateBoard(b.id, editingBoardName.trim())
                              setBoards(prev => prev.map(x => x.id === b.id ? updated : x))
                            }
                            setEditingBoardId(null)
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingBoardId(null) }}
                          style={{ fontSize: 13, fontWeight: 600, border: 'none', borderBottom: '2px solid #0052cc', outline: 'none', padding: '4px 6px', background: 'none', width: 120 }}
                        />
                      ) : (
                        <button
                          onClick={() => setActiveBoardId(b.id)}
                          onDoubleClick={() => { setEditingBoardId(b.id); setEditingBoardName(b.name) }}
                          style={{
                            padding: '7px 14px', fontSize: 13, fontWeight: activeBoardId === b.id ? 600 : 400,
                            color: activeBoardId === b.id ? '#0052cc' : '#42526e',
                            background: 'none', border: 'none',
                            borderBottom: activeBoardId === b.id ? '2px solid #0052cc' : '2px solid transparent',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >{b.name}</button>
                      )}
                      {isAdmin && boards.length > 1 && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete board "${b.name}"?`)) return
                            await deleteBoard(b.id)
                            const remaining = boards.filter(x => x.id !== b.id)
                            setBoards(remaining)
                            if (activeBoardId === b.id) setActiveBoardId(remaining[0]?.id ?? null)
                          }}
                          style={{ background: 'none', border: 'none', color: '#97a0af', cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1 }}
                          title="Delete board"
                        >×</button>
                      )}
                    </div>
                  ))}
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        if (!activeProjectId) return
                        const name = prompt('Board name:')
                        if (!name?.trim()) return
                        const b = await createBoard(name.trim(), activeProjectId)
                        setBoards(prev => [...prev, b])
                        setActiveBoardId(b.id)
                      }}
                      style={{ padding: '7px 10px', fontSize: 13, color: '#6b778c', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '2px solid transparent' }}
                      title="Add board"
                    >+ Add board</button>
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
                  <BoardView tasks={filtered} onUpdate={handleUpdate} onDelete={handleDelete} onCreate={handleCreate} canEdit={isAdmin} />
                </div>
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
                <div style={{ height: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <KnowledgeBase activeProjectId={activeProjectId} />
                </div>
              )}
              {tab === 'account-settings' && (
                <AccountSettingsPage
                  currentUser={currentUser}
                  onUserUpdate={setCurrentUser}
                  onBack={() => setTab('board')}
                />
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
