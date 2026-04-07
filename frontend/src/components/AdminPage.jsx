import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../AuthContext'
import BASE from '../api'

const G = '#b5f23d'

const thStyle = {
  padding: '10px 16px', textAlign: 'left',
  fontSize: '0.7rem', fontWeight: 700,
  color: '#555', textTransform: 'uppercase', letterSpacing: '1px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}
const tdStyle = {
  padding: '12px 16px', fontSize: '0.83rem', color: '#aaa',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}

function StatCard({ label, value }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(0,0,0,0.55)', borderRadius: 12,
        padding: '24px 28px', flex: 1, minWidth: 140,
        borderLeft: `3px solid ${G}`,
      }}
    >
      <div style={{ fontSize: '2rem', fontWeight: 900, color: G, letterSpacing: '-1px' }}>{value ?? '—'}</div>
      <div style={{ fontSize: '0.78rem', color: '#555', marginTop: 4 }}>{label}</div>
    </motion.div>
  )
}

export default function AdminPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [stats, setStats]         = useState(null)
  const [users, setUsers]         = useState([])
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const fetchStats = useCallback(async () => {
    const r = await fetch(`${BASE}/api/admin/stats`, { headers })
    if (r.ok) setStats(await r.json())
  }, [token])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`${BASE}/api/admin/users`, { headers })
    if (r.ok) setUsers(await r.json())
    setLoading(false)
  }, [token])

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`${BASE}/api/admin/history?limit=100`, { headers })
    if (r.ok) setHistory(await r.json())
    setLoading(false)
  }, [token])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'history') fetchHistory()
  }, [activeTab])

  const changeRole = async (email, role) => {
    await fetch(`${BASE}/api/admin/users/${encodeURIComponent(email)}/role`, {
      method: 'PUT', headers, body: JSON.stringify({ role })
    })
    setMsg(`Role updated for ${email}`)
    fetchUsers(); fetchStats()
    setTimeout(() => setMsg(''), 3000)
  }

  const removeUser = async (email) => {
    if (!window.confirm(`Delete user ${email}?`)) return
    await fetch(`${BASE}/api/admin/users/${encodeURIComponent(email)}`, { method: 'DELETE', headers })
    setMsg(`Deleted ${email}`)
    fetchUsers(); fetchStats()
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', padding: '48px 48px 100px', maxWidth: 1200 }}>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
        <div style={{ fontSize: '0.68rem', color: G, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>
          Admin Panel
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
          Dashboard
        </h1>
      </motion.div>

      {stats && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 40 }}>
          <StatCard label="Total Users"        value={stats.total_users} />
          <StatCard label="Total Translations" value={stats.total_translations} />
          <StatCard label="Admins"             value={stats.admin_count} />
          <StatCard label="Regular Users"      value={stats.user_count} />
        </div>
      )}

      {msg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 8,
            background: 'rgba(181,242,61,0.1)', color: G, fontSize: '0.85rem',
            border: '1px solid rgba(181,242,61,0.2)' }}>
          {msg}
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 2, marginBottom: 24 }}>
        {['users'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{
              padding: '9px 22px', border: 'none', borderRadius: 6,
              background: activeTab === t ? G : 'rgba(255,255,255,0.05)',
              color: activeTab === t ? '#000' : '#555',
              fontFamily: 'inherit', fontSize: '0.85rem',
              fontWeight: 700, cursor: 'pointer',
            }}>
            Users
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 12, overflow: 'auto' }}>
          {loading ? <div style={{ padding: 40, color: '#555', textAlign: 'center' }}>Loading...</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Joined</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.email}>
                    <td style={tdStyle}>{u.name}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700,
                        background: u.role === 'admin' ? 'rgba(181,242,61,0.15)' : 'rgba(255,255,255,0.06)',
                        color: u.role === 'admin' ? G : '#666',
                      }}>{u.role}</span>
                    </td>
                    <td style={tdStyle}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td style={{ ...tdStyle, display: 'flex', gap: 8 }}>
                      <button onClick={() => changeRole(u.email, u.role === 'admin' ? 'user' : 'admin')}
                        style={{
                          padding: '5px 12px', borderRadius: 5, border: `1px solid ${G}`,
                          background: 'transparent', color: G,
                          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        }}>
                        {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                      </button>
                      <button onClick={() => removeUser(u.email)}
                        style={{
                          padding: '5px 12px', borderRadius: 5,
                          border: '1px solid rgba(255,60,60,0.4)',
                          background: 'transparent', color: '#ff6b6b',
                          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#333' }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 12, overflow: 'auto' }}>
          {loading ? <div style={{ padding: 40, color: '#555', textAlign: 'center' }}>Loading...</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>From</th>
                  <th style={thStyle}>To</th>
                  <th style={thStyle}>Original</th>
                  <th style={thStyle}>Translated</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{h.user_email || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
                        background: 'rgba(255,255,255,0.06)', color: '#888',
                      }}>{h.type}</span>
                    </td>
                    <td style={tdStyle}>{h.src_lang}</td>
                    <td style={tdStyle}>{h.tgt_lang}</td>
                    <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.original}</td>
                    <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: G }}>{h.translated}</td>
                    <td style={tdStyle}>{h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#333' }}>No history found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </motion.div>
      )}
    </div>
  )
}
