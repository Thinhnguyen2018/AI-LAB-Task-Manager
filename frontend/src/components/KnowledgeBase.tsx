import { useState, useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
import { KbDoc, KbCollection } from '../types'
import { getKbDocs, updateKbDoc, deleteKbDoc, getKbCollections, createKbCollection, updateKbCollection, deleteKbCollection } from '../api'

interface Props {
  activeProjectId: number | null
}

const BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', docx: '📝', doc: '📝', txt: '📃', md: '📃',
  html: '🌐',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
  xlsx: '📊', xls: '📊', pptx: '📊', ppt: '📊',
}
const getFileIcon = (type?: string) => FILE_ICONS[type ?? ''] ?? '📁'

const TYPE_COLORS: Record<string, string> = {
  pdf: '#de350b', docx: '#0052cc', doc: '#0052cc', md: '#6554c0',
  html: '#0065ff', txt: '#6b778c', png: '#00875a', jpg: '#00875a', xlsx: '#36b37e',
}
const getTypeColor = (type?: string) => TYPE_COLORS[type ?? ''] ?? '#6b778c'

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Collection List (index) ──────────────────────────────────────────────────
function CollectionList({ projectId, onOpen }: { projectId: number; onOpen: (c: KbCollection) => void }) {
  const [collections, setCollections] = useState<KbCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setCollections(await getKbCollections(projectId)) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const col = await createKbCollection({ name: newName.trim(), description: newDesc.trim() || undefined, project_id: projectId })
      setCollections(prev => [col, ...prev])
      setCreating(false); setNewName(''); setNewDesc('')
    } catch (e: any) {
      alert(`Lỗi tạo Knowledge Base: ${e.message}`)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this knowledge base and all its files?')) return
    await deleteKbCollection(id)
    setCollections(prev => prev.filter(c => c.id !== id))
  }

  const filtered = collections.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#172b4d' }}>Knowledge Base</h1>
        <button
          onClick={() => setCreating(true)}
          style={{ background: '#172b4d', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Create new Knowledge Base
        </button>
      </div>

      {/* Search */}
      <input
        placeholder="Search by name..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box', color: '#172b4d' }}
      />

      {/* Create modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9,30,66,0.54)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 32, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#172b4d' }}>New Knowledge Base</h2>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b778c', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name *</label>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Research Documents"
              style={{ width: '100%', padding: '9px 12px', border: '2px solid #0052cc', borderRadius: 4, fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
            />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b778c', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', color: '#172b4d' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}
                style={{ padding: '8px 16px', background: '#fff', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: 13, cursor: 'pointer', color: '#42526e' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving || !newName.trim()}
                style={{ padding: '8px 20px', background: '#0052cc', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: '#6b778c', fontSize: 14 }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b778c' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#172b4d', marginBottom: 6 }}>No knowledge bases yet</div>
          <div style={{ fontSize: 13 }}>Create one to start organizing your documents</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #dfe1e6', borderRadius: 6, overflow: 'hidden' }}>
          {filtered.map((col, i) => (
            <div
              key={col.id}
              onClick={() => onOpen(col)}
              style={{
                display: 'flex', alignItems: 'center', padding: '16px 20px',
                borderTop: i > 0 ? '1px solid #dfe1e6' : 'none',
                cursor: 'pointer', background: '#fff',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f4f5f7')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{ width: 36, height: 36, borderRadius: 6, background: '#e9f2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginRight: 16, flexShrink: 0 }}>
                📚
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#172b4d' }}>{col.name}</div>
                <div style={{ fontSize: 12, color: '#6b778c', marginTop: 2 }}>{col.description || 'No description'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: '#6b778c', background: '#f4f5f7', borderRadius: 3, padding: '2px 8px' }}>
                  {col.file_count} {col.file_count === 1 ? 'file' : 'files'}
                </span>
                <span style={{ fontSize: 11, color: '#6b778c' }}>{new Date(col.updated_at).toLocaleDateString()}</span>
                <button
                  onClick={e => handleDelete(col.id, e)}
                  style={{ background: 'none', border: 'none', color: '#6b778c', cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 3, lineHeight: 1 }}
                  title="Delete"
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Collection Detail (files inside) ────────────────────────────────────────
function CollectionDetail({ collection, onBack }: { collection: KbCollection; onBack: () => void }) {
  const [docs, setDocs] = useState<KbDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<KbDoc | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [colName, setColName] = useState(collection.name)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getKbDocs(collection.id)
      setDocs(data)
    } finally { setLoading(false) }
  }, [collection.id])

  useEffect(() => { load() }, [load])

  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 90_000)
    try {
      const token = localStorage.getItem('auth_token')
      const form = new FormData()
      form.append('file', file)
      form.append('collection_id', collection.id)
      form.append('category', 'General')
      const res = await fetch(`${BASE}/kb/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        setUploadError(`Upload failed: ${err.detail}`)
        return
      }
      const doc: KbDoc = await res.json()
      setDocs(prev => [doc, ...prev])
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setUploadError('Upload timeout — backend quá chậm, thử lại sau ít phút')
      } else {
        setUploadError(`Lỗi kết nối: ${e.message}`)
      }
    } finally {
      clearTimeout(timer)
      setUploading(false)
    }
  }

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    for (const f of Array.from(files)) await uploadFile(f)
    e.target.value = ''
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this file?')) return
    await deleteKbDoc(id)
    setDocs(prev => prev.filter(d => d.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const handleSaveName = async () => {
    if (!colName.trim()) return
    await updateKbCollection(collection.id, { name: colName.trim() })
    setEditingName(false)
  }

  const isPdf = selected?.file_type === 'pdf'
  const isImage = selected?.file_type && ['png', 'jpg', 'jpeg', 'gif'].includes(selected.file_type)
  const isMd = selected?.file_type === 'md'
  const isHtml = selected?.file_type === 'html'

  const [numPages, setNumPages] = useState<number>(0)
  const [pdfError, setPdfError] = useState(false)
  useEffect(() => { setNumPages(0); setPdfError(false) }, [selected?.id])

  const pdfFile = isPdf && selected?.content
    ? (() => {
        try {
          const bin = atob(selected.content)
          const arr = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
          return { data: arr }
        } catch { return null }
      })()
    : null


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid #dfe1e6', flexShrink: 0 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 13, color: '#6b778c' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0052cc', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500 }}>
            Knowledge base
          </button>
          <span>›</span>
          <span style={{ color: '#172b4d', fontWeight: 500 }}>{collection.name}</span>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {editingName ? (
            <input
              autoFocus
              value={colName}
              onChange={e => setColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
              onBlur={handleSaveName}
              style={{ fontSize: 22, fontWeight: 700, color: '#172b4d', border: 'none', borderBottom: '2px solid #0052cc', outline: 'none', padding: '2px 0', background: 'none', flex: 1 }}
            />
          ) : (
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#172b4d', flex: 1 }}>{colName}</h1>
          )}
          <button onClick={() => setEditingName(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b778c', fontSize: 16, padding: '4px 6px' }}
            title="Rename">✏️</button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ background: '#0052cc', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: uploading ? 0.7 : 1 }}
          >
            {uploading ? '⏳ Uploading...' : '↑ Upload'}
          </button>
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.html,.png,.jpg,.jpeg,.gif,.xlsx,.pptx" style={{ display: 'none' }} onChange={handleFiles} />
        </div>

        {uploadError && (
          <div style={{ marginTop: 8, padding: '8px 14px', background: '#ffebe6', border: '1px solid #ffbdad', borderRadius: 4, fontSize: 13, color: '#bf2600', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bf2600', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', gap: 24, marginTop: 10, fontSize: 12, color: '#6b778c' }}>
          <span><span style={{ color: '#42526e', fontWeight: 500 }}>ID</span>&nbsp;&nbsp;{collection.id}</span>
          <span><span style={{ color: '#42526e', fontWeight: 500 }}>{docs.length}</span> files</span>
          <span><span style={{ color: '#42526e', fontWeight: 500 }}>Updated</span>&nbsp;&nbsp;{new Date(collection.updated_at).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Body: file list + viewer */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* File list */}
        <div style={{ flex: selected ? '0 0 480px' : '1', borderRight: selected ? '1px solid #dfe1e6' : 'none', overflowY: 'auto' }}>
          {loading ? (
            <p style={{ color: '#6b778c', fontSize: 13, padding: 20 }}>Loading...</p>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b778c' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#172b4d', marginBottom: 6 }}>No files yet</div>
              <div style={{ fontSize: 13 }}>Click Upload to add documents</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {docs.map(doc => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelected(s => s?.id === doc.id ? null : doc)}
                    style={{
                      borderBottom: '1px solid #dfe1e6',
                      cursor: 'pointer',
                      background: selected?.id === doc.id ? '#e9f2ff' : '#fff',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (selected?.id !== doc.id) e.currentTarget.style.background = '#f4f5f7' }}
                    onMouseLeave={e => { if (selected?.id !== doc.id) e.currentTarget.style.background = '#fff' }}
                  >
                    <td style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{getFileIcon(doc.file_type)}</span>
                      {/* Name + badges block */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#172b4d', fontWeight: 500, fontSize: 13, lineHeight: 1.4, wordBreak: 'break-all' }}>
                          {doc.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: getTypeColor(doc.file_type),
                            background: `${getTypeColor(doc.file_type)}18`,
                            padding: '1px 6px', borderRadius: 3,
                          }}>
                            {doc.file_type?.toUpperCase() ?? 'FILE'}
                          </span>
                          {doc.file_size ? <span style={{ fontSize: 11, color: '#97a0af' }}>{formatSize(doc.file_size)}</span> : null}
                        </div>
                      </div>
                      {/* Actions */}
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download
                          onClick={e => e.stopPropagation()}
                          style={{ color: '#6b778c', fontSize: 15, flexShrink: 0, textDecoration: 'none', padding: '2px 4px' }}
                          title="Download">↓</a>
                      )}
                      <button onClick={e => handleDelete(doc.id, e)}
                        style={{ background: 'none', border: 'none', color: '#6b778c', cursor: 'pointer', fontSize: 13, padding: '2px 4px', flexShrink: 0 }}
                        title="Delete">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* File viewer */}
        {selected && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Viewer header */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #dfe1e6', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#fff' }}>
              <span style={{ fontSize: 18 }}>{getFileIcon(selected.file_type)}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#172b4d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.title}</span>
              <span style={{ fontSize: 12, color: '#6b778c' }}>{formatSize(selected.file_size)}</span>
              {selected.file_url && (
                <a href={selected.file_url} target="_blank" rel="noopener noreferrer" download
                  style={{ padding: '5px 12px', background: '#0052cc', color: '#fff', borderRadius: 4, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                  ↓ Download
                </a>
              )}
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: '#6b778c', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px' }}>×</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden', background: '#f4f5f7' }}>
              {isPdf && selected.file_url ? (
                <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 8, background: '#525659' }}>
                  {pdfError ? (
                    <div style={{ color: '#fff', fontSize: 14, textAlign: 'center', marginTop: 60 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                      <div>Không thể hiển thị PDF</div>
                      <a href={selected.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4fc3f7', marginTop: 8, display: 'block' }}>Mở trong tab mới</a>
                    </div>
                  ) : (
                    <Document
                      file={pdfFile ?? undefined}
                      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                      onLoadError={(err) => { console.error('[PDF]', err); setPdfError(true) }}
                      loading={<div style={{ color: '#fff', marginTop: 40 }}>Đang tải PDF...</div>}
                      noData={<div style={{ color: '#fff', marginTop: 40, fontSize: 13 }}>Xóa PDF cũ và upload lại để xem preview</div>}
                    >
                      {Array.from({ length: numPages }, (_, i) => (
                        <Page
                          key={i + 1}
                          pageNumber={i + 1}
                          width={600}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                        />
                      ))}
                    </Document>
                  )}
                </div>
              ) : isHtml && selected.content ? (
                <iframe
                  srcDoc={selected.content}
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                  title={selected.title}
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : isImage && selected.file_url ? (
                <div style={{ height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <img src={selected.file_url} alt={selected.title} style={{ maxWidth: '100%', borderRadius: 6, boxShadow: '0 2px 16px rgba(0,0,0,0.12)' }} />
                </div>
              ) : (
                <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>
                  <div style={{ background: '#fff', borderRadius: 4, padding: '24px 32px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    {selected.content ? (
                      isMd ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 style={{ fontSize: 24, fontWeight: 700, color: '#172b4d', margin: '0 0 16px', paddingBottom: 8, borderBottom: '2px solid #dfe1e6' }}>{children}</h1>,
                            h2: ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 700, color: '#172b4d', margin: '24px 0 10px' }}>{children}</h2>,
                            h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, color: '#172b4d', margin: '18px 0 8px' }}>{children}</h3>,
                            p: ({ children }) => <p style={{ margin: '0 0 12px', lineHeight: 1.8, color: '#172b4d', fontSize: 14 }}>{children}</p>,
                            ul: ({ children }) => <ul style={{ margin: '0 0 12px', paddingLeft: 24 }}>{children}</ul>,
                            ol: ({ children }) => <ol style={{ margin: '0 0 12px', paddingLeft: 24 }}>{children}</ol>,
                            li: ({ children }) => <li style={{ marginBottom: 4, lineHeight: 1.7, fontSize: 14, color: '#172b4d' }}>{children}</li>,
                            code: ({ inline, children }: any) => inline
                              ? <code style={{ background: '#f4f5f7', border: '1px solid #dfe1e6', borderRadius: 3, padding: '1px 5px', fontSize: 12, fontFamily: 'monospace', color: '#de350b' }}>{children}</code>
                              : <pre style={{ background: '#f4f5f7', border: '1px solid #dfe1e6', borderRadius: 4, padding: '12px 16px', overflowX: 'auto', margin: '12px 0' }}><code style={{ fontSize: 13, fontFamily: 'monospace', color: '#172b4d' }}>{children}</code></pre>,
                            blockquote: ({ children }) => <blockquote style={{ borderLeft: '4px solid #0052cc', margin: '12px 0', padding: '8px 16px', background: '#e9f2ff', borderRadius: '0 4px 4px 0' }}>{children}</blockquote>,
                            hr: () => <hr style={{ border: 'none', borderTop: '1px solid #dfe1e6', margin: '20px 0' }} />,
                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#0052cc', textDecoration: 'none' }}>{children}</a>,
                            table: ({ children }) => <div style={{ overflowX: 'auto', margin: '12px 0' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>{children}</table></div>,
                            th: ({ children }) => <th style={{ background: '#f4f5f7', border: '1px solid #dfe1e6', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{children}</th>,
                            td: ({ children }) => <td style={{ border: '1px solid #dfe1e6', padding: '8px 12px', color: '#42526e' }}>{children}</td>,
                          }}
                        >
                          {selected.content}
                        </ReactMarkdown>
                      ) : (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.8, color: '#172b4d', fontFamily: 'inherit' }}>
                          {selected.content}
                        </pre>
                      )
                    ) : (
                      <div style={{ color: '#6b778c', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{getFileIcon(selected.file_type)}</div>
                        <div style={{ fontWeight: 600, color: '#172b4d', marginBottom: 4 }}>File uploaded to cloud</div>
                        <div>Click Download to access the original file</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Root component ───────────────────────────────────────────────────────────
export default function KnowledgeBase({ activeProjectId }: Props) {
  const [openCollection, setOpenCollection] = useState<KbCollection | null>(null)

  if (activeProjectId == null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#6b778c', fontSize: 14 }}>
        Select a project to view its knowledge base.
      </div>
    )
  }

  if (openCollection) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <CollectionDetail collection={openCollection} onBack={() => setOpenCollection(null)} />
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <CollectionList projectId={activeProjectId} onOpen={setOpenCollection} />
    </div>
  )
}
