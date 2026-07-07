import { useState, useEffect } from 'react'
import { getMembers, inviteMember, updateMember, removeMember, Member } from '../api'
import { AuthUser } from '../api'

interface Props {
  projectId: number
  currentUser: AuthUser
  isAdmin: boolean
}

const ROLE_LABEL: Record<string, string> = { admin: 'Admin', member: 'Member' }
const ROLE_COLOR: Record<string, string> = { admin: '#7c3aed', member: '#2563eb' }

export default function Members({ projectId, currentUser, isAdmin }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    setLoading(true)
    getMembers(projectId).then(setMembers).finally(() => setLoading(false))
  }, [projectId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteError('')
    try {
      const m = await inviteMember(projectId, inviteEmail.trim(), inviteRole)
      setMembers(prev => [...prev, m])
      setInviteEmail('')
    } catch (err: any) {
      const msg = err.message ?? ''
      if (msg.includes('404')) setInviteError('Email này chưa đăng ký tài khoản')
      else if (msg.includes('400')) setInviteError('User đã là thành viên')
      else setInviteError('Có lỗi xảy ra')
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (userId: number, role: string) => {
    const updated = await updateMember(projectId, userId, role)
    setMembers(prev => prev.map(m => m.user_id === userId ? updated : m))
  }

  const handleRemove = async (userId: number, name: string) => {
    if (!confirm(`Xóa ${name} khỏi project?`)) return
    await removeMember(projectId, userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  if (loading) return <p style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</p>

  return (
    <div>
      {/* Member list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {members.map(m => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fafafa',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#374151',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                {m.name}
                {m.user_id === currentUser.id && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>(bạn)</span>}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{m.email}</div>
            </div>
            {isAdmin && m.user_id !== currentUser.id ? (
              <>
                <select
                  value={m.role}
                  onChange={e => handleRoleChange(m.user_id, e.target.value)}
                  style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12, color: ROLE_COLOR[m.role], fontWeight: 600, outline: 'none' }}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
                <button onClick={() => handleRemove(m.user_id, m.name)}
                  style={{ padding: '4px 10px', border: '1px solid #fca5a5', borderRadius: 6, background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  Xóa
                </button>
              </>
            ) : (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10,
                background: `${ROLE_COLOR[m.role]}15`, color: ROLE_COLOR[m.role],
              }}>
                {ROLE_LABEL[m.role]}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Invite form (admin only) */}
      {isAdmin && (
        <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Mời thành viên</div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 12px' }}>
            Người được mời phải đăng ký tài khoản trước.
          </p>
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="email" placeholder="email@company.com" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)} required
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none' }}
            />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
              style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', color: '#374151' }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={inviting}
              style={{ padding: '8px 18px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: inviting ? 0.7 : 1 }}>
              {inviting ? '...' : 'Mời'}
            </button>
          </form>
          {inviteError && <div style={{ marginTop: 8, fontSize: 12, color: '#dc2626' }}>{inviteError}</div>}
        </div>
      )}
    </div>
  )
}
