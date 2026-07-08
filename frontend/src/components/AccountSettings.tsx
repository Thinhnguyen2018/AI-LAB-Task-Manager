import { useState } from 'react'
import { AuthUser } from '../api'
import { updateMe } from '../api'

interface Props {
  currentUser: AuthUser
  onUserUpdate: (u: AuthUser) => void
  onBack: () => void
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b778c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '9px 12px', fontSize: 14, color: '#172b4d',
    background: '#fff', borderRadius: 4,
    border: `1px solid ${focused ? '#0052cc' : '#dfe1e6'}`,
    outline: 'none',
  }
}

function Alert({ type, text }: { type: 'ok' | 'err'; text: string }) {
  return (
    <div style={{
      fontSize: 13, padding: '9px 14px', borderRadius: 4, marginBottom: 16,
      background: type === 'ok' ? '#e3fcef' : '#ffebe6',
      color: type === 'ok' ? '#006644' : '#bf2600',
      border: `1px solid ${type === 'ok' ? '#abf5d1' : '#ffbdad'}`,
    }}>{text}</div>
  )
}

export default function AccountSettingsPage({ currentUser, onUserUpdate, onBack }: Props) {
  const [section, setSection] = useState<'profile' | 'password'>('profile')

  // Profile
  const [name, setName] = useState(currentUser.name)
  const [nameFocus, setNameFocus] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Password
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwFocus, setPwFocus] = useState([false, false, false])
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleSaveProfile = async () => {
    if (!name.trim()) return
    setProfileSaving(true); setProfileMsg(null)
    try {
      const updated = await updateMe({ name: name.trim() })
      onUserUpdate(updated)
      setProfileMsg({ type: 'ok', text: 'Đã cập nhật thông tin thành công.' })
    } catch (e: any) {
      setProfileMsg({ type: 'err', text: e.message })
    } finally { setProfileSaving(false) }
  }

  const handleSavePassword = async () => {
    if (newPw !== confirmPw) { setPwMsg({ type: 'err', text: 'Mật khẩu mới không khớp.' }); return }
    if (newPw.length < 6) { setPwMsg({ type: 'err', text: 'Mật khẩu tối thiểu 6 ký tự.' }); return }
    setPwSaving(true); setPwMsg(null)
    try {
      await updateMe({ current_password: curPw, new_password: newPw })
      setPwMsg({ type: 'ok', text: 'Đổi mật khẩu thành công.' })
      setCurPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      setPwMsg({ type: 'err', text: e.message })
    } finally { setPwSaving(false) }
  }

  const SECTIONS = [
    { key: 'profile' as const, label: 'Hồ sơ' },
    { key: 'password' as const, label: 'Bảo mật' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f4f5f7' }}>
      {/* Left nav */}
      <div style={{ width: 220, background: '#fff', borderRight: '1px solid #dfe1e6', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #dfe1e6', marginBottom: 8 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#0052cc', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 2L4 7l5 5"/></svg>
            Quay lại
          </button>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', background: '#0052cc', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700,
            }}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#172b4d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: '#6b778c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email}</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: '4px 8px' }}>
          {SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: section === s.key ? 600 : 400,
                color: section === s.key ? '#0052cc' : '#42526e',
                background: section === s.key ? '#e9f2ff' : 'none',
              }}
              onMouseEnter={e => { if (section !== s.key) (e.currentTarget as HTMLButtonElement).style.background = '#f4f5f7' }}
              onMouseLeave={e => { if (section !== s.key) (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
        {section === 'profile' && (
          <div style={{ maxWidth: 520 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#172b4d' }}>Hồ sơ cá nhân</h2>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: '#6b778c' }}>Cập nhật tên hiển thị của bạn.</p>

            <div style={{ background: '#fff', border: '1px solid #dfe1e6', borderRadius: 8, padding: '28px 28px 24px' }}>
              <Field label="Email">
                <div style={{ padding: '9px 12px', fontSize: 14, color: '#6b778c', background: '#f4f5f7', border: '1px solid #dfe1e6', borderRadius: 4 }}>
                  {currentUser.email}
                </div>
              </Field>
              <Field label="Tên hiển thị">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                  onFocus={() => setNameFocus(true)}
                  onBlur={() => setNameFocus(false)}
                  style={inputStyle(nameFocus)}
                />
              </Field>
              {profileMsg && <Alert {...profileMsg} />}
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving || !name.trim()}
                style={{ padding: '9px 20px', background: '#0052cc', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: profileSaving ? 0.7 : 1 }}
              >
                {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        )}

        {section === 'password' && (
          <div style={{ maxWidth: 520 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#172b4d' }}>Bảo mật</h2>
            <p style={{ margin: '0 0 28px', fontSize: 13, color: '#6b778c' }}>Đổi mật khẩu đăng nhập.</p>

            <div style={{ background: '#fff', border: '1px solid #dfe1e6', borderRadius: 8, padding: '28px 28px 24px' }}>
              {[
                { label: 'Mật khẩu hiện tại', val: curPw, set: setCurPw, idx: 0 },
                { label: 'Mật khẩu mới', val: newPw, set: setNewPw, idx: 1 },
                { label: 'Xác nhận mật khẩu mới', val: confirmPw, set: setConfirmPw, idx: 2 },
              ].map(({ label, val, set, idx }) => (
                <Field key={idx} label={label}>
                  <input
                    type="password"
                    value={val}
                    onChange={e => set(e.target.value)}
                    onFocus={() => setPwFocus(f => f.map((v, i) => i === idx ? true : v))}
                    onBlur={() => setPwFocus(f => f.map((v, i) => i === idx ? false : v))}
                    style={inputStyle(pwFocus[idx])}
                  />
                </Field>
              ))}
              {pwMsg && <Alert {...pwMsg} />}
              <button
                onClick={handleSavePassword}
                disabled={pwSaving || !curPw || !newPw || !confirmPw}
                style={{ padding: '9px 20px', background: '#0052cc', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: pwSaving ? 0.7 : 1 }}
              >
                {pwSaving ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
