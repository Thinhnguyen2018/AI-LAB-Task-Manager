import { useState, useEffect, useCallback } from 'react'
import { KbDoc } from '../types'
import { getKbDocs, createKbDoc, updateKbDoc, deleteKbDoc } from '../api'

interface Props {
  activeProjectId: number | null
}

const DEFAULT_CATEGORIES = ['General', 'Architecture', 'Research', 'Runbook', 'Meeting Summary', 'Reference']

export default function KnowledgeBase({ activeProjectId }: Props) {
  const [docs, setDocs] = useState<KbDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('General')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showNewDoc, setShowNewDoc] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('General')

  const load = useCallback(async () => {
    if (activeProjectId == null) { setDocs([]); setLoading(false); return }
    setLoading(true)
    try {
      const data = await getKbDocs(activeProjectId)
      setDocs(data)
      setSelected(prev => data.find(d => d.id === prev) ? prev : data[0]?.id ?? null)
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => { load() }, [load])

  const selectedDoc = docs.find(d => d.id === selected) ?? null

  useEffect(() => {
    if (selectedDoc) {
      setTitle(selectedDoc.title)
      setContent(selectedDoc.content)
      setCategory(selectedDoc.category)
      setEditing(false)
    }
  }, [selected])

  const handleCreate = async () => {
    if (!newTitle.trim() || activeProjectId == null) return
    const id = `doc-${Date.now()}`
    const doc = await createKbDoc({ id, title: newTitle.trim(), content: '', category: newCategory, project_id: activeProjectId })
    setDocs(prev => [doc, ...prev])
    setSelected(doc.id)
    setEditing(true)
    setShowNewDoc(false)
    setNewTitle('')
    setNewCategory('General')
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const updated = await updateKbDoc(selected, { title, content, category })
      setDocs(prev => prev.map(d => d.id === selected ? updated : d))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return
    await deleteKbDoc(id)
    const remaining = docs.filter(d => d.id !== id)
    setDocs(remaining)
    setSelected(remaining[0]?.id ?? null)
  }

  const categories = Array.from(new Set([...DEFAULT_CATEGORIES, ...docs.map(d => d.category)]))
  const usedCats = Array.from(new Set(docs.map(d => d.category)))

  const filteredDocs = docs.filter(d => {
    if (filterCat && d.category !== filterCat) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.content.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const groupedDocs = usedCats.reduce<Record<string, KbDoc[]>>((acc, cat) => {
    const catDocs = filteredDocs.filter(d => d.category === cat)
    if (catDocs.length > 0) acc[cat] = catDocs
    return acc
  }, {})

  const catColors: Record<string, string> = {
    'General': '#6b7280', 'Architecture': '#3b82f6', 'Research': '#8b5cf6',
    'Runbook': '#f59e0b', 'Meeting Summary': '#16a34a', 'Reference': '#ec4899',
  }
  const getCatColor = (cat: string) => catColors[cat] ?? '#6b7280'

  if (activeProjectId == null) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#9ca3af', fontSize: 14 }}>Select a project to view its knowledge base.</div>
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 104px)', gap: 0 }}>
      {/* Sidebar */}
      <div style={{ width: 260, minWidth: 260, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search + New */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            placeholder="Search docs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
          <button
            onClick={() => setShowNewDoc(v => !v)}
            style={{ background: '#111827', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '7px 0', cursor: 'pointer' }}
          >+ New Document</button>
          {showNewDoc && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f9fafb', borderRadius: 8, padding: 10 }}>
              <input
                autoFocus
                placeholder="Document title"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewDoc(false) }}
                style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, outline: 'none' }}
              />
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13, outline: 'none' }}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleCreate} style={{ flex: 1, background: '#111827', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, padding: '5px 0', cursor: 'pointer', fontWeight: 600 }}>Create</button>
                <button onClick={() => setShowNewDoc(false)} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, padding: '5px 0', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Category filter chips */}
        {usedCats.length > 1 && (
          <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid #f3f4f6' }}>
            <button onClick={() => setFilterCat('')}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, border: '1px solid #e5e7eb', background: filterCat === '' ? '#111827' : '#f3f4f6', color: filterCat === '' ? '#fff' : '#6b7280', cursor: 'pointer' }}>All</button>
            {usedCats.map(c => (
              <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)}
                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, border: `1px solid ${getCatColor(c)}30`, background: filterCat === c ? getCatColor(c) : `${getCatColor(c)}15`, color: filterCat === c ? '#fff' : getCatColor(c), cursor: 'pointer' }}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Doc list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading...</p>
          ) : filteredDocs.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>No documents yet</p>
          ) : (
            Object.entries(groupedDocs).map(([cat, catDocs]) => (
              <div key={cat}>
                <div style={{ padding: '6px 16px 2px', fontSize: 11, fontWeight: 600, color: getCatColor(cat), letterSpacing: '0.06em', textTransform: 'uppercase' }}>{cat}</div>
                {catDocs.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => setSelected(doc.id)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '8px 16px', border: 'none', cursor: 'pointer',
                      background: selected === doc.id ? '#f3f4f6' : 'none',
                      borderLeft: selected === doc.id ? `3px solid ${getCatColor(cat)}` : '3px solid transparent',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
        {!selectedDoc ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14, flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 32 }}>📄</span>
            <span>Select a document or create a new one</span>
          </div>
        ) : (
          <>
            {/* Doc toolbar */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
              {editing ? (
                <>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ flex: 1, fontSize: 18, fontWeight: 700, color: '#111827', border: 'none', outline: 'none', padding: 0 }}
                  />
                  <select value={category} onChange={e => setCategory(e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, outline: 'none' }}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '6px 16px', background: '#16a34a', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setTitle(selectedDoc.title); setContent(selectedDoc.content); setCategory(selectedDoc.category); setEditing(false) }}
                    style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{selectedDoc.title}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: `${getCatColor(selectedDoc.category)}15`, color: getCatColor(selectedDoc.category), fontWeight: 600 }}>{selectedDoc.category}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>Updated {new Date(selectedDoc.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => setEditing(true)}
                    style={{ padding: '6px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(selectedDoc.id)}
                    style={{ padding: '6px 12px', background: '#fff', border: '1px solid #fca5a5', borderRadius: 7, fontSize: 13, cursor: 'pointer', color: '#dc2626' }}>
                    Delete
                  </button>
                </>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {editing ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your document here... (Markdown supported)"
                  style={{ flex: 1, padding: '24px', border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.7, resize: 'none', fontFamily: '"SF Mono", "Fira Code", monospace', color: '#374151', background: '#fafafa' }}
                />
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                  {selectedDoc.content ? (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: 'inherit' }}>
                      {selectedDoc.content}
                    </pre>
                  ) : (
                    <div style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 60 }}>
                      No content yet. Click <b>Edit</b> to start writing.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
