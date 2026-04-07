import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import logo from '../assets/logo.png'
import { useAuth } from '../AuthContext'

const G = '#b5f23d'

const NAV = [
  { id: 'home',  label: 'Home' },
  { id: 'voice', label: 'Voice', userOnly: true },
  { id: 'audio', label: 'Audio', userOnly: true },
  { id: 'video', label: 'Video', userOnly: true },
  { id: 'about', label: 'About' },
]

export default function Header({ connected, status, page, onNav }) {
  const { user, isLoggedIn, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    ...NAV.filter(n => !n.userOnly || !isAdmin),
    ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : []),
  ]

  const handleNav = (id) => { onNav(id); setMenuOpen(false) }

  return (
    <>
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'sticky', top: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 62,
        }}
      >
        {/* Logo */}
        <motion.div onClick={() => handleNav('home')} whileTap={{ scale: 0.97 }} style={{ cursor: 'pointer' }}>
          <img src={logo} alt="Translatify" style={{ height: 28, objectFit: 'contain', display: 'block' }} />
        </motion.div>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, marginLeft: 24 }}
          className="desktop-nav">
          {navItems.map(n => {
            const isActive = page === n.id
            return (
              <motion.button key={n.id} onClick={() => handleNav(n.id)}
                whileHover={{ color: G }} whileTap={{ scale: 0.95 }}
                style={{
                  position: 'relative', padding: '8px 16px',
                  border: 'none', background: 'transparent',
                  color: isActive ? G : '#555',
                  fontFamily: 'inherit', fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                }}>
                {n.label}
                {isActive && (
                  <motion.div layoutId="nav-underline"
                    style={{ position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, background: G, borderRadius: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* Right side desktop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="desktop-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? G : '#333' }}
              animate={connected ? { boxShadow: ['0 0 0 0 rgba(181,242,61,0.6)', '0 0 0 6px rgba(181,242,61,0)', '0 0 0 0 rgba(181,242,61,0)'] } : {}}
              transition={{ duration: 1.8, repeat: Infinity }} />
            <span style={{ fontSize: '0.75rem', color: connected ? G : '#444' }}>{status}</span>
          </div>
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(181,242,61,0.15)', border: `1px solid ${G}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 800, color: G }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600, lineHeight: 1.2 }}>{user?.name}</span>
                <span style={{ fontSize: '0.65rem', color: user?.role === 'admin' ? G : '#444', fontWeight: 600, textTransform: 'uppercase' }}>{user?.role}</span>
              </div>
              <motion.button onClick={logout} whileHover={{ color: '#ff6b6b' }}
                style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, background: 'transparent', color: '#555', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                Logout
              </motion.button>
            </div>
          ) : (
            <motion.button onClick={() => handleNav('login')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              style={{ padding: '7px 20px', borderRadius: 7, background: G, border: 'none', color: '#000', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>
              Login
            </motion.button>
          )}
        </div>

        {/* Mobile right: status dot + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="mobile-nav">
          <motion.div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? G : '#333' }}
            animate={connected ? { boxShadow: ['0 0 0 0 rgba(181,242,61,0.6)', '0 0 0 6px rgba(181,242,61,0)', '0 0 0 0 rgba(181,242,61,0)'] } : {}}
            transition={{ duration: 1.8, repeat: Infinity }} />
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[0,1,2].map(i => (
              <motion.span key={i} animate={menuOpen ? (i === 1 ? { opacity: 0 } : i === 0 ? { rotate: 45, y: 9 } : { rotate: -45, y: -9 }) : { rotate: 0, y: 0, opacity: 1 }}
                style={{ display: 'block', width: 22, height: 2, background: '#fff', borderRadius: 2 }} />
            ))}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ position: 'fixed', top: 62, left: 0, right: 0, zIndex: 199, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 20px 24px' }}>
            {navItems.map(n => (
              <button key={n.id} onClick={() => handleNav(n.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '13px 0', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', color: page === n.id ? G : '#aaa', fontFamily: 'inherit', fontSize: '1rem', fontWeight: page === n.id ? 700 : 400, cursor: 'pointer' }}>
                {n.label}
              </button>
            ))}
            <div style={{ marginTop: 16 }}>
              {isLoggedIn ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#fff', fontSize: '0.9rem' }}>{user?.name} <span style={{ color: G, fontSize: '0.75rem' }}>({user?.role})</span></span>
                  <button onClick={() => { logout(); setMenuOpen(false) }}
                    style={{ padding: '8px 16px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, background: 'transparent', color: '#ff6b6b', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer' }}>
                    Logout
                  </button>
                </div>
              ) : (
                <button onClick={() => handleNav('login')}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, background: G, border: 'none', color: '#000', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer' }}>
                  Login
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
