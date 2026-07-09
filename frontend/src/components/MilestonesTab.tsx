import { useState, useEffect } from 'react'
import { ReleaseNote, ProjectMilestone } from '../types'
import {
  getReleaseNotes, createReleaseNote, updateReleaseNote, deleteReleaseNote,
  getProjectMilestones, createProjectMilestone, updateProjectMilestone, deleteProjectMilestone,
} from '../api'

interface Props {
  projectId: number
  boardId?: number
}

const STATUS_LABELS: Record<string, string> = { upcoming: 'Upcoming', in_progress: 'In Progress', completed: 'Completed' }
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  upcoming: { bg: '#e9f2ff', text: '#0052cc' },
  in_progress: { bg: '#fff7e6', text: '#d97706' },
  completed: { bg: '#e6f4ea', text: '#16a34a' },
}

function TagBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#6b7280' }
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: c.bg, color: c.text }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

interface ReleaseFormData {
  version: string
  title: string
  date: string
  description: string
  changes: string
}

interface MilestoneFormData {
  name: string
  target_date: string
  description: string
  goals: string
  status: string
}

const emptyRelease: ReleaseFormData = { version: '', title: '', date: '', description: '', changes: '' }
const emptyMilestone: MilestoneFormData = { name: '', target_date: '', description: '', goals: '', status: 'upcoming' }

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%', padding: '8px 10px', border: '1px solid #dfe1e6', borderRadius: 6,
    fontSize: 14, color: '#172b4d', outline: 'none', background: '#fff', boxSizing: 'border-box',
    ...extra,
  }
}

export default function MilestonesTab({ projectId, boardId }: Props) {
  const [activeTab, setActiveTab] = useState<'releases' | 'milestones'>('releases')
  const [releases, setReleases] = useState<ReleaseNote[]>([])
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([])
  const [loading, setLoading] = useState(false)

  // Release form state
  const [showReleaseForm, setShowReleaseForm] = useState(false)
  const [releaseForm, setReleaseForm] = useState<ReleaseFormData>(emptyRelease)
  const [editingReleaseId, setEditingReleaseId] = useState<number | null>(null)

  // Milestone form state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [milestoneForm, setMilestoneForm] = useState<MilestoneFormData>(emptyMilestone)
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null)

  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    Promise.all([
      getReleaseNotes(projectId, boardId),
      getProjectMilestones(projectId, boardId),
    ]).then(([r, m]) => { setReleases(r); setMilestones(m) }).finally(() => setLoading(false))
  }, [projectId, boardId])

  // ── Release handlers ──
  const openNewRelease = () => { setReleaseForm(emptyRelease); setEditingReleaseId(null); setShowReleaseForm(true) }
  const openEditRelease = (r: ReleaseNote) => {
    setReleaseForm({ version: r.version, title: r.title, date: r.date, description: r.description ?? '', changes: r.changes.join('\n') })
    setEditingReleaseId(r.id); setShowReleaseForm(true)
  }
  const saveRelease = async () => {
    const changes = releaseForm.changes.split('\n').map(s => s.trim()).filter(Boolean)
    const payload = { version: releaseForm.version, title: releaseForm.title, date: releaseForm.date, description: releaseForm.description, changes, project_id: projectId, board_id: boardId }
    if (editingReleaseId) {
      const updated = await updateReleaseNote(editingReleaseId, payload)
      setReleases(rs => rs.map(r => r.id === editingReleaseId ? updated : r))
    } else {
      const created = await createReleaseNote(payload)
      setReleases(rs => [created, ...rs])
    }
    setShowReleaseForm(false)
  }
  const deleteRelease = async (id: number) => {
    if (!confirm('Xoá release này?')) return
    await deleteReleaseNote(id)
    setReleases(rs => rs.filter(r => r.id !== id))
  }

  // ── Milestone handlers ──
  const openNewMilestone = () => { setMilestoneForm(emptyMilestone); setEditingMilestoneId(null); setShowMilestoneForm(true) }
  const openEditMilestone = (m: ProjectMilestone) => {
    setMilestoneForm({ name: m.name, target_date: m.target_date, description: m.description ?? '', goals: m.goals.join('\n'), status: m.status })
    setEditingMilestoneId(m.id); setShowMilestoneForm(true)
  }
  const saveMilestone = async () => {
    const goals = milestoneForm.goals.split('\n').map(s => s.trim()).filter(Boolean)
    const payload = { name: milestoneForm.name, target_date: milestoneForm.target_date, description: milestoneForm.description, goals, status: milestoneForm.status as ProjectMilestone['status'], project_id: projectId, board_id: boardId }
    if (editingMilestoneId) {
      const updated = await updateProjectMilestone(editingMilestoneId, payload)
      setMilestones(ms => ms.map(m => m.id === editingMilestoneId ? updated : m))
    } else {
      const created = await createProjectMilestone(payload)
      setMilestones(ms => [...ms, created].sort((a, b) => a.target_date.localeCompare(b.target_date)))
    }
    setShowMilestoneForm(false)
  }
  const deleteMilestone = async (id: number) => {
    if (!confirm('Xoá milestone này?')) return
    await deleteProjectMilestone(id)
    setMilestones(ms => ms.filter(m => m.id !== id))
  }

  const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 6, border: 'none', background: '#0052cc',
    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }
  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 6, border: '1px solid #dfe1e6', background: '#fff',
    color: '#42526e', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  }

  return (
    <div style={{ padding: '0 24px 24px', maxWidth: 900, margin: '0 auto' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #dfe1e6', marginBottom: 24, marginTop: 8 }}>
        {(['releases', 'milestones'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            color: activeTab === tab ? '#0052cc' : '#42526e',
            borderBottom: activeTab === tab ? '2px solid #0052cc' : '2px solid transparent',
            marginBottom: -2,
          }}>
            {tab === 'releases' ? '🏷 Release Notes' : '🎯 Milestones'}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#6b7280', textAlign: 'center' }}>Loading...</p>}

      {/* ── RELEASES ── */}
      {activeTab === 'releases' && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#172b4d', margin: 0 }}>Release Notes</h2>
            <button style={btnPrimary} onClick={openNewRelease}>+ New Release</button>
          </div>

          {releases.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🏷</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Chưa có release nào</div>
              <div style={{ fontSize: 13 }}>Tạo release đầu tiên để theo dõi các phiên bản sản phẩm</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {releases.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #dfe1e6', borderRadius: 8, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{
                    background: '#0052cc', color: '#fff', fontWeight: 700, fontSize: 12,
                    padding: '3px 10px', borderRadius: 20, flexShrink: 0,
                  }}>
                    {r.version}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#172b4d' }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{r.date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); openEditRelease(r) }} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                    <button onClick={e => { e.stopPropagation(); deleteRelease(r.id) }} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, color: '#de350b', borderColor: '#de350b' }}>Delete</button>
                    <span style={{ fontSize: 16, color: '#42526e' }}>{expandedId === r.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedId === r.id && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f4f5f7' }}>
                    {r.description && <p style={{ margin: '12px 0 8px', fontSize: 13, color: '#42526e' }}>{r.description}</p>}
                    {r.changes.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', marginBottom: 6, marginTop: r.description ? 0 : 12 }}>CHANGES</div>
                        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {r.changes.map((c, i) => (
                            <li key={i} style={{ fontSize: 13, color: '#42526e' }}>{c}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MILESTONES ── */}
      {activeTab === 'milestones' && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#172b4d', margin: 0 }}>Project Milestones</h2>
            <button style={btnPrimary} onClick={openNewMilestone}>+ New Milestone</button>
          </div>

          {milestones.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Chưa có milestone nào</div>
              <div style={{ fontSize: 13 }}>Tạo milestone để đánh dấu các mốc quan trọng trên roadmap</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {milestones.map(m => (
              <div key={m.id} style={{ background: '#fff', border: '1px solid #dfe1e6', borderRadius: 8, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ fontSize: 20 }}>🎯</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#172b4d' }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Target: {m.target_date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <TagBadge status={m.status} />
                    <button onClick={e => { e.stopPropagation(); openEditMilestone(m) }} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }}>Edit</button>
                    <button onClick={e => { e.stopPropagation(); deleteMilestone(m.id) }} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, color: '#de350b', borderColor: '#de350b' }}>Delete</button>
                    <span style={{ fontSize: 16, color: '#42526e' }}>{expandedId === m.id ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expandedId === m.id && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f4f5f7' }}>
                    {m.description && <p style={{ margin: '12px 0 8px', fontSize: 13, color: '#42526e' }}>{m.description}</p>}
                    {m.goals.length > 0 && (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', marginBottom: 6, marginTop: m.description ? 0 : 12 }}>GOALS</div>
                        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {m.goals.map((g, i) => (
                            <li key={i} style={{ fontSize: 13, color: '#42526e' }}>{g}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RELEASE FORM MODAL ── */}
      {showReleaseForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.54)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowReleaseForm(false)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#172b4d' }}>
              {editingReleaseId ? 'Edit Release' : 'New Release'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>VERSION *</label>
                  <input style={inputStyle()} placeholder="v1.0.0" value={releaseForm.version}
                    onChange={e => setReleaseForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>DATE *</label>
                  <input style={inputStyle()} type="date" value={releaseForm.date}
                    onChange={e => setReleaseForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>TITLE *</label>
                <input style={inputStyle()} placeholder="Release title" value={releaseForm.title}
                  onChange={e => setReleaseForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
                <textarea style={inputStyle({ resize: 'vertical', minHeight: 60 })} placeholder="What's in this release?"
                  value={releaseForm.description} onChange={e => setReleaseForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>CHANGES <span style={{ fontWeight: 400, color: '#6b7280' }}>(mỗi dòng một item)</span></label>
                <textarea style={inputStyle({ resize: 'vertical', minHeight: 100, fontFamily: 'monospace' })}
                  placeholder={"Added search engine\nFixed login bug\nImproved performance"}
                  value={releaseForm.changes} onChange={e => setReleaseForm(f => ({ ...f, changes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnSecondary} onClick={() => setShowReleaseForm(false)}>Cancel</button>
              <button style={btnPrimary} onClick={saveRelease}
                disabled={!releaseForm.version || !releaseForm.title || !releaseForm.date}>
                {editingReleaseId ? 'Save Changes' : 'Create Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MILESTONE FORM MODAL ── */}
      {showMilestoneForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.54)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowMilestoneForm(false)}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: 500, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#172b4d' }}>
              {editingMilestoneId ? 'Edit Milestone' : 'New Milestone'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>NAME *</label>
                <input style={inputStyle()} placeholder="Milestone name" value={milestoneForm.name}
                  onChange={e => setMilestoneForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>TARGET DATE *</label>
                  <input style={inputStyle()} type="date" value={milestoneForm.target_date}
                    onChange={e => setMilestoneForm(f => ({ ...f, target_date: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>STATUS</label>
                  <select style={inputStyle()} value={milestoneForm.status}
                    onChange={e => setMilestoneForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="upcoming">Upcoming</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
                <textarea style={inputStyle({ resize: 'vertical', minHeight: 60 })} placeholder="What does this milestone represent?"
                  value={milestoneForm.description} onChange={e => setMilestoneForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#172b4d', display: 'block', marginBottom: 4 }}>GOALS <span style={{ fontWeight: 400, color: '#6b7280' }}>(mỗi dòng một goal)</span></label>
                <textarea style={inputStyle({ resize: 'vertical', minHeight: 100, fontFamily: 'monospace' })}
                  placeholder={"Launch search feature\nOnboard 100 users\nAchieve 99% uptime"}
                  value={milestoneForm.goals} onChange={e => setMilestoneForm(f => ({ ...f, goals: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnSecondary} onClick={() => setShowMilestoneForm(false)}>Cancel</button>
              <button style={btnPrimary} onClick={saveMilestone}
                disabled={!milestoneForm.name || !milestoneForm.target_date}>
                {editingMilestoneId ? 'Save Changes' : 'Create Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
