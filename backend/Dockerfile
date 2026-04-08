FROM python:3.11-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download faster-whisper model
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8'); print('Model ready')"

# Copy app
COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "1", "-k", "eventlet", "--bind", "0.0.0.0:5000", "--timeout", "120", "app:app"]
