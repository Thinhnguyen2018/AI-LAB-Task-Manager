import { Task } from '../types'

interface Props {
  tasks: Task[]
  search: string
  setSearch: (v: string) => void
  filterModule: string
  setFilterModule: (v: string) => void
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterQuarter: string
  setFilterQuarter: (v: string) => void
  filterMonth: string
  setFilterMonth: (v: string) => void
  filterWeek: string
  setFilterWeek: (v: string) => void
  filterAssignee: string
  setFilterAssignee: (v: string) => void
}

const MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release']
const STATUSES = ['pending', 'progress', 'done']
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']
const MONTHS = [
  [1,'Jan'],[2,'Feb'],[3,'Mar'],[4,'Apr'],[5,'May'],[6,'Jun'],
  [7,'Jul'],[8,'Aug'],[9,'Sep'],[10,'Oct'],[11,'Nov'],[12,'Dec'],
] as [number, string][]

export default function FilterBar({
  tasks, search, setSearch,
  filterModule, setFilterModule,
  filterStatus, setFilterStatus,
  filterQuarter, setFilterQuarter,
  filterMonth, setFilterMonth,
  filterWeek, setFilterWeek,
  filterAssignee, setFilterAssignee,
}: Props) {
  const assignees = Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))) as string[]
  const weeks = Array.from(new Set(tasks.map(t => t.week).filter(Boolean))).sort((a, b) => (a as number) - (b as number)) as number[]

  const sel: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: 13,
    background: '#fff', color: '#374151',
  }

  const hasFilter = search || filterModule || filterStatus || filterQuarter || filterMonth || filterWeek || filterAssignee

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
      <select value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)} style={sel}>
        <option value="">All Quarters</option>
        {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
      </select>
      <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={sel}>
        <option value="">All Months</option>
        {MONTHS.map(([num, label]) => <option key={num} value={String(num)}>{label}</option>)}
      </select>
      <select value={filterWeek} onChange={e => setFilterWeek(e.target.value)} style={sel}>
        <option value="">All Weeks</option>
        {weeks.map(w => <option key={w} value={String(w)}>Week {w}</option>)}
      </select>
      <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} style={sel}>
        <option value="">All Assignees</option>
        {assignees.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      {hasFilter && (
        <button
          onClick={() => { setSearch(''); setFilterModule(''); setFilterStatus(''); setFilterQuarter(''); setFilterMonth(''); setFilterWeek(''); setFilterAssignee('') }}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer' }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
