"""Run the Deep Mode gate on one batch file and print what must be fixed.

Usage: python3 /app/deepmode-run/gate_batch.py <batch.json>
- Prints every FAIL (must fix) and a count of FLAGs (reviewer only; don't chase them).
- The first run on a file is logged to <batch>.firstpass.json so we can measure the generator.
- Exit code 0 = all maps pass.
"""
import sys, os, json, subprocess, collections
here = os.path.dirname(os.path.abspath(__file__))
sys.argv = [sys.argv[0]] + sys.argv[1:]
path = os.path.abspath(sys.argv[1])
import importlib.util
spec = importlib.util.spec_from_file_location("gate", os.path.join(here, "gate.py"))
g = importlib.util.module_from_spec(spec)
_argv = sys.argv; sys.argv = ["gate"]; spec.loader.exec_module(g); sys.argv = _argv
maps, results = g.run([path])
log = path + ".firstpass.json"
if not os.path.exists(log):
    json.dump({"gate_version": g.GATE_VERSION, "results": results}, open(log, "w"), ensure_ascii=False, indent=1)
json.dump({"gate_version": g.GATE_VERSION, "results": results}, open(path + ".gate.json", "w"), ensure_ascii=False, indent=1)
nf = [r for r in results if r["fails"]]
print(f"{len(results)} maps · {len(results) - len(nf)} pass · {len(nf)} fail · {sum(len(r['flags']) for r in results)} flags (flags are for the reviewer; don't chase them)")
for r in nf:
    for f in r["fails"]:
        print(f"FAIL {r['headword']} [{f['cat']}] {f['msg']}")
sys.exit(1 if nf else 0)
