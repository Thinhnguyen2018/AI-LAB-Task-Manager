import { useState } from 'react'
import { Project, Task } from '../types'
import { updateProject, deleteProject, createProject } from '../api'

interface Props {
  projects: Project[]
  tasks: Task[]
  activeProjectId: number | null
  onProjectsChange: (projects: Project[]) => void
  onTasksChange: () => void
  onDeleteProjectTasks: (projectId: number) => Promise<void>
  userName: string
  onUserNameChange: (name: string) => void
  modules: string[]
  onModulesChange: (modules: string[]) => void
}

const PROJECT_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h2>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  )
}

export default function Settings({
  projects, tasks, activeProjectId, onProjectsChange, onTasksChange,
  onDeleteProjectTasks, userName, onUserNameChange, modules, onModulesChange,
}: Props) {
  // Profile
  const [nameInput, setNameInput] = useState(userName)

  // Projects
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [newProjName, setNewProjName] = useState('')
  const [newProjColor, setNewProjColor] = useState(PROJECT_COLORS[0])
  const [showNewProj, setShowNewProj] = useState(false)

  // Modules
  const [newModule, setNewModule] = useState('')

  // Data export
  const exportCSV = () => {
    const projectTasks = activeProjectId ? tasks.filter(t => t.project_id === activeProjectId) : tasks
    const headers = ['id', 'title', 'module', 'status', 'quarter', 'year', 'month', 'assignee', 'deadline', 'description']
    const rows = projectTasks.map(t =>
      headers.map(h => {
        const v = (t as any)[h] ?? ''
        return `"${String(v).replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `tasks-export.csv`; a.click()
  }

  const exportJSON = () => {
    const projectTasks = activeProjectId ? tasks.filter(t => t.project_id === activeProjectId) : tasks
    const blob = new Blob([JSON.stringify(projectTasks, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `tasks-export.json`; a.click()
  }

  const handleSaveProject = async (id: number) => {
    if (!editName.trim()) return
    const updated = await updateProject(id, { name: editName.trim(), color: editColor })
    onProjectsChange(projects.map(p => p.id === id ? updated : p))
    setEditId(null)
  }

  const handleDeleteProject = async (id: number, name: string) => {
    if (!confirm(`Delete project "${name}"? Tasks will remain but lose project association.`)) return
    await deleteProject(id)
    onProjectsChange(projects.filter(p => p.id !== id))
  }

  const handleCreateProject = async () => {
    if (!newProjName.trim()) return
    const proj = await createProject(newProjName.trim(), newProjColor)
    onProjectsChange([...projects, proj])
    setNewProjName(''); setNewProjColor(PROJECT_COLORS[0]); setShowNewProj(false)
  }

  const handleDeleteProjectTasks = async (id: number, name: string) => {
    if (!confirm(`Delete ALL tasks in project "${name}"? This cannot be undone.`)) return
    await onDeleteProjectTasks(id)
    onTasksChange()
  }

  const handleAddModule = () => {
    const m = newModule.trim()
    if (!m || modules.includes(m)) return
    onModulesChange([...modules, m])
    setNewModule('')
  }

  const handleRemoveModule = (m: string) => {
    if (modules.length <= 1) return
    onModulesChange(modules.filter(x => x !== m))
  }

  const activeProject = projects.find(p => p.id === activeProjectId)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* Profile */}
      <Section title="Profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {nameInput.charAt(0).toUpperCase() || 'T'}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Display name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none' }}
              />
              <button
                onClick={() => onUserNameChange(nameInput)}
                style={{ padding: '8px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
              >Save</button>
            </div>
          </div>
        </div>
      </Section>

      {/* Projects */}
      <Section title="Projects">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map(p => (
            <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              {editId === p.id ? (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveProject(p.id); if (e.key === 'Escape') setEditId(null) }}
                    style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Color:</span>
                    {PROJECT_COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: editColor === c ? '2px solid #111827' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleSaveProject(p.id)} style={{ padding: '6px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Save</button>
                    <button onClick={() => setEditId(null)} style={{ padding: '6px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#111827' }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 8 }}>
                    {tasks.filter(t => t.project_id === p.id).length} tasks
                  </span>
                  <button onClick={() => { setEditId(p.id); setEditName(p.name); setEditColor(p.color) }}
                    style={{ padding: '4px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#374151' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteProject(p.id, p.name)}
                    style={{ padding: '4px 12px', background: '#fff', border: '1px solid #fca5a5', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626' }}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {showNewProj ? (
            <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                autoFocus
                placeholder="Project name"
                value={newProjName}
                onChange={e => setNewProjName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(); if (e.key === 'Escape') setShowNewProj(false) }}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Color:</span>
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setNewProjColor(c)} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: newProjColor === c ? '2px solid #111827' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreateProject} style={{ padding: '6px 16px', background: newProjColor, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Create</button>
                <button onClick={() => setShowNewProj(false)} style={{ padding: '6px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewProj(true)}
              style={{ padding: '10px 16px', border: '1px dashed #d1d5db', borderRadius: 10, background: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>
              + New project
            </button>
          )}
        </div>
      </Section>

      {/* Modules */}
      <Section title="Modules">
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>Modules are used to categorize tasks across all projects.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {modules.map(m => (
            <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 20, padding: '4px 12px' }}>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{m}</span>
              <button onClick={() => handleRemoveModule(m)}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="New module name"
            value={newModule}
            onChange={e => setNewModule(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddModule() }}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' }}
          />
          <button onClick={handleAddModule}
            style={{ padding: '8px 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            Add
          </button>
        </div>
      </Section>

      {/* Data */}
      <Section title="Data & Export">
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
          Export {activeProject ? `tasks in "${activeProject.name}"` : 'all tasks'}.
        </p>
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
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #fca5a5', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #fee2e2', background: '#fff5f5' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#dc2626' }}>Danger Zone</h2>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {projects.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #fee2e2', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  Delete all {tasks.filter(t => t.project_id === p.id).length} tasks in this project
                </div>
              </div>
              <button onClick={() => handleDeleteProjectTasks(p.id, p.name)}
                style={{ padding: '6px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Delete all tasks
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
