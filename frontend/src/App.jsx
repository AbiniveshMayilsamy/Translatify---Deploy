import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import socket from './socket'
import BASE from './api'
import Header from './components/Header'
import TabBar from './components/TabBar'
import HomePage from './components/HomePage'
import AboutPage from './components/AboutPage'
import LoginPage from './components/LoginPage'
import AdminPage from './components/AdminPage'
import VoiceRecorder from './components/VoiceRecorder'
import AudioUpload from './components/AudioUpload'
import VideoUpload from './components/VideoUpload'
import Footer from './components/Footer'
import { ToastProvider } from './ToastContext'
import { AuthProvider, useAuth } from './AuthContext'
import videoBg from './assets/translation.mp4'

const TRANSLATOR_TABS = ['voice', 'audio', 'video']

function AppInner() {
  const { isLoggedIn, user } = useAuth()
  const [page, setPage]       = useState(() => {
    try {
      const token = localStorage.getItem('translatify_token')
      const u = JSON.parse(localStorage.getItem('translatify_user'))
      if (token && u?.role === 'user') return 'translate'
    } catch {}
    return 'home'
  })
  const [tab, setTab]         = useState('voice')
  const [connected, setConnected] = useState(false)
  const [status, setStatus]   = useState('Connecting...')
  const [langs, setLangs]     = useState({})

  useEffect(() => {
    socket.on('connect',    () => { setConnected(true);  setStatus('Connected') })
    socket.on('disconnect', () => { setConnected(false); setStatus('Disconnected') })
    socket.on('status', d => setStatus(d.message))
    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('status') }
  }, [])

  useEffect(() => {
    fetch(`${BASE}/api/languages`).then(r => r.json()).then(setLangs).catch(() => {})
  }, [])

  const handleNav = (id) => {
    if (id === 'login') { setPage('login'); return }
    if (id === 'admin') {
      if (user?.role === 'admin') setPage('admin')
      else setPage('login')
      return
    }
    if (TRANSLATOR_TABS.includes(id)) {
      if (!isLoggedIn) { setPage('login'); return }
      if (user?.role === 'admin') { setPage('admin'); return }
      setTab(id); setPage('translate')
    } else {
      setPage(id)
    }
  }

  const headerPage = page === 'translate' ? tab : page
  const panels = { voice: VoiceRecorder, audio: AudioUpload, video: VideoUpload }
  const Panel = panels[tab]

  return (
    <ToastProvider>
      {/* Video background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <video autoPlay loop muted playsInline src={videoBg}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header connected={connected} status={status} page={headerPage} onNav={handleNav} />

        <AnimatePresence mode="wait">

          {page === 'home' && (
            <motion.div key="home"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <HomePage onStart={handleNav} />
            </motion.div>
          )}

          {page === 'about' && (
            <motion.div key="about"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <AboutPage />
            </motion.div>
          )}

          {page === 'login' && (
            <motion.div key="login"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <LoginPage onSuccess={(role) => setPage(role === 'admin' ? 'home' : 'translate')} />
            </motion.div>
          )}

          {page === 'admin' && isLoggedIn && user?.role === 'admin' && (
            <motion.div key="admin"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <AdminPage />
            </motion.div>
          )}

          {page === 'translate' && isLoggedIn && (
            <motion.div key="translate"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: '0.68rem', color: '#b5f23d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>
                    Translation Studio
                  </div>
                  <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
                    AI Translation
                  </h1>
                </motion.div>
                <TabBar active={tab} onChange={t => setTab(t)} />
                <AnimatePresence mode="wait">
                  <motion.div key={tab}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}>
                    <Panel langs={langs} />
                  </motion.div>
                </AnimatePresence>
              </main>
            </motion.div>
          )}

          {/* Redirect to login if not authenticated */}
          {page === 'translate' && !isLoggedIn && (
            <motion.div key="login-redirect"
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -60 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
              <LoginPage onSuccess={(role) => setPage(role === 'admin' ? 'admin' : 'translate')} />
            </motion.div>
          )}

        </AnimatePresence>

        <Footer onNav={handleNav} />
      </div>
    </ToastProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
