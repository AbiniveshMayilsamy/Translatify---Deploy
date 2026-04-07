#!/usr/bin/env bash
set -e

echo "Installing ffmpeg..."
apt-get update -qq && apt-get install -y ffmpeg

echo "Upgrading pip..."
pip install --upgrade pip setuptools wheel

echo "Installing Python dependencies..."
pip install -r requirements.txt
