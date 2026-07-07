import { useState, useEffect } from 'react'
import { Task, TaskCreate, TaskUpdate, Comment } from '../types'
import { getComments, createComment, deleteComment } from '../api'

interface Props {
  task?: Task
  onClose: () => void
  onSave: (data: TaskCreate | TaskUpdate) => Promise<void>
  onDelete?: () => Promise<void>
  defaultQuarter?: string
  defaultStatus?: string
}

const DEFAULT_MODULES: string[] = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']
const getModules = (): string[] => { try { return JSON.parse(localStorage.getItem('modules') || 'null') || DEFAULT_MODULES } catch { return DEFAULT_MODULES } }
const MODULES = getModules()
const STATUSES = ['pending', 'progress', 'done']
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

type TabKey = 'details' | 'comments' | 'activity'

export default function TaskModal({ task, onClose, onSave, onDelete, defaultQuarter, defaultStatus }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('details')
  const [title, setTitle] = useState(task?.title ?? '')
  const [module, setModule] = useState(task?.module ?? 'GreenRAG')
  const [status, setStatus] = useState(task?.status ?? defaultStatus ?? 'pending')
  const [quarter, setQuarter] = useState(task?.quarter ?? defaultQuarter ?? 'Q1')
  const [year, setYear] = useState(task?.year ?? 2026)
  const [assignee, setAssignee] = useState(task?.assignee ?? '')
  const [deadline, setDeadline] = useState(task?.deadline ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [month, setMonth] = useState<number | ''>(task?.month ?? '')
  const [week, setWeek] = useState<number | ''>(task?.week ?? '')
  const [saving, setSaving] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('Me')

  useEffect(() => {
    if (task) {
      getComments(task.id).then(setComments).catch(() => {})
    }
  }, [task])

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        module: module as Task['module'],
        status: status as Task['status'],
        quarter: quarter as Task['quarter'],
        year,
        assignee: assignee || undefined,
        deadline: deadline || undefined,
        description: description || undefined,
        month: month === '' ? undefined : month,
        week: week === '' ? undefined : week,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !task) return
    const c = await createComment(task.id, commentAuthor, commentText.trim())
    setComments(prev => [...prev, c])
    setCommentText('')
  }

  const handleDeleteComment = async (id: number) => {
    await deleteComment(id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: 14, color: '#111827',
    boxSizing: 'border-box',
  }
  const label: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block',
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'Details' },
    { key: 'comments', label: `Comments${comments.length ? ` (${comments.length})` : ''}` },
    { key: 'activity', label: 'Activity' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{task ? 'Edit Task' : 'New Task'}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#6b7280', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          {/* Tabs — only show when editing existing task */}
          {task && (
            <div style={{ display: 'flex', gap: 0 }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400,
                    color: activeTab === t.key ? '#16a34a' : '#6b7280',
                    borderBottom: activeTab === t.key ? '2px solid #16a34a' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* DETAILS TAB */}
          {(!task || activeTab === 'details') && (
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={label}>Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} style={inp} placeholder="Task title" autoFocus={!task} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={label}>Module</label>
                  <select value={module} onChange={e => setModule(e.target.value as any)} style={inp}>
                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Quarter</label>
                  <select value={quarter} onChange={e => setQuarter(e.target.value)} style={inp}>
                    {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Year</label>
                  <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={inp} />
                </div>
<div>
                  <label style={label}>Assignee</label>
                  <input value={assignee} onChange={e => setAssignee(e.target.value)} style={inp} placeholder="Name" />
                </div>
                <div>
                  <label style={label}>Deadline</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inp} />
                </div>
              </div>
              <div>
                <label style={label}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inp, height: 80, resize: 'vertical' }} placeholder="Optional description..." />
              </div>
            </div>
          )}

          {/* COMMENTS TAB */}
          {task && activeTab === 'comments' && (
            <div>
              {comments.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No comments yet</p>
              )}
              {comments.map(c => (
                <div key={c.id} style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#374151' }}>
                        {c.author[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{c.author}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 16, cursor: 'pointer' }}>×</button>
                  </div>
                  <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.5 }}>{c.content}</p>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                <input value={commentAuthor} onChange={e => setCommentAuthor(e.target.value)} placeholder="Author" style={{ ...inp, width: 90 }} />
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  style={{ ...inp, flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment} style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Post
                </button>
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {task && activeTab === 'activity' && (
            <div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 2, background: '#e5e7eb', alignSelf: 'stretch', flexShrink: 0, marginLeft: 11 }} />
                <div style={{ flex: 1 }}>
                  {[
                    { label: 'Task created', time: 'Earlier', icon: '✦' },
                    { label: `Status: ${task.status}`, time: '', icon: '◈' },
                    task.assignee ? { label: `Assigned to ${task.assignee}`, time: '', icon: '◉' } : null,
                    task.deadline ? { label: `Deadline: ${task.deadline}`, time: '', icon: '◷' } : null,
                  ].filter(Boolean).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f3f4f6', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
                        {item!.icon}
                      </div>
                      <div>
                        <span style={{ fontSize: 13, color: '#374151' }}>{item!.label}</span>
                        {item!.time && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{item!.time}</span>}
                      </div>
                    </div>
                  ))}
                  {comments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#dbeafe', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>💬</div>
                      <div>
                        <span style={{ fontSize: 13, color: '#374151' }}><b>{c.author}</b> commented: {c.content}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {task && onDelete && (
            <button
              onClick={async () => { if (confirm('Delete this task?')) { await onDelete(); onClose() } }}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 14, cursor: 'pointer' }}
            >
              Delete
            </button>
          )}
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
          {(!task || activeTab === 'details') && (
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !title.trim() ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
