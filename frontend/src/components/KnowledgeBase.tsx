import { useState, useEffect, useCallback, useRef } from 'react'
import { KbDoc } from '../types'
import { getKbDocs, updateKbDoc, deleteKbDoc } from '../api'

interface Props {
  activeProjectId: number | null
}

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const DEFAULT_CATEGORIES = ['General', 'Architecture', 'Research', 'Runbook', 'Meeting Summary', 'Reference']

const CAT_COLORS: Record<string, string> = {
  'General': '#6b778c',
  'Architecture': '#0052cc',
  'Research': '#6554c0',
  'Runbook': '#ff8b00',
  'Meeting Summary': '#00875a',
  'Reference': '#de350b',
}
const getCatColor = (cat: string) => CAT_COLORS[cat] ?? '#6b778c'

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', docx: '📝', doc: '📝', txt: '📃', md: '📃',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
  xlsx: '📊', xls: '📊', pptx: '📊', ppt: '📊',
}
const getFileIcon = (type?: string) => FILE_ICONS[type ?? ''] ?? '📁'

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

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
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('General')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const uploadFile = async (file: File) => {
    if (activeProjectId == null) return
    setUploading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const form = new FormData()
      form.append('file', file)
      form.append('project_id', String(activeProjectId))
      form.append('category', uploadCategory)
      const res = await fetch(`${BASE}/kb/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        alert(`Upload failed: ${err.detail}`)
        return
      }
      const doc: KbDoc = await res.json()
      setDocs(prev => [doc, ...prev])
      setSelected(doc.id)
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    for (const file of Array.from(files)) await uploadFile(file)
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    for (const file of Array.from(e.dataTransfer.files)) await uploadFile(file)
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

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...docs.map(d => d.category)]))
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

  const isPdf = selectedDoc?.file_type === 'pdf'
  const isImage = selectedDoc?.file_type && ['png', 'jpg', 'jpeg', 'gif'].includes(selectedDoc.file_type)

  if (activeProjectId == null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#6b778c', fontSize: 14 }}>
        Select a project to view its knowledge base.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 88px)', gap: 0 }}>
      {/* ── Sidebar ── */}
      <div style={{ width: 260, minWidth: 260, background: '#fff', borderRight: '1px solid #dfe1e6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Search + category selector */}
        <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #dfe1e6', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#172b4d' }}
          />
          <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: 12, outline: 'none', color: '#42526e' }}>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#0052cc' : '#dfe1e6'}`,
              borderRadius: 6, padding: '14px 8px', textAlign: 'center',
              cursor: uploading ? 'wait' : 'pointer',
              background: dragOver ? '#e9f2ff' : '#f4f5f7',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 4 }}>{uploading ? '⏳' : '☁️'}</div>
            <div style={{ fontSize: 12, color: '#42526e', fontWeight: 600 }}>
              {uploading ? 'Uploading...' : 'Click or drag & drop'}
            </div>
            <div style={{ fontSize: 11, color: '#6b778c', marginTop: 2 }}>PDF · DOCX · TXT · MD · Images</div>
          </div>
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.xlsx,.pptx" style={{ display: 'none' }} onChange={handleFileInput} />
        </div>

        {/* Category filter chips */}
        {usedCats.length > 1 && (
          <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 4, borderBottom: '1px solid #dfe1e6' }}>
            <button onClick={() => setFilterCat('')}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, border: '1px solid #dfe1e6', background: filterCat === '' ? '#0052cc' : '#f4f5f7', color: filterCat === '' ? '#fff' : '#6b778c', cursor: 'pointer', fontWeight: 600 }}>
              All
            </button>
            {usedCats.map(c => (
              <button key={c} onClick={() => setFilterCat(c === filterCat ? '' : c)}
                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, border: `1px solid ${getCatColor(c)}40`, background: filterCat === c ? getCatColor(c) : `${getCatColor(c)}15`, color: filterCat === c ? '#fff' : getCatColor(c), cursor: 'pointer', fontWeight: 600 }}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Doc list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <p style={{ color: '#6b778c', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading...</p>
          ) : filteredDocs.length === 0 ? (
            <div style={{ color: '#6b778c', fontSize: 13, textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No documents yet</div>
              <div style={{ fontSize: 12 }}>Upload a file to get started</div>
            </div>
          ) : (
            Object.entries(groupedDocs).map(([cat, catDocs]) => (
              <div key={cat}>
                <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, color: getCatColor(cat), letterSpacing: '0.08em', textTransform: 'uppercase' }}>{cat}</div>
                {catDocs.map(doc => (
                  <button key={doc.id} onClick={() => setSelected(doc.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', textAlign: 'left',
                      padding: '8px 14px', border: 'none', cursor: 'pointer',
                      background: selected === doc.id ? '#e9f2ff' : 'none',
                      borderLeft: selected === doc.id ? `3px solid ${getCatColor(cat)}` : '3px solid transparent',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{getFileIcon(doc.file_type)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: selected === doc.id ? 600 : 400, color: selected === doc.id ? '#0052cc' : '#172b4d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</div>
                      <div style={{ fontSize: 11, color: '#6b778c', marginTop: 1, display: 'flex', gap: 6 }}>
                        <span>{doc.file_type?.toUpperCase() ?? 'DOC'}</span>
                        {doc.file_size && <span>{formatSize(doc.file_size)}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Viewer / Editor ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
        {!selectedDoc ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b778c', fontSize: 14, flexDirection: 'column', gap: 12, background: '#f4f5f7' }}>
            <span style={{ fontSize: 48 }}>📄</span>
            <span style={{ fontWeight: 600, color: '#172b4d' }}>Select a document</span>
            <span style={{ fontSize: 13 }}>or upload a new file from the left panel</span>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #dfe1e6', display: 'flex', alignItems: 'center', gap: 10, background: '#fff', flexShrink: 0 }}>
              {/* File icon + info */}
              <span style={{ fontSize: 24, flexShrink: 0 }}>{getFileIcon(selectedDoc.file_type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editing ? (
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    style={{ width: '100%', fontSize: 16, fontWeight: 700, color: '#172b4d', border: 'none', borderBottom: '2px solid #0052cc', outline: 'none', padding: '2px 0', background: 'none' }} />
                ) : (
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#172b4d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedDoc.title}</h2>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  {editing ? (
                    <select value={category} onChange={e => setCategory(e.target.value)}
                      style={{ padding: '3px 6px', border: '1px solid #dfe1e6', borderRadius: 3, fontSize: 11, outline: 'none', color: '#42526e' }}>
                      {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 3, background: `${getCatColor(selectedDoc.category)}18`, color: getCatColor(selectedDoc.category), fontWeight: 700, letterSpacing: '0.03em' }}>
                      {selectedDoc.category}
                    </span>
                  )}
                  {selectedDoc.file_type && (
                    <span style={{ fontSize: 11, color: '#6b778c' }}>{selectedDoc.file_type.toUpperCase()}</span>
                  )}
                  {selectedDoc.file_size && (
                    <span style={{ fontSize: 11, color: '#6b778c' }}>{formatSize(selectedDoc.file_size)}</span>
                  )}
                  <span style={{ fontSize: 11, color: '#6b778c' }}>· Updated {new Date(selectedDoc.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {selectedDoc.file_url && (
                  <a
                    href={selectedDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`${selectedDoc.title}.${selectedDoc.file_type}`}
                    style={{ padding: '6px 14px', background: '#0052cc', color: '#fff', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  >
                    ↓ Download
                  </a>
                )}
                {editing ? (
                  <>
                    <button onClick={handleSave} disabled={saving}
                      style={{ padding: '6px 14px', background: '#0052cc', border: 'none', borderRadius: 4, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setTitle(selectedDoc.title); setContent(selectedDoc.content); setCategory(selectedDoc.category); setEditing(false) }}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: 13, cursor: 'pointer', color: '#42526e' }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditing(true)}
                      style={{ padding: '6px 14px', background: '#fff', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: 13, cursor: 'pointer', color: '#42526e' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(selectedDoc.id)}
                      style={{ padding: '6px 12px', background: '#fff', border: '1px solid #ffbdad', borderRadius: 4, fontSize: 13, cursor: 'pointer', color: '#de350b' }}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content area */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f4f5f7' }}>
              {editing ? (
                <textarea value={content} onChange={e => setContent(e.target.value)}
                  style={{ flex: 1, padding: 24, border: 'none', outline: 'none', fontSize: 14, lineHeight: 1.7, resize: 'none', fontFamily: '"SF Mono","Fira Code",monospace', color: '#172b4d', background: '#fff', margin: 16, borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }} />
              ) : isPdf && selectedDoc.file_url ? (
                /* PDF viewer via iframe */
                <iframe
                  src={selectedDoc.file_url}
                  style={{ flex: 1, border: 'none', width: '100%', height: '100%', background: '#fff' }}
                  title={selectedDoc.title}
                />
              ) : isImage && selectedDoc.file_url ? (
                /* Image viewer */
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24 }}>
                  <img
                    src={selectedDoc.file_url}
                    alt={selectedDoc.title}
                    style={{ maxWidth: '100%', borderRadius: 6, boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }}
                  />
                </div>
              ) : (
                /* Text content */
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                  <div style={{ background: '#fff', borderRadius: 4, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minHeight: 200 }}>
                    {selectedDoc.content ? (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.8, color: '#172b4d', fontFamily: 'inherit' }}>
                        {selectedDoc.content}
                      </pre>
                    ) : (
                      <div style={{ color: '#6b778c', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{getFileIcon(selectedDoc.file_type)}</div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>File uploaded successfully</div>
                        <div>Click Download to access the original file</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
