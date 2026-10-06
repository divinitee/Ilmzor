"""REFERENCE for section 7 of HANDOFF.md: how a map becomes WordFamily + WordRelation rows.

Input: all-maps.json (every map, one array) and gate-all.json (gate results in the same order).
Writes wordfamily_rows.json and wordrelation_rows.json, all approved:false. Failing maps are skipped.
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
maps = json.load(open(os.path.join(HERE, "all-maps.json")))
gate = json.load(open(os.path.join(HERE, "gate-all.json")))
assert len(gate["results"]) == len(maps)
norm = lambda s: re.sub(r"\s+", " ", s.strip().lower())
fam, rel = [], []
for m, r in zip(maps, gate["results"]):
    if r["fails"]:
        continue  # never load a failing map
    row = {k: m.get(k) for k in ("headword", "word_id", "word_ids", "kind", "sense_label", "sense_pos", "cefr", "forms", "people", "people_not_family", "affixes", "relations", "context", "particle_note", "usage_note", "reviewer_note", "gate_overrides") if m.get(k) not in (None, "", [])}
    row.update(gate_fails=0, gate_flags=r["flags"], generator_version="generator-6", gate_version=gate["gate_version"], affix_table_version="affix-2", lexicon_version="WordNet 3.1 (wordnet-db)", approved=False)
    fam.append(row)
    def add(frm, x, from_id):
        rel.append({k: v for k, v in {"from_lemma": norm(frm), "from_word_id": from_id, "to_lemma": norm(x["to"]), "relation": x["relation"],
                    "strength": x.get("strength"), "note": x.get("note"), "source": f"deepmode:{m['headword']}", "approved": False}.items() if v is not None})
    if m.get("kind") == "word":
        for f in m.get("forms", []):
            if f.get("status") != "existing":
                continue
            fid = m["word_id"] if norm(f["form"]) == norm(m["headword"]) else None
            for x in f.get("syn", []) + f.get("ant", []):
                add(f["form"], x, fid)
    else:
        for x in m.get("relations", []):
            add(m["headword"], x, m["word_id"])
json.dump(fam, open(os.path.join(HERE, "wordfamily_rows.json"), "w"), ensure_ascii=False)
json.dump(rel, open(os.path.join(HERE, "wordrelation_rows.json"), "w"), ensure_ascii=False)
print(f"{len(fam)} WordFamily rows, {len(rel)} WordRelation rows (skipped {len(maps) - len(fam)} failing maps)")
