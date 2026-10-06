"""FALLBACK if the inputs file can't be uploaded: rebuild the remaining batches from a corpus export.
1. Export every VocabularyWord row to /app/deepmode-run/corpus.json as a JSON array of
   {"id", "english", "cefr", "english_definition", "example_en"} (use any data access you have).
2. python3 /app/deepmode-run/make_inputs_from_corpus.py
Skips every headword already in done_index.json, groups duplicate spellings, sorts by CEFR then headword,
writes inputs/batch_053.json onward (10 groups per batch)."""
import json, os, re, collections
from lemminflect import getAllLemmas
HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, "corpus.json")))
done = json.load(open(os.path.join(HERE, "done_index.json")))
done_hw = set(done["headwords"])
PART = set("up down on off out in over away back through about around round along into for with to after across by forward together apart ahead behind of at from upon onto".split())
def kind_hint(w):
    t = re.sub(r"\s*\(.*?\)", "", w).strip().split()
    if len(t) == 1: return "word"
    if getAllLemmas(t[0].lower()).get("VERB") and all(x.lower() in PART for x in t[1:]): return "phrasal"
    return "phrase"
G = collections.OrderedDict()
for r in C:
    G.setdefault(r["english"].strip().lower(), []).append(r)
groups = []
for k, rows in G.items():
    if k in done_hw:
        continue
    groups.append({"headword": rows[0]["english"].strip(), "kind_hint": kind_hint(rows[0]["english"]),
                   "rows": [{"word_id": r["id"], "cefr": r["cefr"], "corpus_definition": r["english_definition"], "example_en": r.get("example_en", "")} for r in rows]})
order = {"A1": 0, "A2": 1, "B1": 2, "B2": 3, "C1": 4}
groups.sort(key=lambda g: (min(order.get(r["cefr"], 9) for r in g["rows"]), g["headword"].lower()))
os.makedirs(os.path.join(HERE, "inputs"), exist_ok=True)
for i in range(0, len(groups), 10):
    json.dump(groups[i:i + 10], open(os.path.join(HERE, "inputs", f"batch_{53 + i // 10:03d}.json"), "w"), indent=1, ensure_ascii=False)
print(f"{len(groups)} groups -> {(len(groups) + 9) // 10} batches from 053 (expected: 1555 groups, 156 batches)")
