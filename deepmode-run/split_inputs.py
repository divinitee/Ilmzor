"""Split Tee's uploaded deepmode-inputs-053-208.json into inputs/batch_NNN.json.
Usage: python3 /app/deepmode-run/split_inputs.py /path/to/deepmode-inputs-053-208.json"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(sys.argv[1]))
os.makedirs(os.path.join(HERE, "inputs"), exist_ok=True)
for k, groups in sorted(data.items()):
    json.dump(groups, open(os.path.join(HERE, "inputs", f"batch_{k}.json"), "w"), indent=1, ensure_ascii=False)
print(f"wrote {len(data)} batches, {sum(len(v) for v in data.values())} headword groups")
