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

const MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']
const STATUSES = ['pending', 'progress', 'done']
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export default function TaskModal({ task, onClose, onSave, onDelete, defaultQuarter, defaultStatus }: Props) {
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
  }

  const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{task ? 'Edit Task' : 'New Task'}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#6b7280', cursor: 'pointer' }}>×</button>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={label}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} style={inp} placeholder="Task title" />
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
                <label style={label}>Month (1-12)</label>
                <input type="number" min={1} max={12} value={month} onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')} style={inp} placeholder="Optional" />
              </div>
              <div>
                <label style={label}>Week (1-52)</label>
                <input type="number" min={1} max={52} value={week} onChange={e => setWeek(e.target.value ? Number(e.target.value) : '')} style={inp} placeholder="Optional" />
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

          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            {task && onDelete && (
              <button
                onClick={async () => { if (confirm('Delete this task?')) { await onDelete(); onClose() } }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 14 }}
              >
                Delete
              </button>
            )}
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 14 }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#16a34a', color: '#fff', fontSize: 14, fontWeight: 600, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Comments */}
          {task && (
            <div style={{ marginTop: 28, borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Comments ({comments.length})</h3>
              {comments.map(c => (
                <div key={c.id} style={{ background: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{c.author}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(c.created_at).toLocaleString()}</span>
                      <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>×</button>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#374151' }}>{c.content}</p>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  value={commentAuthor}
                  onChange={e => setCommentAuthor(e.target.value)}
                  placeholder="Author"
                  style={{ ...inp, width: 100 }}
                />
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  style={{ ...inp, flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <button
                  onClick={handleAddComment}
                  style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontSize: 13 }}
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
