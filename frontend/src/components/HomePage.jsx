import { useEffect, useRef } from 'react'

const G = '#b5f23d'

const STATS = [
  { value: '28+', label: 'Languages' },
  { value: 'Real-time', label: 'Voice AI' },
  { value: 'Whisper', label: 'ASR Model' },
  { value: 'Google', label: 'Translator' },
]

const FEATURES = [
  { title: 'Voice Recording', desc: 'Record live voice and get instant transcription + translation via WebSocket streaming.' },
  { title: 'Audio Translation', desc: 'Upload WAV, MP3, OGG, FLAC — full AI pipeline with speech recognition and translation.' },
  { title: 'Video Translation', desc: 'Upload any video. Audio is extracted, transcribed, translated with timestamped subtitles.' },
  { title: 'Text-to-Speech', desc: 'Every translation is synthesized to natural audio using gTTS, playable in the browser.' },
  { title: 'Whisper ASR', desc: "OpenAI's accurate speech recognition model running locally on your machine." },
  { title: 'Google Translate', desc: 'Fast and accurate translation across 28 languages with no API key required.' },
]

function Reveal({ children, type = 'reveal', delay = 0, style = {} }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.transitionDelay = `${delay}s`
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={type} style={style}>{children}</div>
}

export default function HomePage({ onStart }) {
  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ padding: 'clamp(40px, 8vw, 90px) clamp(20px, 5vw, 64px) 72px', maxWidth: 1200 }}>

        <Reveal delay={0}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(181,242,61,0.1)', color: G,
            padding: '5px 14px', borderRadius: 4,
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: 20, display: 'inline-flex',
          }}>Design Thinking Project 2026</span>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 style={{
            fontFamily: 'Space Grotesk, Inter, sans-serif',
            fontSize: 'clamp(3.5rem, 8vw, 7rem)',
            fontWeight: 900, lineHeight: 0.95,
            letterSpacing: '-3px', marginBottom: 28, color: '#fff',
          }}>
            Translatify<span style={{ color: G }}>.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: '#aaa', lineHeight: 1.7,
            maxWidth: 520, marginBottom: 40,
          }}>
            Break language barriers with AI. Real-time voice translation, audio & video processing
            powered by <span style={{ color: G, fontWeight: 600 }}>Whisper</span> and{' '}
            <span style={{ color: G, fontWeight: 600 }}>Google Translate</span>.
          </p>
        </Reveal>

        <Reveal delay={0.22}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 64 }}>
            <button className="btn btn-green" onClick={() => onStart('admin')}
              style={{ padding: '14px 32px', fontSize: '0.95rem' }}>
              Visit Dashboard
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.28}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Whisper ASR', 'Google Translate', 'gTTS', 'Flask + SocketIO', 'React + Vite', 'MoviePy'].map(t => (
              <span key={t} style={{
                padding: '4px 12px', borderRadius: 3,
                background: 'rgba(255,255,255,0.05)', color: '#555',
                fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.3px',
              }}>{t}</span>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Stats row */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', maxWidth: 1200, padding: '0 clamp(20px, 5vw, 64px)' }}>
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1} style={{
              padding: '32px 24px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: G, marginBottom: 4, letterSpacing: '-1px' }}>{s.value}</div>
              <div style={{ fontSize: '0.82rem', color: '#555', fontWeight: 500 }}>{s.label}</div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 64px)', maxWidth: 1200 }}>
        <Reveal delay={0}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ fontSize: '0.72rem', color: G, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>CAPABILITIES</div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>
              Everything you need
            </h2>
          </div>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 1, background: 'rgba(255,255,255,0.04)' }}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08} type={i % 2 === 0 ? 'reveal' : 'reveal-scale'}>
              <div className="feature-card" style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 0, padding: '36px 32px', cursor: 'default' }}>
                <div className="accent-line" />
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 10 }}>{f.title}</div>
                <div style={{ fontSize: '0.84rem', color: '#777', lineHeight: 1.7 }}>{f.desc}</div>
                <div style={{ marginTop: 20, height: 1, background: `linear-gradient(90deg, ${G}, transparent)`, opacity: 0.25 }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 clamp(20px, 5vw, 64px) 100px', maxWidth: 1200 }}>
        <Reveal type="reveal-scale">
          <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: 16, padding: '56px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', borderLeft: `3px solid ${G}` }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: G, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12 }}>GET STARTED</div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 10 }}>
                Ready to translate?
              </h2>
              <p style={{ color: '#666', fontSize: '0.95rem' }}>Access the admin dashboard to manage users and view translations.</p>
            </div>
            <button className="btn btn-green" onClick={() => onStart('admin')}
              style={{ padding: '16px 40px', fontSize: '1rem', flexShrink: 0 }}>
              Visit Dashboard
            </button>
          </div>
        </Reveal>
      </div>

    </div>
  )
}
