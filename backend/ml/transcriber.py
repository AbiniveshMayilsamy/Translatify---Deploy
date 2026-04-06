import os
import tempfile
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))

def transcribe_audio(filepath: str, language: str = None) -> dict:
    with open(filepath, "rb") as f:
        result = client.audio.transcriptions.create(
            file=(os.path.basename(filepath), f),
            model="whisper-large-v3",
            language=language,
            response_format="verbose_json",
        )
    segments = [
        {"start": s.start, "end": s.end, "text": s.text}
        for s in (result.segments or [])
    ]
    return {
        "text": result.text,
        "language": result.language or language or "en",
        "segments": segments,
    }

def transcribe_bytes(audio_bytes: bytes, language: str = None) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name
    try:
        return transcribe_audio(tmp_path, language)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
