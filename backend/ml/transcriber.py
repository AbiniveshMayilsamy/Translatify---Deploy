import os
import whisper
import torch

FFMPEG_PATH = r"C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin"
os.environ["PATH"] = FFMPEG_PATH + os.pathsep + os.environ.get("PATH", "")

_model = None
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "base")

def get_model():
    global _model
    if _model is None:
        print(f"[Whisper] Loading {MODEL_SIZE} model...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _model = whisper.load_model(MODEL_SIZE, device=device)
        print(f"[Whisper] Loaded on {device}")
    return _model

def transcribe_audio(audio_path: str, language: str = None) -> dict:
    model = get_model()
    result = model.transcribe(
        audio_path,
        language=language if language and language != "auto" else None,
        task="transcribe",
        fp16=False,
    )
    return {
        "text": result["text"].strip(),
        "language": result.get("language", "en"),
        "segments": [
            {"start": round(s["start"], 2), "end": round(s["end"], 2), "text": s["text"].strip()}
            for s in result.get("segments", [])
        ]
    }

def transcribe_bytes(audio_bytes: bytes, language: str = None) -> dict:
    import tempfile, subprocess, shutil
    raw = audio_bytes if isinstance(audio_bytes, bytes) else bytes(audio_bytes)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(raw)
        webm_path = f.name
    wav_path = webm_path.replace(".webm", ".wav")
    try:
        ffmpeg = os.environ.get("FFMPEG_BIN", shutil.which("ffmpeg") or "ffmpeg")
        print(f"[Transcriber] Converting {webm_path} → {wav_path} using {ffmpeg}")
        r = subprocess.run(
            [ffmpeg, "-y", "-i", webm_path, "-ar", "16000", "-ac", "1", wav_path],
            capture_output=True
        )
        if r.returncode != 0:
            print(f"[Transcriber] ffmpeg stderr: {r.stderr.decode(errors='ignore')}")
            raise RuntimeError(f"ffmpeg conversion failed: {r.stderr.decode(errors='ignore')[-200:]}")
        if not os.path.exists(wav_path) or os.path.getsize(wav_path) == 0:
            raise RuntimeError("ffmpeg produced empty wav file")
        print(f"[Transcriber] WAV ready ({os.path.getsize(wav_path)} bytes), transcribing...")
        return transcribe_audio(wav_path, language)
    finally:
        for p in (webm_path, wav_path):
            if os.path.exists(p):
                os.unlink(p)
