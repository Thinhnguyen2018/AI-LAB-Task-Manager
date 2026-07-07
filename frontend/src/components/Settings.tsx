import { useState } from 'react'
import { Project, Task } from '../types'
import { updateProject, deleteProject, AuthUser } from '../api'
import Members from './Members'

interface Props {
  project: Project | null
  projects: Project[]
  tasks: Task[]
  currentUser: AuthUser
  isAdmin: boolean
  onProjectChange: (p: Project) => void
  onProjectDelete: (id: number) => void
  onTasksChange: () => void
  onDeleteProjectTasks: (projectId: number) => Promise<void>
}

const PROJECT_COLORS = [
  '#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
]

const DEFAULT_MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']

function getProjectModules(projectId: number): string[] {
  try {
    const stored = localStorage.getItem(`modules-${projectId}`)
    return stored ? JSON.parse(stored) : DEFAULT_MODULES
  } catch { return DEFAULT_MODULES }
}

function setProjectModules(projectId: number, modules: string[]) {
  localStorage.setItem(`modules-${projectId}`, JSON.stringify(modules))
}

function Section({ title, description, children, danger }: { title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      border: `1px solid ${danger ? '#fca5a5' : '#e5e7eb'}`,
      marginBottom: 20, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${danger ? '#fee2e2' : '#f3f4f6'}`, background: danger ? '#fff5f5' : '#fff' }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: danger ? '#dc2626' : '#111827' }}>{title}</h2>
        {description && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>{description}</p>}
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  )
}

export default function Settings({ project, tasks, currentUser, isAdmin, onProjectChange, onProjectDelete, onTasksChange, onDeleteProjectTasks }: Props) {
  const [name, setName] = useState(project?.name ?? '')
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0])
  const [savingGeneral, setSavingGeneral] = useState(false)

  const [modules, setModulesState] = useState<string[]>(project?.modules ?? [])
  const [newModule, setNewModule] = useState('')

  if (!project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9ca3af', fontSize: 14 }}>
        Select a project to view its settings.
      </div>
    )
  }

  const projectTasks = tasks.filter(t => t.project_id === project.id)

  const handleSaveGeneral = async () => {
    if (!name.trim()) return
    setSavingGeneral(true)
    try {
      const updated = await updateProject(project.id, { name: name.trim(), color, modules })
      onProjectChange(updated)
    } finally {
      setSavingGeneral(false)
    }
  }

  const handleAddModule = async () => {
    const m = newModule.trim()
    if (!m || modules.includes(m)) return
    const next = [...modules, m]
    setModulesState(next)
    setNewModule('')
    const updated = await updateProject(project.id, { modules: next })
    onProjectChange(updated)
  }

  const handleRemoveModule = async (m: string) => {
    const next = modules.filter(x => x !== m)
    setModulesState(next)
    const updated = await updateProject(project.id, { modules: next })
    onProjectChange(updated)
  }

  const exportCSV = () => {
    const headers = ['id', 'title', 'module', 'status', 'quarter', 'year', 'month', 'assignee', 'deadline', 'description']
    const rows = projectTasks.map(t =>
      headers.map(h => `"${String((t as any)[h] ?? '').replace(/"/g, '""')}"`).join(',')
    )
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${project.name}-tasks.csv`
    a.click()
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(projectTasks, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${project.name}-tasks.json`
    a.click()
  }

  const handleDeleteAllTasks = async () => {
    if (!confirm(`Delete ALL ${projectTasks.length} tasks in "${project.name}"? This cannot be undone.`)) return
    await onDeleteProjectTasks(project.id)
    onTasksChange()
  }

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${project.name}" and all its tasks? This cannot be undone.`)) return
    await onDeleteProjectTasks(project.id)
    await deleteProject(project.id)
    onProjectDelete(project.id)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: project.color, display: 'inline-block', flexShrink: 0 }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{project.name}</h1>
        <span style={{ fontSize: 13, color: '#9ca3af', marginLeft: 4 }}>— Project Settings</span>
      </div>

      {/* General */}
      <Section title="General" description="Project name and color">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Project name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveGeneral()}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 26, height: 26, borderRadius: '50%', background: c, border: color === c ? '3px solid #111827' : '3px solid transparent',
                  cursor: 'pointer', padding: 0, outline: 'none',
                }} />
              ))}
            </div>
          </div>
          <button
            onClick={handleSaveGeneral}
            disabled={savingGeneral}
            style={{ alignSelf: 'flex-start', padding: '8px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: savingGeneral ? 0.7 : 1 }}
          >
            {savingGeneral ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </Section>

      {/* Modules */}
      <Section title="Modules" description={`Task categories for ${project.name}`}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {modules.map(m => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{m}</span>
              <button onClick={() => handleRemoveModule(m)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0, marginTop: 1 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Add module..."
            value={newModule}
            onChange={e => setNewModule(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddModule()}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
          <button onClick={handleAddModule}
            style={{ padding: '8px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Add
          </button>
        </div>
      </Section>

      {/* Members */}
      <Section title="Members" description="Manage who has access to this project">
        <Members projectId={project.id} currentUser={currentUser} isAdmin={isAdmin} />
      </Section>

      {/* Export */}
      <Section title="Export" description={`${projectTasks.length} tasks in this project`}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={exportCSV}
            style={{ padding: '8px 20px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
            Export CSV
          </button>
          <button onClick={exportJSON}
            style={{ padding: '8px 20px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
            Export JSON
          </button>
        </div>
      </Section>

      {/* Danger Zone */}
      <Section title="Danger Zone" danger>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #fee2e2', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Delete all tasks</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Remove all {projectTasks.length} tasks in this project</div>
            </div>
            <button onClick={handleDeleteAllTasks}
              style={{ padding: '6px 16px', background: '#fff', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 13, cursor: 'pointer', color: '#dc2626', fontWeight: 600 }}>
              Delete all tasks
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #fee2e2', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Delete project</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Permanently delete "{project.name}" and all its tasks</div>
            </div>
            <button onClick={handleDeleteProject}
              style={{ padding: '6px 16px', background: '#dc2626', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
              Delete project
            </button>
          </div>
        </div>
      </Section>
    </div>
  )
}
