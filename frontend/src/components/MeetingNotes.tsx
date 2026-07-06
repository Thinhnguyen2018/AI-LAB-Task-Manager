import { useState, useEffect } from 'react'
import { Task } from '../types'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface Props {
  tasks: Task[]
  onTasksChange: () => void
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d as any) - (yearStart as any)) / 86400000 + 1) / 7)
}

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem('meeting-notes') || '[]')
  } catch {
    return []
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem('meeting-notes', JSON.stringify(notes))
}

export default function MeetingNotes({ tasks, onTasksChange }: Props) {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState('')
  const [extractedTasks, setExtractedTasks] = useState<string[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  useEffect(() => {
    if (notes.length > 0 && !selected) {
      setSelected(notes[0].id)
    }
  }, [])

  const selectedNote = notes.find(n => n.id === selected) ?? null

  useEffect(() => {
    if (selectedNote) {
      setContent(selectedNote.content)
      setExtractedTasks([])
    }
  }, [selected])

  const createNote = () => {
    const now = new Date()
    const week = getWeekNumber(now)
    const year = now.getFullYear()
    const id = `note-${Date.now()}`
    const note: Note = {
      id,
      title: `Week ${week}, ${year}`,
      content: `## Recap từ tuần trước\n- \n\n---\n\n## Updates tuần này\n\n### 🔵 In Progress – cần report\n- \n\n---\n\n## Items mới / Thảo luận\n- `,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    const updated = [note, ...notes]
    setNotes(updated)
    saveNotes(updated)
    setSelected(id)
    setEditing(true)
    setContent(note.content)
  }

  const saveNote = () => {
    const updated = notes.map(n =>
      n.id === selected ? { ...n, content, updatedAt: new Date().toISOString() } : n
    )
    setNotes(updated)
    saveNotes(updated)
    setEditing(false)
  }

  const deleteNote = (id: string) => {
    if (!confirm('Delete this note?')) return
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    saveNotes(updated)
    setSelected(updated[0]?.id ?? null)
  }

  const extractWithAI = async () => {
    if (!selectedNote) return
    setExtracting(true)
    setExtractError(null)
    setExtractedTasks([])
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '/api'
      const res = await fetch(`${base}/extract-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: selectedNote.content }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const data = await res.json()
      setExtractedTasks(data.tasks ?? [])
    } catch (e: any) {
      setExtractError(e.message ?? 'Failed to extract tasks')
    } finally {
      setExtracting(false)
    }
  }

  const prepareNote = () => {
    if (!selectedNote) return
    const now = new Date()
    const week = getWeekNumber(now)
    const prepContent = selectedNote.content
      .replace(/→ done\?/g, '→ done?')
      + `\n\n---\n*Prepared for Week ${week} standup*`
    const updated = notes.map(n =>
      n.id === selected ? { ...n, content: prepContent, updatedAt: now.toISOString() } : n
    )
    setNotes(updated)
    saveNotes(updated)
    setContent(prepContent)
    alert('Note marked as prepared!')
  }

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h2 key={i} style={{ fontSize: 16, fontWeight: 700, margin: '16px 0 6px', color: '#111827' }}>{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} style={{ fontSize: 14, fontWeight: 600, margin: '12px 0 4px', color: '#374151' }}>{line.slice(4)}</h3>
      if (line === '---') return <hr key={i} style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
      if (line.startsWith('- ')) {
        const text = line.slice(2)
        const isOverdue = text.includes('OVERDUE')
        return (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
            <span style={{ color: '#9ca3af', flexShrink: 0, marginTop: 2 }}>–</span>
            <span style={{ fontSize: 14, color: isOverdue ? '#dc2626' : '#374151', lineHeight: 1.5 }}>{text}</span>
          </div>
        )
      }
      if (line.trim() === '') return <div key={i} style={{ height: 6 }} />
      return <p key={i} style={{ fontSize: 14, color: '#374151', margin: '2px 0', lineHeight: 1.5 }}>{line}</p>
    })
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Note list */}
      <div style={{ width: 220, background: '#1f2937', borderRight: '1px solid #374151', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #374151', display: 'flex', gap: 8 }}>
          <button
            onClick={createNote}
            style={{ flex: 1, background: '#16a34a', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notes.map(n => (
            <div
              key={n.id}
              onClick={() => { setSelected(n.id); setEditing(false) }}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                background: selected === n.id ? '#374151' : 'none',
                borderLeft: selected === n.id ? '3px solid #16a34a' : '3px solid transparent',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{n.content.slice(0, 40).replace(/[#\n]/g, ' ').trim()}...</div>
            </div>
          ))}
          {notes.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: 13, padding: 14 }}>No notes yet</p>
          )}
        </div>
      </div>

      {/* Editor / Viewer */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', minWidth: 0 }}>
        {selectedNote ? (
          <>
            {/* Toolbar */}
            <div style={{ padding: '10px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', flex: 1 }}>{selectedNote.title}</span>
              {!editing && (
                <>
                  <button onClick={extractWithAI} disabled={extracting} style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: extracting ? 'wait' : 'pointer', opacity: extracting ? 0.7 : 1 }}>
                    {extracting ? '⏳ Extracting...' : '✦ Extract with AI'}
                  </button>
                  <button onClick={prepareNote} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    ✓ Prepare
                  </button>
                  <button onClick={() => setEditing(true)} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '5px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => deleteNote(selectedNote.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 13, cursor: 'pointer' }}>
                    Delete
                  </button>
                </>
              )}
              {editing && (
                <>
                  <button onClick={saveNote} style={{ background: '#16a34a', border: 'none', color: '#fff', padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Save
                  </button>
                  <button onClick={() => { setEditing(false); setContent(selectedNote.content) }} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', padding: '5px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              )}
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <div style={{ flex: 1, padding: '20px 32px', overflowY: 'auto' }}>
                {editing ? (
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    style={{ width: '100%', height: '100%', minHeight: 400, border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.6, color: '#374151', fontFamily: 'monospace', resize: 'none' }}
                    autoFocus
                  />
                ) : (
                  <div>{renderContent(selectedNote.content)}</div>
                )}
              </div>

              {/* Extract error */}
              {extractError && !extracting && (
                <div style={{ width: 220, borderLeft: '1px solid #e5e7eb', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 13, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Extract failed</div>
                  <div style={{ fontSize: 12 }}>{extractError}</div>
                </div>
              )}

              {/* Extracted tasks panel */}
              {extractedTasks.length > 0 && (
                <div style={{ width: 280, borderLeft: '1px solid #e5e7eb', padding: 16, overflowY: 'auto' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>TASKS FROM THIS NOTE</h3>
                  {extractedTasks.map((t, i) => (
                    <div key={i} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 10px', marginBottom: 8, fontSize: 13, color: '#374151' }}>
                      {t}
                    </div>
                  ))}
                </div>
              )}
              {extractedTasks.length === 0 && !editing && !extractError && !extracting && (
                <div style={{ width: 220, borderLeft: '1px solid #e5e7eb', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>TASKS FROM THIS NOTE</div>
                  <div style={{ fontSize: 12 }}>0</div>
                  <div style={{ marginTop: 12, fontSize: 12 }}>Use "Extract with AI" to create tasks from this note</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <p>Select a note or create a new one</p>
              <button onClick={createNote} style={{ marginTop: 12, background: '#16a34a', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                + New Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
