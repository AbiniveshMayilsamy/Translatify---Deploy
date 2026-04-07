import os
import subprocess
import shutil
import tempfile

if os.name == "nt":
    _win_ffmpeg = r"C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin"
    if os.path.exists(_win_ffmpeg):
        os.environ["PATH"] = _win_ffmpeg + os.pathsep + os.environ.get("PATH", "")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
MODEL_SIZE   = os.environ.get("WHISPER_MODEL", "base")

# ── Groq cloud transcription (free, no model download) ────────────────────────
def _transcribe_groq(audio_path: str, language: str = None) -> dict:
    import requests
    with open(audio_path, "rb") as f:
        data = {"model": "whisper-large-v3", "response_format": "verbose_json"}
        if language and language != "auto":
            data["language"] = language
        r = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": f},
            data=data,
            timeout=60,
        )
    r.raise_for_status()
    result = r.json()
    return {
        "text": result.get("text", "").strip(),
        "language": result.get("language", language or "en"),
        "segments": [
            {"start": round(s["start"], 2), "end": round(s["end"], 2), "text": s["text"].strip()}
            for s in result.get("segments", [])
        ]
    }

# ── Local faster-whisper fallback (for local dev) ─────────────────────────────
_local_model = None

def _get_local_model():
    global _local_model
    if _local_model is None:
        from faster_whisper import WhisperModel
        print(f"[Whisper] Loading {MODEL_SIZE} model locally...")
        _local_model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
        print("[Whisper] Loaded")
    return _local_model

def _transcribe_local(audio_path: str, language: str = None) -> dict:
    model = _get_local_model()
    segments, info = model.transcribe(
        audio_path,
        language=language if language and language != "auto" else None,
        beam_size=5,
    )
    segs = list(segments)
    return {
        "text": " ".join(s.text.strip() for s in segs).strip(),
        "language": info.language,
        "segments": [
            {"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
            for s in segs
        ]
    }

# ── Public API ────────────────────────────────────────────────────────────────
def transcribe_audio(audio_path: str, language: str = None) -> dict:
    if GROQ_API_KEY:
        print("[Transcriber] Using Groq API")
        return _transcribe_groq(audio_path, language)
    print("[Transcriber] Using local faster-whisper")
    return _transcribe_local(audio_path, language)

def transcribe_bytes(audio_bytes: bytes, language: str = None) -> dict:
    raw = audio_bytes if isinstance(audio_bytes, bytes) else bytes(audio_bytes)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(raw)
        webm_path = f.name
    wav_path = webm_path.replace(".webm", ".wav")
    try:
        ffmpeg = shutil.which("ffmpeg") or "ffmpeg"
        r = subprocess.run(
            [ffmpeg, "-y", "-i", webm_path, "-ar", "16000", "-ac", "1", wav_path],
            capture_output=True
        )
        if r.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {r.stderr.decode(errors='ignore')[-200:]}")
        return transcribe_audio(wav_path, language)
    finally:
        for p in (webm_path, wav_path):
            if os.path.exists(p):
                os.unlink(p)
