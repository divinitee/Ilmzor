#!/usr/bin/env bash
# gate-4.3+: nothing to install. Everything the gate needs is vendored in ./vendor
# (wordfreq_lite + English data, lemminflect 0.2.3 with a numpy stub, WordNet 3.1 data as .gz).
# This script only checks that the gate loads and the examples pass.
set -e
cd /app/deepmode-run && python3 gate_batch.py examples.json; rm -f examples.json.firstpass.json examples.json.gate.json
python3 -c "import sys; sys.path.insert(0, '/app/deepmode-run'); sys.argv = ['g']; import gate; print('gate ready:', gate.GATE_VERSION)"
