#!/usr/bin/env bash
# One-time (per sandbox) setup for the Deep Mode gate. Safe to re-run.
set -e
pip3 install -q wordfreq==3.1.1 lemminflect==0.2.3
if [ ! -d /tmp/deepmode-lex/node_modules/wordnet-db/dict ]; then
  mkdir -p /tmp/deepmode-lex && cd /tmp/deepmode-lex && npm install --no-save --silent wordnet-db@3.1.14
fi
cd /app/deepmode-run && python3 gate_batch.py examples.json >/dev/null 2>&1; rm -f examples.json.firstpass.json examples.json.gate.json
python3 -c "import sys; sys.path.insert(0, '/app/deepmode-run'); sys.argv = ['g']; import gate; print('gate ready:', gate.GATE_VERSION)"
