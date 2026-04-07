import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LangRow from './LangRow'
import DropZone from './DropZone'
import ResultPanel from './ResultPanel'
import SegmentList from './SegmentList'
import { useToast } from '../ToastContext'
import { useAuth } from '../AuthContext'
import BASE from '../api'

const G = '#b5f23d'

export default function VideoUpload({ langs }) {
  const toast = useToast()
  const { token } = useAuth()
  const [file, setFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [srcLang, setSrcLang] = useState('auto')
  const [tgtLang, setTgtLang] = useState('en')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const progRef = useRef(null)

  const handleFile = f => { setFile(f); setVideoUrl(URL.createObjectURL(f)); setResult(null) }

  const animProg = () => {
    setProgress(0); let p = 0
    progRef.current = setInterval(() => { p = Math.min(p + Math.random() * 5, 88); setProgress(p); if (p >= 88) clearInterval(progRef.current) }, 400)
  }

  const translate = async () => {
    if (!file) return
    setLoading(true); setResult(null); animProg()
    const fd = new FormData()
    fd.append('file', file); fd.append('src_lang', srcLang); fd.append('tgt_lang', tgtLang)
    try {
      const res = await fetch(`${BASE}/api/translate-video`, { method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` } })
      clearInterval(progRef.current); setProgress(100)
      const ct = res.headers.get('content-type') || ''
      if (!ct.includes('application/json')) {
        const text = await res.text()
        toast('Server error: ' + text.slice(0, 120), 'error'); return
      }
      const data = await res.json()
      if (data.error) { toast(data.error, 'error'); return }
      setResult(data); toast('Video translation complete!', 'success')
    } catch (e) { toast('Error: ' + e.message, 'error') }
    finally { setLoading(false); setTimeout(() => setProgress(0), 600) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 14, padding: '28px', borderLeft: `2px solid rgba(181,242,61,0.3)` }}>
        <div style={{ fontSize: '0.7rem', color: G, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 20 }}>
          Video File Translation
        </div>

        <LangRow langs={langs} srcVal={srcLang} tgtVal={tgtLang} onSrc={setSrcLang} onTgt={setTgtLang} />

        <DropZone
          accept={{ 'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'] }}
          icon="🎬" label="Drag & drop video file"
          hint="MP4 · AVI · MOV · MKV · WebM — up to 500MB"
          file={file} onFile={handleFile}
        />

        {/* Video Preview */}
        <AnimatePresence>
          {videoUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginTop: 14, borderRadius: 10, overflow: 'hidden' }}
            >
              <video src={videoUrl} controls muted style={{ width: '100%', display: 'block', maxHeight: 280, borderRadius: 10 }} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: 8 }}>Extracting audio & translating with AI...</div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button className="btn btn-green" onClick={translate} disabled={!file || loading}
          whileHover={!loading && file ? { scale: 1.02, boxShadow: '0 0 30px rgba(181,242,61,0.35)' } : {}}
          whileTap={!loading && file ? { scale: 0.97 } : {}}
          style={{ marginTop: 20, width: '100%', justifyContent: 'center', padding: '13px' }}>
          {loading
            ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⚙</motion.span> Processing Video...</>
            : <>🚀 Translate Video</>}
        </motion.button>
      </div>

      {result && (
        <>
          <ResultPanel original={result.original} translated={result.translated} detectedLang={result.detected_language} audioUrl={result.audio_url} />
          <SegmentList segments={result.segments} />
        </>
      )}
    </motion.div>
  )
}
