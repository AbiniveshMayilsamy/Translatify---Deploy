import os
import sys
import uuid
import threading
import bcrypt
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity, get_jwt
)

# Increase recursion limit for startup
sys.setrecursionlimit(5000)

# ffmpeg is expected to be in PATH on the server (installed via apt/yum on AWS)
if os.name == "nt":
    _win_ffmpeg = r"C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin"
    if os.path.exists(_win_ffmpeg):
        os.environ["PATH"] = _win_ffmpeg + os.pathsep + os.environ.get("PATH", "")

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR  = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR  = os.path.join(BASE_DIR, "outputs")
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

sys.path.insert(0, BASE_DIR)

# Lazy load ML modules to avoid startup recursion
_transcriber = None
_translator = None
_tts = None
_video = None

def get_transcriber():
    global _transcriber
    if _transcriber is None:
        try:
            from ml.transcriber import transcribe_audio, transcribe_bytes
            _transcriber = (transcribe_audio, transcribe_bytes)
            print("[ML] Transcriber loaded successfully")
        except RecursionError as e:
            print(f"[ERROR] Recursion during transcriber import: {e}")
            raise
        except Exception as e:
            print(f"[ERROR] Failed to load transcriber: {e}")
            raise
    return _transcriber

def get_translator():
    global _translator
    if _translator is None:
        try:
            from ml.translator import translate, SUPPORTED_LANGUAGES
            _translator = (translate, SUPPORTED_LANGUAGES)
            print("[ML] Translator loaded successfully")
        except RecursionError as e:
            print(f"[ERROR] Recursion during translator import: {e}")
            raise
        except Exception as e:
            print(f"[ERROR] Failed to load translator: {e}")
            raise
    return _translator

def get_tts():
    global _tts
    if _tts is None:
        try:
            from ml.tts import synthesize
            _tts = synthesize
            print("[ML] TTS loaded successfully")
        except RecursionError as e:
            print(f"[ERROR] Recursion during TTS import: {e}")
            raise
        except Exception as e:
            print(f"[ERROR] Failed to load TTS: {e}")
            raise
    return _tts

def get_video():
    global _video
    if _video is None:
        try:
            from ml.video import extract_audio, get_video_duration
            _video = (extract_audio, get_video_duration)
            print("[ML] Video module loaded successfully")
        except RecursionError as e:
            print(f"[ERROR] Recursion during video import: {e}")
            raise
        except Exception as e:
            print(f"[ERROR] Failed to load video module: {e}")
            raise
    return _video

# Cache for SUPPORTED_LANGUAGES
_SUPPORTED_LANGUAGES = None
def get_supported_languages():
    global _SUPPORTED_LANGUAGES
    if _SUPPORTED_LANGUAGES is None:
        _, _SUPPORTED_LANGUAGES = get_translator()
    return _SUPPORTED_LANGUAGES

# ── Dummy accounts (always work, even without MongoDB) ────────────────────────
_DUMMY_USERS = {
    "admin@translatify.com": {
        "_id": "dummy-admin-001",
        "name": "Admin",
        "email": "admin@translatify.com",
        "password": bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode(),
        "role": "admin",
    },
    "user@translatify.com": {
        "_id": "dummy-user-001",
        "name": "Demo User",
        "email": "user@translatify.com",
        "password": bcrypt.hashpw(b"user123", bcrypt.gensalt()).decode(),
        "role": "user",
    },
}

# ── Try MongoDB, fall back gracefully ─────────────────────────────────────────
_DB_AVAILABLE = False
try:
    from db import (
        create_user, find_user_by_email,
        get_all_users, update_user_role, delete_user,
        save_history, get_history, get_all_history,
        delete_history_entry, get_stats, get_db
    )
    get_db()
    _DB_AVAILABLE = True
    print("[DB] MongoDB connected")
except Exception as _db_err:
    print(f"[DB] MongoDB unavailable ({_db_err}), using dummy accounts only")

# ── Safe DB helpers ───────────────────────────────────────────────────────────
def _find_user(email):
    if _DB_AVAILABLE:
        try:
            u = find_user_by_email(email)
            if u:
                return u
        except Exception:
            pass
    return _DUMMY_USERS.get(email)

def _save_hist(uid, email, entry):
    if _DB_AVAILABLE:
        try:
            save_history(uid, email, entry)
        except Exception:
            pass

def _get_hist(uid):
    if _DB_AVAILABLE:
        try:
            return get_history(uid)
        except Exception:
            pass
    return []

def _get_all_hist(limit=100):
    if _DB_AVAILABLE:
        try:
            return get_all_history(limit)
        except Exception:
            pass
    return []

def _get_all_users_safe():
    if _DB_AVAILABLE:
        try:
            return get_all_users()
        except Exception:
            pass
    return [{k: v for k, v in u.items() if k != "password"} for u in _DUMMY_USERS.values()]

def _get_stats_safe():
    if _DB_AVAILABLE:
        try:
            return get_stats()
        except Exception:
            pass
    return {"total_users": 2, "total_translations": 0, "admin_count": 1, "user_count": 1}

# ── Flask app ─────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
app.config["SECRET_KEY"]              = "translatify-secret-2024"
app.config["JWT_SECRET_KEY"]          = "translatify-jwt-secret-2024"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False
app.config["MAX_CONTENT_LENGTH"]      = 500 * 1024 * 1024
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 300
app.config["JSON_SORT_KEYS"] = False

# CORS - Use manual headers to avoid conflicts
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
        return response

@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
    response.headers.add("Access-Control-Expose-Headers", "Content-Type,Authorization")
    return response

jwt_manager = JWTManager(app)

try:
    socketio = SocketIO(app, 
                        cors_allowed_origins="*",
                        async_mode="threading",
                        max_http_buffer_size=100 * 1024 * 1024,
                        ping_timeout=60, ping_interval=25,
                        engineio_logger=False,
                        logger=False)
except Exception as e:
    print(f"[WARNING] SocketIO init warning: {e}")
    socketio = SocketIO(app, cors_allowed_origins="*")

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Maximum size is 500MB."}), 413

@app.errorhandler(Exception)
def handle_exception(e):
    from werkzeug.exceptions import HTTPException
    
    # Avoid recursion in error handling
    if isinstance(e, RecursionError):
        print(f"[ERROR] RecursionError detected")
        return jsonify({"error": "Recursion limit exceeded"}), 500
    
    if isinstance(e, HTTPException):
        return jsonify({"error": e.description}), e.code
    
    print(f"[ERROR] Unhandled: {type(e).__name__}")
    return jsonify({"error": "Internal server error"}), 500

ALLOWED_AUDIO = {"wav", "mp3", "webm", "ogg", "m4a", "flac"}
ALLOWED_VIDEO = {"mp4", "avi", "mov", "mkv", "webm"}

def allowed_file(filename, allowed):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if get_jwt().get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper


# ── Serve Frontend ────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/outputs/<path:filename>")
def outputs(filename):
    return send_from_directory(OUTPUT_DIR, filename)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    """Check if backend is alive and ML models can load"""
    try:
        # Test lazy loading without blocking too long
        status = {
            "status": "ok",
            "timestamp": str(__import__('datetime').datetime.now()),
            "models": {}
        }
        
        # Try to load each model and report status
        try:
            get_transcriber()
            status["models"]["transcriber"] = "loaded"
        except Exception as e:
            status["models"]["transcriber"] = f"error: {str(e)[:50]}"
        
        try:
            get_translator()
            status["models"]["translator"] = "loaded"
        except Exception as e:
            status["models"]["translator"] = f"error: {str(e)[:50]}"
        
        try:
            get_tts()
            status["models"]["tts"] = "loaded"
        except Exception as e:
            status["models"]["tts"] = f"error: {str(e)[:50]}"
        
        return jsonify(status), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Auth ──────────────────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    try:
        data     = request.get_json(force=True) or {}
        name     = (data.get("name") or "").strip()
        email    = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not name or not email or not password:
            return jsonify({"error": "Name, email and password are required"}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        if _find_user(email):
            return jsonify({"error": "Email already registered"}), 409
        if not _DB_AVAILABLE:
            return jsonify({"error": "Database unavailable. Use demo accounts to login."}), 503

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        user   = create_user(name, email, hashed, "user")
        token  = create_access_token(
            identity=str(user["_id"]),
            additional_claims={"role": "user", "email": email, "name": name}
        )
        return jsonify({
            "token": token,
            "user": {"id": str(user["_id"]), "name": name, "email": email, "role": "user"}
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data     = request.get_json(force=True) or {}
        email    = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = _find_user(email)
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        stored_pw = user["password"]
        if isinstance(stored_pw, str):
            stored_pw = stored_pw.encode()
        if not bcrypt.checkpw(password.encode(), stored_pw):
            return jsonify({"error": "Invalid email or password"}), 401

        role  = user.get("role", "user")
        uid   = str(user.get("_id", email))
        token = create_access_token(
            identity=uid,
            additional_claims={"role": role, "email": email, "name": user.get("name", "")}
        )
        return jsonify({
            "token": token,
            "user": {"id": uid, "name": user.get("name", ""), "email": email, "role": role}
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    claims = get_jwt()
    return jsonify({
        "id":    get_jwt_identity(),
        "name":  claims.get("name"),
        "email": claims.get("email"),
        "role":  claims.get("role"),
    })


# ── Admin ─────────────────────────────────────────────────────────────────────
@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats():
    return jsonify(_get_stats_safe())

@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_users():
    return jsonify(_get_all_users_safe())

@app.route("/api/admin/users/<email>/role", methods=["PUT"])
@admin_required
def admin_update_role(email):
    if not _DB_AVAILABLE:
        return jsonify({"error": "Database unavailable"}), 503
    data = request.get_json(force=True) or {}
    role = data.get("role")
    if role not in ("admin", "user"):
        return jsonify({"error": "Role must be admin or user"}), 400
    update_user_role(email, role)
    return jsonify({"success": True})

@app.route("/api/admin/users/<email>", methods=["DELETE"])
@admin_required
def admin_delete_user(email):
    if not _DB_AVAILABLE:
        return jsonify({"error": "Database unavailable"}), 503
    delete_user(email)
    return jsonify({"success": True})

@app.route("/api/admin/history", methods=["GET"])
@admin_required
def admin_history():
    return jsonify(_get_all_hist(int(request.args.get("limit", 100))))

@app.route("/api/admin/create-admin", methods=["POST"])
@admin_required
def admin_create_admin():
    if not _DB_AVAILABLE:
        return jsonify({"error": "Database unavailable"}), 503
    data     = request.get_json(force=True) or {}
    name     = (data.get("name") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not name or not email or not password:
        return jsonify({"error": "All fields required"}), 400
    if _find_user(email):
        return jsonify({"error": "Email already registered"}), 409
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    create_user(name, email, hashed, "admin")
    return jsonify({"success": True}), 201


# ── User history ──────────────────────────────────────────────────────────────
@app.route("/api/history", methods=["GET"])
@jwt_required()
def user_history():
    return jsonify(_get_hist(get_jwt_identity()))


# ── Languages ─────────────────────────────────────────────────────────────────
@app.route("/api/languages", methods=["GET"])
def get_languages():
    return jsonify(get_supported_languages())


# ── Transcribe ────────────────────────────────────────────────────────────────
@app.route("/api/transcribe", methods=["POST"])
@jwt_required()
def api_transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file     = request.files["file"]
    src_lang = request.form.get("src_lang", "auto")
    if not allowed_file(file.filename, ALLOWED_AUDIO | ALLOWED_VIDEO):
        return jsonify({"error": "Unsupported file type"}), 400
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    file.save(filepath)
    try:
        transcribe_audio, _ = get_transcriber()
        return jsonify(transcribe_audio(filepath, src_lang if src_lang != "auto" else None))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.unlink(filepath)


# ── Translate text ────────────────────────────────────────────────────────────
@app.route("/api/translate", methods=["POST"])
@jwt_required()
def api_translate():
    data     = request.get_json(force=True) or {}
    text     = data.get("text", "")
    src_lang = data.get("src_lang", "en")
    tgt_lang = data.get("tgt_lang", "fr")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    translate, _ = get_translator()
    return jsonify({"translated": translate(text, src_lang, tgt_lang)})


# ── TTS ───────────────────────────────────────────────────────────────────────
@app.route("/api/tts", methods=["POST"])
@jwt_required()
def api_tts():
    data = request.get_json(force=True) or {}
    text = data.get("text", "")
    lang = data.get("lang", "en")
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        synthesize = get_tts()
        filename = synthesize(text, lang, OUTPUT_DIR)
        return jsonify({"audio_url": f"/outputs/{filename}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Translate audio ───────────────────────────────────────────────────────────
@app.route("/api/translate-audio", methods=["POST"])
@jwt_required()
def api_translate_audio():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file     = request.files["file"]
    src_lang = request.form.get("src_lang", "auto")
    tgt_lang = request.form.get("tgt_lang", "en")
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    file.save(filepath)
    try:
        print(f"[API] Loading ML modules for audio translation...")
        transcribe_audio, _ = get_transcriber()
        print(f"[API] Transcriber loaded")
        translate, _ = get_translator()
        print(f"[API] Translator loaded")
        synthesize = get_tts()
        print(f"[API] TTS loaded")
        
        print(f"[API] Transcribing audio: {filepath}")
        tr   = transcribe_audio(filepath, src_lang if src_lang != "auto" else None)
        orig = tr["text"]
        det  = tr["language"]
        print(f"[API] Transcribed: {orig[:80]}")
        
        print(f"[API] Translating from {det} to {tgt_lang}")
        tran = translate(orig, det, tgt_lang)
        print(f"[API] Translated: {tran[:80]}")
        
        print(f"[API] Generating TTS")
        tts  = synthesize(tran, tgt_lang, OUTPUT_DIR)
        print(f"[API] TTS generated: {tts}")
        
        _save_hist(get_jwt_identity(), get_jwt().get("email", ""), {
            "type": "audio", "original": orig, "translated": tran,
            "src_lang": det, "tgt_lang": tgt_lang,
        })
        return jsonify({
            "original": orig, "detected_language": det,
            "translated": tran,
            "audio_url": f"/outputs/{tts}" if tts else None
        })
    except FileNotFoundError as e:
        print(f"[ERROR] translate-audio FileNotFoundError: {e}")
        return jsonify({"error": "ffmpeg not found. Please install ffmpeg and add it to PATH. Download from https://www.gyan.dev/ffmpeg/builds/"}), 500
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.unlink(filepath)


# ── Translate video ───────────────────────────────────────────────────────────
@app.route("/api/translate-video", methods=["POST"])
@jwt_required()
def api_translate_video():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file     = request.files["file"]
    src_lang = request.form.get("src_lang", "auto")
    tgt_lang = request.form.get("tgt_lang", "en")
    if not allowed_file(file.filename, ALLOWED_VIDEO):
        return jsonify({"error": "Unsupported video format"}), 400
    filename   = f"{uuid.uuid4().hex}_{file.filename}"
    filepath   = os.path.join(UPLOAD_DIR, filename)
    audio_path = None
    file.save(filepath)
    try:
        extract_audio, _ = get_video()
        transcribe_audio, _ = get_transcriber()
        translate, _ = get_translator()
        synthesize = get_tts()
        audio_path = extract_audio(filepath, UPLOAD_DIR)
        tr         = transcribe_audio(audio_path, src_lang if src_lang != "auto" else None)
        orig       = tr["text"]
        det        = tr["language"]
        segments   = tr.get("segments", [])
        tran       = translate(orig, det, tgt_lang)
        tts        = synthesize(tran, tgt_lang, OUTPUT_DIR)
        segs_out   = [
            {"start": round(s["start"], 2), "end": round(s["end"], 2),
             "original": s["text"].strip(), "translated": translate(s["text"].strip(), det, tgt_lang)}
            for s in segments
        ]
        _save_hist(get_jwt_identity(), get_jwt().get("email", ""), {
            "type": "video", "original": orig, "translated": tran,
            "src_lang": det, "tgt_lang": tgt_lang, "segments_count": len(segs_out),
        })
        return jsonify({
            "original": orig, "detected_language": det,
            "translated": tran, "segments": segs_out,
            "audio_url": f"/outputs/{tts}" if tts else None
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.unlink(filepath)
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)


# ── WebSocket ─────────────────────────────────────────────────────────────────
@socketio.on("connect")
def on_connect():
    emit("connected", {"status": "ready"})

@socketio.on("disconnect")
def on_disconnect():
    pass

@socketio.on("stream_audio")
def on_stream_audio(data):
    audio_bytes = data.get("audio")
    src_lang    = data.get("src_lang", "auto")
    tgt_lang    = data.get("tgt_lang", "en")
    token       = data.get("token", "")
    sid         = request.sid
    if not audio_bytes:
        emit("error", {"message": "No audio data received"})
        return

    # Decode JWT to get user identity for history saving
    user_id, user_email = None, None
    try:
        from flask_jwt_extended import decode_token
        decoded = decode_token(token)
        user_id    = decoded.get("sub")
        user_email = decoded.get("email") or decoded.get("additional_claims", {}).get("email", "")
        # flask-jwt-extended stores additional claims at top level
        if not user_email:
            user_email = decoded.get("email", "")
    except Exception:
        pass

    # handle binary (bytes), list of ints, or bytearray from socket.io
    if isinstance(audio_bytes, bytes):
        raw = audio_bytes
    elif isinstance(audio_bytes, bytearray):
        raw = bytes(audio_bytes)
    elif isinstance(audio_bytes, list):
        raw = bytes(bytearray(audio_bytes))
    else:
        emit("error", {"message": "Unrecognised audio format"})
        return
    print(f"[Socket] stream_audio received {len(raw)} bytes from {sid}")

    def process():
        def send(event, payload):
            socketio.emit(event, payload, to=sid)
        try:
            _, transcribe_bytes_fn = get_transcriber()
            translate_fn, _ = get_translator()
            synthesize_fn = get_tts()
            send("status", {"message": "Transcribing..."})
            tr         = transcribe_bytes_fn(raw, src_lang if src_lang != "auto" else None)
            original   = tr["text"]
            detected   = tr["language"]
            print(f"[Socket] transcribed: {original[:80]}")
            send("transcription", {"text": original, "language": detected})
            send("status", {"message": "Translating..."})
            translated = translate_fn(original, detected, tgt_lang)
            send("translation", {"text": translated, "src": detected, "tgt": tgt_lang})
            send("status", {"message": "Generating speech..."})
            tts_file   = synthesize_fn(translated, tgt_lang, OUTPUT_DIR)
            send("tts_ready", {"audio_url": f"/outputs/{tts_file}"})
            send("status", {"message": "Done"})
            if user_id:
                _save_hist(user_id, user_email, {
                    "type": "voice", "original": original, "translated": translated,
                    "src_lang": detected, "tgt_lang": tgt_lang,
                })
        except Exception as e:
            import traceback; traceback.print_exc()
            send("error", {"message": str(e)})

    threading.Thread(target=process, daemon=True).start()


if __name__ == "__main__":
    print("=" * 50)
    print("  Translatify — AI Translation System")
    print("  http://localhost:5000")
    print("  Admin : admin@translatify.com / admin123")
    print("  User  : user@translatify.com  / user123")
    print("=" * 50)
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, allow_unsafe_werkzeug=True)
