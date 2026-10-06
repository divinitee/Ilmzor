"""Gate every output batch in one process (fast). Prints one line per failing file + totals."""
import sys, os, glob, json, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("gate", os.path.join(HERE, "gate.py"))
g = importlib.util.module_from_spec(spec); _a = sys.argv; sys.argv = ["gate"]; spec.loader.exec_module(g); sys.argv = _a
files = sorted(glob.glob(os.path.join(HERE, "outputs", "batch_[0-9][0-9][0-9].json")))
tot = fail = 0; failing = []
for f in files:
    _, res = g.run([f])
    json.dump({"gate_version": g.GATE_VERSION, "results": res}, open(f + ".gate.json", "w"), ensure_ascii=False, indent=1)
    tot += len(res); nf = [r for r in res if r["fails"]]; fail += len(nf)
    if nf:
        failing.append(os.path.basename(f))
        for r in nf:
            for x in r["fails"]:
                print(f"{os.path.basename(f)} FAIL {r['headword']} [{x['cat']}] {x['msg']}")
print(f"{len(files)} files · {tot} maps · {tot - fail} pass · {fail} fail · failing files: {failing}")
