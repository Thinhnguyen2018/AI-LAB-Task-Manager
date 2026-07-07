import { useState } from 'react'

const PROJECT_COLORS = ['#16a34a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

const SUGGESTED_MODULES = ['GreenRAG', 'Doc-Intelli', 'Infra', 'Integration', 'Milestone', 'Release', 'Frontend', 'Backend', 'Design', 'Marketing', 'Research', 'Testing']

interface Props {
  onConfirm: (name: string, color: string, modules: string[]) => Promise<void>
  onClose: () => void
}

export default function NewProjectModal({ onConfirm, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [modules, setModules] = useState<string[]>([])
  const [newModule, setNewModule] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleModule = (m: string) => {
    setModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const addCustomModule = () => {
    const m = newModule.trim()
    if (!m || modules.includes(m)) return
    setModules(prev => [...prev, m])
    setNewModule('')
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      await onConfirm(name.trim(), color, modules)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: 480, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Tạo project mới</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>Bước {step} / 2</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Step 1: Name + Color */}
        {step === 1 && (
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Tên project</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
                placeholder="Ví dụ: AI LAB, Onevoice..."
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Màu project</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 32, height: 32, borderRadius: '50%', background: c, border: 'none',
                    outline: color === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: 2, cursor: 'pointer', padding: 0,
                  }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '9px 20px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}>Hủy</button>
              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                style={{ padding: '9px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: name.trim() ? 'pointer' : 'not-allowed', opacity: name.trim() ? 1 : 0.5 }}
              >Tiếp theo →</button>
            </div>
          </div>
        )}

        {/* Step 2: Modules */}
        {step === 2 && (
          <div style={{ padding: 24 }}>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Chọn các module (nhãn task) cho project <strong style={{ color: '#111827' }}>{name}</strong>. Có thể thêm/xóa sau trong Settings.
            </p>

            {/* Suggested chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {SUGGESTED_MODULES.map(m => {
                const selected = modules.includes(m)
                return (
                  <button key={m} onClick={() => toggleModule(m)} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    border: `1.5px solid ${selected ? '#111827' : '#e5e7eb'}`,
                    background: selected ? '#111827' : '#fff',
                    color: selected ? '#fff' : '#374151',
                    transition: 'all 0.1s',
                  }}>
                    {selected && <span style={{ marginRight: 5 }}>✓</span>}{m}
                  </button>
                )
              })}
            </div>

            {/* Custom module input */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input
                placeholder="Thêm module tùy chỉnh..."
                value={newModule}
                onChange={e => setNewModule(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomModule()}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
              />
              <button onClick={addCustomModule} style={{ padding: '8px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}>
                Thêm
              </button>
            </div>

            {modules.length > 0 && (
              <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#6b7280' }}>
                Đã chọn: <strong style={{ color: '#111827' }}>{modules.join(', ')}</strong>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={{ padding: '9px 20px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}>← Quay lại</button>
              <button
                onClick={handleCreate}
                disabled={loading}
                style={{ padding: '9px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Đang tạo...' : '✓ Tạo project'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
