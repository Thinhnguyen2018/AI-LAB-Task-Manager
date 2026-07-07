import { useState, useEffect, useCallback } from 'react'
import { Task, Note } from '../types'
import { getNotes, createNote, updateNote, deleteNote, createTask, updateTask, deleteTask } from '../api'
import TaskModal from './TaskModal'

interface Props {
  tasks: Task[]
  onTasksChange: () => void
  activeProjectId: number | null
}

type Action = 'create' | 'update' | 'skip'

interface ExtractedItem {
  title: string
  action: Action
  matchedTask: Task | null
  newStatus: Task['status']
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7)
}

function tokenize(s: string): Set<string> {
  // Unicode-aware split: keeps Vietnamese and other Unicode letters/digits
  return new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 1))
}

function matchScore(a: string, b: string): number {
  const wa = tokenize(a)
  const wb = tokenize(b)
  let common = 0
  wa.forEach(w => { if (wb.has(w)) common++ })
  const jaccard = common / Math.max(wa.size, wb.size, 1)
  const subset = common / Math.min(wa.size, wb.size, 1)
  return Math.max(jaccard, subset * 0.8)
}

const STATUS_LABEL: Record<Task['status'], string> = { pending: 'Pending', progress: 'In Progress', done: 'Done' }
const STATUS_COLOR: Record<Task['status'], string> = { pending: '#d97706', progress: '#2563eb', done: '#16a34a' }
const STATUS_BG: Record<Task['status'], string> = { pending: '#fef3c7', progress: '#dbeafe', done: '#dcfce7' }

export default function MeetingNotes({ tasks, onTasksChange, activeProjectId }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [applying, setApplying] = useState(false)
  const [applyDone, setApplyDone] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [showExtractPanel, setShowExtractPanel] = useState(false)
  // Local fallback: noteId -> taskId[] (until backend note_id column is available)
  const [localNoteTaskIds, setLocalNoteTaskIds] = useState<Record<string, number[]>>(() => {
    try { return JSON.parse(localStorage.getItem('note-task-ids') || '{}') } catch { return {} }
  })

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const remote = await getNotes()
      if (remote.length === 0) {
        try {
          const local: Note[] = JSON.parse(localStorage.getItem('meeting-notes') || '[]')
          for (const n of local) await createNote({ id: n.id, title: n.title, content: n.content, project_id: activeProjectId ?? undefined })
          if (local.length > 0) {
            localStorage.removeItem('meeting-notes')
            const migrated = await getNotes()
            const filtered = migrated.filter(n => n.project_id === activeProjectId || n.project_id == null)
            setNotes(filtered)
            setSelected(filtered[0]?.id ?? null)
            return
          }
        } catch { /* ignore */ }
      }
      const filtered = remote.filter(n => n.project_id === activeProjectId)
      setNotes(filtered)
      setSelected(prev => (filtered.find(n => n.id === prev) ? prev : filtered[0]?.id ?? null))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes, activeProjectId])

  const selectedNote = notes.find(n => n.id === selected) ?? null

  // Tasks linked to this note: backend note_id OR local fallback
  const localIds = selected ? (localNoteTaskIds[selected] ?? []) : []
  const linkedTasks = tasks.filter(t => t.note_id === selected || localIds.includes(t.id))

  useEffect(() => {
    if (selectedNote) {
      setContent(selectedNote.content)
      setItems([])
      setExtractError(null)
      setApplyDone(false)
      setShowExtractPanel(false)
    }
  }, [selected])

  const handleCreateNote = async () => {
    const now = new Date()
    const week = getWeekNumber(now)
    const id = `note-${Date.now()}`
    const defaultContent = `## Recap từ tuần trước\n- \n\n---\n\n## Updates tuần này\n\n### 🔵 In Progress – cần report\n- \n\n---\n\n## Items mới / Thảo luận\n- `
    try {
      const note = await createNote({ id, title: `Week ${week}, ${now.getFullYear()}`, content: defaultContent, project_id: activeProjectId ?? undefined })
      setNotes(prev => [note, ...prev])
      setSelected(note.id)
      setEditing(true)
      setContent(note.content)
    } catch (e: any) {
      alert(`Failed to create note: ${e.message}`)
    }
  }

  const handleSaveNote = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await updateNote(selected, { content })
      setNotes(prev => prev.map(n => n.id === selected ? updated : n))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return
    await deleteNote(id)
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    setSelected(remaining[0]?.id ?? null)
  }

  const extractWithAI = async () => {
    if (!selectedNote) return
    setExtracting(true); setExtractError(null); setItems([]); setApplyDone(false); setShowExtractPanel(true)
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '/api'
      const res = await fetch(`${base}/extract-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: selectedNote.content }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      const extracted: string[] = data.tasks ?? []
      const matched: ExtractedItem[] = extracted.map(title => {
        let best: Task | null = null, bestScore = 0
        for (const t of tasks) {
          const s = matchScore(title, t.title)
          if (s > bestScore) { bestScore = s; best = t }
        }
        const isMatch = bestScore >= 0.4
        return { title, action: isMatch ? 'update' : 'create', matchedTask: isMatch ? best : null, newStatus: isMatch ? best!.status : 'pending' }
      })
      setItems(matched)
    } catch (e: any) {
      setExtractError(e.message ?? 'Failed to extract tasks')
    } finally {
      setExtracting(false)
    }
  }

  const setItemAction = (i: number, action: Action) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, action } : it))
  const setItemStatus = (i: number, status: Task['status']) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, newStatus: status } : it))

  const applyAll = async () => {
    if (!selected) return
    setApplying(true)
    try {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const quarter = `Q${Math.ceil(month / 3)}` as Task['quarter']
      const appliedIds: number[] = []

      for (const item of items) {
        if (item.action === 'skip') continue
        if (item.action === 'update' && item.matchedTask) {
          await updateTask(item.matchedTask.id, { status: item.newStatus, note_id: selected })
          appliedIds.push(item.matchedTask.id)
        } else if (item.action === 'create') {
          const created = await createTask({ title: item.title, module: 'GreenRAG', status: item.newStatus, quarter, year, month, note_id: selected })
          appliedIds.push(created.id)
        }
      }

      // Save local fallback mapping in case backend note_id column isn't available yet
      if (appliedIds.length > 0) {
        setLocalNoteTaskIds(prev => {
          const next = { ...prev, [selected]: [...new Set([...(prev[selected] ?? []), ...appliedIds])] }
          localStorage.setItem('note-task-ids', JSON.stringify(next))
          return next
        })
      }

      await onTasksChange()
      setItems([])
      setShowExtractPanel(false)
    } finally {
      setApplying(false)
    }
  }

  const prepareNote = async () => {
    if (!selectedNote || !selected) return
    const now = new Date()
    const newContent = selectedNote.content + `\n\n---\n*Prepared for Week ${getWeekNumber(now)} standup*`
    const updated = await updateNote(selected, { content: newContent })
    setNotes(prev => prev.map(n => n.id === selected ? updated : n))
    setContent(newContent)
    alert('Note marked as prepared!')
  }

  const renderContent = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: 16, fontWeight: 700, margin: '16px 0 6px', color: '#111827' }}>{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 14, fontWeight: 600, margin: '12px 0 4px', color: '#374151' }}>{line.slice(4)}</h3>
      if (line === '---') return <hr key={i} style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
      if (line.startsWith('- ')) {
        const t = line.slice(2)
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
            <span style={{ color: '#9ca3af', flexShrink: 0, marginTop: 2 }}>–</span>
            <span style={{ fontSize: 14, color: t.includes('OVERDUE') ? '#dc2626' : '#374151', lineHeight: 1.5 }}>{t}</span>
          </div>
        )
      }
      if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
      return <p key={i} style={{ fontSize: 14, color: '#374151', margin: '2px 0', lineHeight: 1.5 }}>{line}</p>
    })

  const activeCount = items.filter(i => i.action !== 'skip').length

  // Right panel: show extract panel (during/after AI) OR linked tasks
  const showLinkedPanel = !showExtractPanel && linkedTasks.length > 0

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#1f2937', borderRight: '1px solid #374151', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #374151' }}>
          <button onClick={handleCreateNote} style={{ width: '100%', background: '#16a34a', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <p style={{ color: '#6b7280', fontSize: 13, padding: 14 }}>Loading...</p>}
          {!loading && notes.map(n => {
            const localNoteIds = localNoteTaskIds[n.id] ?? []
            const count = tasks.filter(t => t.note_id === n.id || localNoteIds.includes(t.id)).length
            return (
              <div key={n.id} onClick={() => { setSelected(n.id); setEditing(false) }}
                style={{ padding: '10px 14px', cursor: 'pointer', background: selected === n.id ? '#374151' : 'none', borderLeft: selected === n.id ? '3px solid #16a34a' : '3px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{n.title}</div>
                  {count > 0 && <span style={{ fontSize: 10, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '1px 5px', flexShrink: 0, marginLeft: 4 }}>{count}</span>}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{n.content.slice(0, 40).replace(/[#\n]/g, ' ').trim()}...</div>
              </div>
            )
          })}
          {!loading && notes.length === 0 && <p style={{ color: '#6b7280', fontSize: 13, padding: 14 }}>No notes yet</p>}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
        {selectedNote ? (
          <>
            {/* Toolbar */}
            <div style={{ padding: '10px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', flex: 1 }}>{selectedNote.title}</span>
              {!editing && (
                <>
                  <button onClick={extractWithAI} disabled={extracting}
                    style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: extracting ? 'wait' : 'pointer', opacity: extracting ? 0.7 : 1 }}>
                    {extracting ? '⏳ Extracting...' : '✦ Extract with AI'}
                  </button>
                  <button onClick={prepareNote} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ✓ Prepare
                  </button>
                  <button onClick={() => setEditing(true)} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '5px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteNote(selectedNote.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 13, cursor: 'pointer' }}>
                    Delete
                  </button>
                </>
              )}
              {editing && (
                <>
                  <button onClick={handleSaveNote} disabled={saving}
                    style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setContent(selectedNote.content) }}
                    style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '5px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              )}
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              {/* Note content */}
              <div style={{ flex: 1, padding: '20px 32px', overflowY: 'auto' }}>
                {editing ? (
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    style={{ width: '100%', height: '100%', minHeight: 400, border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.6, color: '#374151', fontFamily: 'monospace', resize: 'none' }}
                    autoFocus />
                ) : (
                  <div>{renderContent(selectedNote.content)}</div>
                )}
              </div>

              {/* ── Linked tasks panel (persistent) ── */}
              {showLinkedPanel && !editing && (
                <div style={{ width: 300, borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tasks ({linkedTasks.length})</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>From this note · click to edit</div>
                    </div>
                    <button onClick={() => setShowExtractPanel(true)}
                      style={{ fontSize: 11, background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontWeight: 600 }}>
                      + Extract
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                    {linkedTasks.map(task => (
                      <div key={task.id} onClick={() => setEditTask(task)}
                        style={{ marginBottom: 8, borderRadius: 8, border: `1px solid ${STATUS_COLOR[task.status]}30`, background: STATUS_BG[task.status], padding: '8px 10px', cursor: 'pointer', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{task.title}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[task.status] }}>{STATUS_LABEL[task.status]}</span>
                          {task.assignee && <span style={{ fontSize: 11, color: '#6b7280' }}>· {task.assignee}</span>}
                          <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 'auto' }}>{task.module}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Extract / confirm panel ── */}
              {showExtractPanel && !editing && (
                <div style={{ width: 320, borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
                  {extractError ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 13, padding: 24, textAlign: 'center' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Extract failed</div>
                      <div style={{ fontSize: 12 }}>{extractError}</div>
                      <button onClick={() => setShowExtractPanel(false)} style={{ marginTop: 12, fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Close</button>
                    </div>
                  ) : extracting ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 13 }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                      Extracting tasks...
                    </div>
                  ) : items.length > 0 ? (
                    <>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>AI Extracted — {items.length} tasks</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>Review then apply</div>
                        </div>
                        <button onClick={() => setShowExtractPanel(false)} style={{ fontSize: 16, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                        {items.map((item, i) => (
                          <div key={i} style={{ marginBottom: 10, borderRadius: 8, border: item.action === 'skip' ? '1px solid #e5e7eb' : item.action === 'update' ? '1px solid #bfdbfe' : '1px solid #bbf7d0', background: item.action === 'skip' ? '#f9fafb' : item.action === 'update' ? '#eff6ff' : '#f0fdf4', opacity: item.action === 'skip' ? 0.5 : 1, transition: 'all 0.15s' }}>
                            <div style={{ padding: '8px 10px 4px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{item.title}</div>
                            {item.matchedTask && (
                              <div style={{ padding: '0 10px 6px', fontSize: 11, color: '#6b7280' }}>
                                Matches: <span style={{ color: '#2563eb', fontWeight: 600 }}>{item.matchedTask.title}</span>{' '}
                                <span style={{ color: STATUS_COLOR[item.matchedTask.status], fontWeight: 600 }}>[{STATUS_LABEL[item.matchedTask.status]}]</span>
                              </div>
                            )}
                            <div style={{ padding: '4px 10px', display: 'flex', gap: 4 }}>
                              {item.matchedTask && (
                                <button onClick={() => setItemAction(i, 'update')} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: item.action === 'update' ? '#2563eb' : '#e5e7eb', color: item.action === 'update' ? '#fff' : '#6b7280' }}>Update</button>
                              )}
                              <button onClick={() => setItemAction(i, 'create')} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: item.action === 'create' ? '#16a34a' : '#e5e7eb', color: item.action === 'create' ? '#fff' : '#6b7280' }}>Create</button>
                              <button onClick={() => setItemAction(i, 'skip')} style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: item.action === 'skip' ? '#6b7280' : '#e5e7eb', color: item.action === 'skip' ? '#fff' : '#6b7280' }}>Skip</button>
                            </div>
                            {item.action !== 'skip' && (
                              <div style={{ padding: '4px 10px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>Status:</span>
                                {(['pending', 'progress', 'done'] as Task['status'][]).map(s => (
                                  <button key={s} onClick={() => setItemStatus(i, s)} style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, cursor: 'pointer', border: 'none', background: item.newStatus === s ? STATUS_COLOR[s] : '#f3f4f6', color: item.newStatus === s ? '#fff' : '#6b7280', fontWeight: item.newStatus === s ? 700 : 400 }}>
                                    {STATUS_LABEL[s]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
                        {applyDone ? (
                          <div style={{ textAlign: 'center', color: '#16a34a', fontSize: 13, fontWeight: 600 }}>✓ Applied!</div>
                        ) : (
                          <button onClick={applyAll} disabled={applying || activeCount === 0}
                            style={{ width: '100%', padding: '8px 0', borderRadius: 6, border: 'none', background: activeCount === 0 ? '#e5e7eb' : '#16a34a', color: activeCount === 0 ? '#9ca3af' : '#fff', fontSize: 13, fontWeight: 600, cursor: activeCount === 0 ? 'default' : 'pointer' }}>
                            {applying ? 'Applying...' : `Apply ${activeCount} task${activeCount !== 1 ? 's' : ''}`}
                          </button>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* ── Empty state ── */}
              {!showExtractPanel && linkedTasks.length === 0 && !editing && (
                <div style={{ width: 220, borderLeft: '1px solid #e5e7eb', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No tasks yet</div>
                  <div style={{ fontSize: 12 }}>Use "Extract with AI" to create tasks from this note</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <p>Select a note or create a new one</p>
              <button onClick={handleCreateNote} style={{ marginTop: 12, background: '#16a34a', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                + New Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task edit modal */}
      {editTask && (
        <TaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={async data => { await updateTask(editTask.id, data); await onTasksChange() }}
          onDelete={async () => { await deleteTask(editTask.id); await onTasksChange(); setEditTask(null) }}
        />
      )}
    </div>
  )
}
