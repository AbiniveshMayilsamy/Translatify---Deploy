#!/usr/bin/env bash
set -e

echo "Installing ffmpeg..."
apt-get update -qq && apt-get install -y ffmpeg

echo "Upgrading pip..."
pip install --upgrade pip setuptools wheel

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Pre-downloading faster-whisper base model..."
export HF_HOME=/opt/render/project/src/.cache/huggingface
export XDG_CACHE_HOME=/opt/render/project/src/.cache
python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8'); print('Model downloaded OK')"
