import { useState } from 'react'
import { authLogin, authRegister, AuthToken } from '../api'

interface Props {
  onAuth: (token: AuthToken) => void
}

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = mode === 'login'
        ? await authLogin(email, password)
        : await authRegister(email, name, password)
      onAuth(res)
    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes('401') || msg.includes('Invalid')) setError('Email hoặc mật khẩu không đúng')
      else if (msg.includes('400') || msg.includes('already')) setError('Email đã được đăng ký')
      else setError('Có lỗi xảy ra, thử lại nhé')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f3f4f6',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 48px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: 400, maxWidth: '90vw',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: '#111827',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#4ade80', marginBottom: 12,
          }}>T</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>TaskFlow</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {mode === 'login' ? 'Đăng nhập vào workspace' : 'Tạo tài khoản mới'}
          </div>
        </div>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Họ tên</label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Mật khẩu</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            marginTop: 4, padding: '11px 0', background: '#111827', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? '...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
          {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
            style={{ background: 'none', border: 'none', color: '#111827', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            {mode === 'login' ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  )
}
