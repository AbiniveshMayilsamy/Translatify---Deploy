import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LangRow from './LangRow'
import DropZone from './DropZone'
import ResultPanel from './ResultPanel'
import { useToast } from '../ToastContext'
import { useAuth } from '../AuthContext'
import BASE from '../api'

const G = '#b5f23d'

export default function AudioUpload({ langs }) {
  const toast = useToast()
  const { token } = useAuth()
  const [file, setFile] = useState(null)
  const [srcLang, setSrcLang] = useState('auto')
  const [tgtLang, setTgtLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const progRef = useRef(null)

  const animProg = () => {
    setProgress(0); let p = 0
    progRef.current = setInterval(() => { p = Math.min(p + Math.random() * 7, 88); setProgress(p); if (p >= 88) clearInterval(progRef.current) }, 300)
  }

  const translate = async () => {
    if (!file) return
    setLoading(true); setResult(null); animProg()
    const fd = new FormData()
    fd.append('file', file); fd.append('src_lang', srcLang); fd.append('tgt_lang', tgtLang)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 180000) // 3 minute timeout
      const res = await fetch(`${BASE}/api/translate-audio`, { 
        method: 'POST', 
        body: fd, 
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      })
      clearTimeout(timeout)
      const data = await res.json()
      clearInterval(progRef.current); setProgress(100)
      if (data.error) { setError(data.error); toast(data.error, 'error'); return }
      setError(null); setResult(data); toast('Audio translation complete!', 'success')
    } catch (e) { 
      const msg = e.name === 'AbortError' ? 'Request timeout - server may be busy' : e.message
      setError(msg); toast('Error: ' + msg, 'error') 
    }
    finally { setLoading(false); setTimeout(() => setProgress(0), 600) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 14, padding: '28px', borderLeft: '2px solid rgba(181,242,61,0.25)' }}>
        <div style={{ fontSize: '0.7rem', color: G, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 20 }}>Audio File Translation</div>
        <LangRow langs={langs} srcVal={srcLang} tgtVal={tgtLang} onSrc={setSrcLang} onTgt={setTgtLang} />
        <DropZone accept={{ 'audio/*': ['.wav','.mp3','.webm','.ogg','.m4a','.flac'] }}
          icon="🎵" label="Drag & drop audio file" hint="WAV · MP3 · WebM · OGG · M4A · FLAC" file={file} onFile={setFile} />

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.78rem', color: '#444', marginBottom: 8 }}>Processing with Whisper + NLLB-200...</div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button className="btn btn-green" onClick={translate} disabled={!file || loading}
          whileHover={!loading && file ? { scale: 1.02, boxShadow: '0 0 30px rgba(181,242,61,0.35)' } : {}}
          whileTap={!loading && file ? { scale: 0.97 } : {}}
          style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: '13px' }}>
          {loading
            ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⚙</motion.span> Translating...</>
            : <>🚀 Translate Audio</>}
        </motion.button>
      </div>
      {error && (
        <div style={{ marginTop: 16, background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.4)', borderRadius: 10, padding: '14px 18px', color: '#ff6b6b', fontSize: '0.85rem' }}>
          ❌ {error}
        </div>
      )}
      {result && <ResultPanel original={result.original} translated={result.translated} detectedLang={result.detected_language} audioUrl={result.audio_url} />}
    </motion.div>
  )
}
