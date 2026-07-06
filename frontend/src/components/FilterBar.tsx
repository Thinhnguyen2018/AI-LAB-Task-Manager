import { Task } from '../types'

interface Props {
  tasks: Task[]
  search: string
  setSearch: (v: string) => void
  filterModule: string
  setFilterModule: (v: string) => void
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterAssignee: string
  setFilterAssignee: (v: string) => void
}

const MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']
const STATUSES = ['pending', 'progress', 'done']

export default function FilterBar({
  tasks, search, setSearch,
  filterModule, setFilterModule,
  filterStatus, setFilterStatus,
  filterAssignee, setFilterAssignee,
}: Props) {
  const assignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[]

  const sel: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: 13,
    background: '#fff', color: '#374151',
  }

  const hasFilter = search || filterModule || filterStatus || filterAssignee

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <input
        type="text"
        placeholder="Search tasks..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...sel, width: 180 }}
      />
      <select value={filterModule} onChange={e => setFilterModule(e.target.value)} style={sel}>
        <option value="">All Modules</option>
        {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={sel}>
        <option value="">All Statuses</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={sel}>
        <option value="">All Assignees</option>
        {assignees.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      {hasFilter && (
        <button
          onClick={() => { setSearch(''); setFilterModule(''); setFilterStatus(''); setFilterAssignee('') }}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer' }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
