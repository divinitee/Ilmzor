#!/usr/bin/env bash
# One topic, end to end, after its authored file exists:
#   bash grammar-run/run_topic.sh <domain.branch.topic>
# authored file -> content JSON -> lint -> ingest (bank + manifest) -> server keys
# -> every test suite -> review sample. Stops at the first failure.
set -euo pipefail
cd /app
K="$1"
A="tools/grammar-practice/authored/$K.mjs"
J="content/grammar-practice/$K.json"
[ -f "$A" ] || { echo "missing $A"; exit 1; }

echo "== 1 author";  node "$A"
echo "== 2 lint";    node tools/grammar-practice/lint-topic.mjs "$J"
echo "== 3 ingest";  node tools/grammar-practice/ingest.mjs "$J"
echo "== 4 keys";    node tools/grammar-practice/build-keys.mjs
echo "== 5 tests"
for t in grading composition schema e2e feedback; do
  printf "  %-12s" "$t"; node tools/grammar-practice/$t-tests.mjs | tail -1
done
printf "  %-12s" registry; node tools/skill-intelligence/registry-tests.mjs | tail -1
node tools/grammar-practice/build-keys.mjs --check
echo "== 6 sample";  node grammar-run/sample.mjs "$K"
node grammar-run/make_worklist.mjs >/dev/null
echo "DONE $K"
