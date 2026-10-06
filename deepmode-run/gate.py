"""Deep Mode family-map gate (VT-38), v1.

Deterministic checks on generated word-family maps before any human review.
Lexicon: WordNet 3.1 (npm wordnet-db), lemminflect (inflections), wordfreq (frequency).
FAIL = cannot be approved until fixed. FLAG = shown to the reviewer.
"""
import json, re, sys, glob, collections, gzip, os
# gate-4.3: everything the gate needs is vendored in ./vendor (no pip/npm): wordfreq_lite (wordfreq 3.1.1 English
# data), lemminflect 0.2.3 (+ a numpy stub; only dictionary lookups are used) and WordNet 3.1 data files (.gz).
_VENDOR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor")
sys.path.insert(0, _VENDOR)
from wordfreq_lite import zipf_frequency
from lemminflect import getAllInflections, getAllLemmas

GATE_VERSION = "gate-4.4"
WN_DIR = next(p for p in (os.environ.get("DEEPMODE_WN_DIR", ""), os.path.join(_VENDOR, "wordnet"), "/tmp/deepmode-lex/node_modules/wordnet-db/dict") if p and os.path.isdir(p))

def _wn_open(name):
    p = os.path.join(WN_DIR, name)
    return gzip.open(p + ".gz", "rt", encoding="latin-1") if os.path.exists(p + ".gz") else open(p, encoding="latin-1")
POSMAP = {"noun": "noun", "verb": "verb", "adjective": "adj", "adverb": "adv"}
SS = {"n": "noun", "v": "verb", "a": "adj", "s": "adj", "r": "adv"}

# ---------- WordNet ----------
synsets, lemma_pos, lemma_syn = {}, collections.defaultdict(set), collections.defaultdict(list)
for f in ("noun", "verb", "adj", "adv"):
    for line in _wn_open(f"data.{f}"):
        if line.startswith("  "):
            continue
        p = line.split(" ")
        off, ss, wc = p[0], p[2], int(p[3], 16)
        words = [re.sub(r"\(.*\)$", "", p[4 + 2 * i]).lower() for i in range(wc)]
        i = 4 + 2 * wc
        pc = int(p[i])
        ptrs = []
        for j in range(pc):
            sym, toff, tpos, st = p[i + 1 + 4 * j:i + 5 + 4 * j]
            ptrs.append((sym, toff, tpos, int(st[:2], 16), int(st[2:], 16)))
        synsets[(f, off)] = (words, ptrs)
        for w in words:
            lemma_pos[w].add(SS[ss])
            lemma_syn[w].append((f, off))

SUPPLEMENT = {k: set(v) for k, v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "lexicon_supplement.json"))).items() if not k.startswith("_")}

def wn_has(word, pos=None):
    w = word.lower().replace(" ", "_")
    sup = SUPPLEMENT.get(word.lower())
    if sup and (pos is None or pos in sup):
        return True
    return (pos in lemma_pos.get(w, set())) if pos else w in lemma_pos

def wn_links(word, kinds=("+", "\\", "<")):
    """Lexical links (derivation +, pertainym \\, participle <) from a word."""
    w = word.lower().replace(" ", "_")
    out = set()
    for key in lemma_syn.get(w, []):
        words, ptrs = synsets[key]
        idx = words.index(w) + 1
        for sym, toff, tpos, s, t in ptrs:
            if sym in kinds and s == idx and t:
                tw = synsets.get(({"n": "noun", "v": "verb", "a": "adj", "s": "adj", "r": "adv"}[tpos], toff))
                if tw:
                    out.add(tw[0][t - 1])
    return out

def wn_antonyms(word):
    w = word.lower()
    out = set()
    for key in lemma_syn.get(w, []):
        words, ptrs = synsets[key]
        idx = words.index(w) + 1
        for sym, toff, tpos, s, t in ptrs:
            if sym == "!" and (s == idx or s == 0):
                tw = synsets.get(({"n": "noun", "v": "verb", "a": "adj", "s": "adj", "r": "adv"}[tpos], toff))
                if tw:
                    out.add(tw[0][t - 1] if t else tw[0][0])
    return out

def closure(seeds, depth=2):
    seen = set(s.lower() for s in seeds)
    frontier = set(seen)
    for _ in range(depth):
        nxt = set()
        for w in frontier:
            nxt |= wn_links(w)
        nxt -= seen
        seen |= nxt
        frontier = nxt
    return seen

def inflections(word):
    out = {word.lower()}
    for upos in ("VERB", "NOUN", "ADJ", "ADV"):
        for forms in getAllInflections(word, upos=upos).values():
            out |= {f.lower() for f in forms}
    return out

# ---------- affix table (fixed; the model cannot invent an affix or its meaning) ----------
AFFIX_TABLE_VERSION = "affix-2"
AFFIXES = {
    # prefixes: test = how a real split is proven
    "un-": ("prefix", "not, the opposite of", "antonym"), "in-": ("prefix", "not", "antonym"),
    "im-": ("prefix", "not", "antonym"), "dis-": ("prefix", "not, the opposite of", "antonym"),
    "re-": ("prefix", "again", "verb_stem"), "en-": ("prefix", "make, put into", "word_stem"),
    "mis-": ("prefix", "wrongly", "verb_stem"), "pre-": ("prefix", "before", "word_stem"),
    "uni-": ("prefix", "one", "classical"), "bi-": ("prefix", "two", "classical"),
    "tri-": ("prefix", "three", "classical"), "multi-": ("prefix", "many", "classical"),
    # suffixes
    "-ion": ("suffix", "makes a noun from a verb", None), "-ation": ("suffix", "makes a noun from a verb", None),
    "-sion": ("suffix", "makes a noun from a verb", None), "-ment": ("suffix", "makes a noun from a verb", None),
    "-ness": ("suffix", "makes a noun from an adjective", None), "-ity": ("suffix", "makes a noun from an adjective", None),
    "-ty": ("suffix", "makes a noun from an adjective", None), "-ence": ("suffix", "makes a noun", None),
    "-ance": ("suffix", "makes a noun", None), "-hood": ("suffix", "a time or state of being", None),
    "-er": ("suffix", "a person or thing that does something", None),
    "-ive": ("suffix", "makes an adjective: doing or tending to do", None),
    "-able": ("suffix", "can be done", None), "-ful": ("suffix", "full of", None), "-less": ("suffix", "without", None),
    "-al": ("suffix", "makes an adjective: connected with", None), "-ic": ("suffix", "makes an adjective: connected with", None),
    "-ous": ("suffix", "makes an adjective: having", None), "-ish": ("suffix", "like, rather", None),
    "-y": ("suffix", "makes an adjective: having, like", None),
    "-ing": ("suffix", "makes an adjective or noun from a verb", None),
    "-ly": ("suffix", "makes an adverb", None), "-ize": ("suffix", "makes a verb: make or become", None),
    "-fy": ("suffix", "makes a verb: make or become", None),
    # affix-2 (People & things branch)
    "-or": ("suffix", "a person or thing that does something", None),
    "-ist": ("suffix", "a person who does, makes or studies something", None),
    "-ant": ("suffix", "a person or thing that does something", None),
    "-ent": ("suffix", "a person or thing that does something", None),
    "-ee": ("suffix", "a person something is done to", None),
    "-ian": ("suffix", "a person connected with something", None),
    "-ics": ("suffix", "a subject or area of work", None),
    "-ship": ("suffix", "a state, position or skill", None),
}
PEOPLE_SFX = ("er", "or", "ist", "ant", "ent", "ee", "ian", "ics", "ess")
PEOPLE_KINDS = {"person", "job", "field", "thing"}

def spellings(w):
    """British/American spelling variants of one word (adviser/advisor, organise/organize, behaviour/behavior)."""
    w = w.lower(); out = {w}
    pairs = [("ise", "ize"), ("isation", "ization"), ("iser", "izer"), ("yse", "yze"), ("our", "or"), ("tre", "ter"), ("ogue", "og"), ("ser", "sor"), ("ence", "ense"), ("lled", "led"), ("lling", "ling"), ("ller", "ler")]
    for a, b in pairs:
        for x in list(out):
            if a in x: out.add(x.replace(a, b))
            if b in x: out.add(x.replace(b, a))
    return out

def stems(word, suffix):
    s = suffix.strip("-")
    w = word.lower()
    if not w.endswith(s):
        return set()
    base = w[: -len(s)]
    cands = {base, base + "e", base + "y"}
    if base.endswith("i"):
        cands.add(base[:-1] + "y")
    if len(base) > 2 and base[-1] == base[-2]:
        cands.add(base[:-1])
    if s in ("ion", "sion", "ation"):
        cands |= {base + "e", base + "t", base + "te", base[:-1] + "de", base[:-1] + "d", base + "ate"}
    if s == "ly" and (base.endswith("ab") or base.endswith("ib")):
        cands.add(base + "le")                # admirably -> admirable, sensibly -> sensible
    if s == "ation" and base.endswith("ic"):
        cands.add(base[:-2] + "y")            # application -> apply
    if s in ("or", "ee", "ant", "ent") :
        cands |= {base + "e", base + "ate"}         # creator -> create, trainee -> train
    if s in ("ist", "ian", "ics"):
        cands |= {base + "y", base + "ic", base + "e"}  # economist -> economy, librarian -> library
    if s == "fy" and base.endswith("i"):
        cands.add(base[:-1])                  # personify -> person
    if s == "ity" and base.endswith("bil"):
        cands.add(base[:-3] + "ble")          # ability -> able
    if s == "ive" and base.endswith("at"):
        cands |= {base[:-2], base[:-3] + "e"}  # informative -> inform
    return {c for c in cands if c}

STOP = set("a an the of to and or in on at for with is are be by from that this it as your you their them they his her its not no if so than then about into out up off can will would should may might do does did have has had who which what when where how very more most less some any all each every one two three such but also only just too".split())

def toks(text):
    return re.findall(r"[a-zA-Z][a-zA-Z'-]*", text)

# ---------- checks ----------
UPOS = {"noun": "NOUN", "verb": "VERB", "adjective": "ADJ", "adverb": "ADV"}
DET = {"a", "an", "the", "be", "someone", "something"}
EASY_ZIPF = 4.0  # roughly A1–B1 frequency

def word_pos(w, slot):
    w = w.lower()
    if wn_has(w, POSMAP[slot]) or UPOS[slot] in getAllLemmas(w):
        return True
    if slot == "adjective" and getAllLemmas(w).get("VERB") and (w.endswith("ed") or w.endswith("ing")):
        return True  # participial adjective
    return False

def pos_fits(target, slot):
    """True / False for single words; phrases: True if WordNet lists them with the POS, else head-word heuristic, else None."""
    t = target.lower().strip()
    if t.startswith("non-"):
        t = t[4:]
    if " " not in t:
        return word_pos(t, slot)
    if wn_has(t, POSMAP[slot]):
        return True
    toks_ = [x for x in t.split() if x not in DET]
    if not toks_:
        return None
    if slot == "verb" and t.split()[0] in ("be", "make", "take", "go", "do", "bring", "let", "put", "look", "come", "would") :
        return True  # verb phrase
    if slot == "verb" and word_pos(toks_[0], "verb"):
        return True
    if slot == "noun" and word_pos(toks_[-1], "noun"):
        return True
    if slot == "adjective" and word_pos(toks_[-1], "adjective"):
        return True
    return None

def easy(target):
    return all(zipf_frequency(x, "en") >= EASY_ZIPF for x in target.lower().split() if x not in DET)

SFX = {"verb": ["ize", "ise", "en", "ify"], "adjective": ["able", "ible", "ive", "al", "ful", "ous", "y", "ic", "ical", "ish", "ly"],
       "adverb": ["ly", "ily", "ably", "ively", "ally", "ically", "fully", "ously"], "noun": ["ness", "ment", "ion", "ity", "ance", "ence"]}

def suffix_candidates(bases, slot):
    """Real words of this POS built from a family form + a common suffix (zipf >= 1.0)."""
    out = set()
    for b in bases:
        b = b.lower()
        for st in {b, b[:-1], b[:-1] + "i", b[:-2], b[:-3]}:
            for sx in SFX[slot]:
                w = st + sx
                if len(st) >= 3 and w != b and word_pos(w, slot) and zipf_frequency(w, "en") >= 1.0:
                    out.add(w)
    return out

PLACEHOLDER = {"sb", "sth", "someone", "something", "somebody", "your", "yourself", "my", "one's"}

def phrase_regex(hw):
    """Regex for a multi-word item: inflected first word, optional (bits), a/b alternatives, sb/sth slots, separable particles."""
    hw = re.sub(r"(\w+)\((\w+)\)", lambda m_: f"{m_.group(1)}/{m_.group(1)}{m_.group(2)}", hw.strip())
    toks_ = re.findall(r"\([^)]*\)|[^\s]+", hw)
    parts = []
    for i, t in enumerate(toks_):
        if t.startswith("("):
            inner = t[1:-1]
            parts.append(rf"(?:{re.escape(inner)}\s+)?" if not inner.startswith("-") else "")
            continue
        alts = t.split("/")
        forms = set()
        for a_ in alts:
            forms |= inflections(a_) if i == 0 or i == len(toks_) - 1 else {a_.lower()}
        if t.lower() in PLACEHOLDER:
            parts.append(r"(?:[\w'-]+\s+){1,3}")
        else:
            alt = "|".join(sorted((re.escape(f) for f in forms), key=len, reverse=True))
            gap = r"(?:[\w'-]+\s+){0,3}" if i == 0 and len(toks_) > 1 else ""
            parts.append(rf"(?:{alt})\s+{gap}" if i < len(toks_) - 1 else rf"(?:{alt})")
    return r"\b" + "".join(parts) + r"\b"

SUFFIXY = {"er", "or", "ist", "ian", "ee", "ess", "ness", "ment", "ing", "ed", "ly", "ful", "less", "ous", "al", "ic", "ive", "able", "ible", "ity", "ship", "hood", "ism", "y", "ish", "ize", "ise", "en", "s", "es"}

def compound_parts(form, bases):
    """(base, rest) if form = a family word + another real word (thunderstorm, steelworker), else None."""
    f = form.lower().replace("-", "")
    for b in sorted({x.lower() for x in bases if x}, key=len, reverse=True):
        for stem in (b, b + "s"):
            if len(stem) >= 3 and f.startswith(stem):
                rest = f[len(stem):]
                if rest and rest[0] == stem[-1] and rest[1:] in SUFFIXY:
                    continue  # doubled consonant + suffix: stir-r-ing, stop-p-er
                if len(rest) >= 3 and rest not in SUFFIXY and zipf_frequency(rest, "en") >= 3.5 and (word_pos(rest, "noun") or word_pos(rest, "verb") or word_pos(rest, "adjective")):
                    return stem, rest
    return None

def check(m, batch_ctx):
    fails, flags = [], []
    F = lambda cat, msg: fails.append({"cat": cat, "msg": msg})
    G = lambda cat, msg: flags.append({"cat": cat, "msg": msg})
    hw = m["headword"]
    kind = m.get("kind", "word")
    family = {hw.lower()}
    infl_out = {}

    if kind in ("phrasal", "phrase", "function"):
        if m.get("forms") or m.get("affixes") or m.get("people"):
            F("schema", f"{kind} entries have no Word forms, Affixes or People branch")
        if kind == "phrasal" and not m.get("particle_note"):
            F("schema", "phrasal verb needs a particle note")
        if kind in ("phrase", "function") and not m.get("usage_note"):
            F("schema", "phrase needs a usage note")
        clean = re.sub(r"\s*\(.*?\)", "", hw).strip()
        alts = [clean]
        if "/" in clean:
            toks0 = clean.split()
            alts = [" ".join(t.split("/")[0] if "/" in t else t for t in toks0)] + [clean.replace("/", " ")]
        for a in alts:
            first, *rest = a.split()
            family |= {" ".join([v] + rest).lower() for v in inflections(first)}
            if rest:
                family |= {" ".join([first] + rest[:-1] + [v]).lower() for v in inflections(rest[-1])}
    else:
        slots = {}
        for f in m.get("forms", []):
            slots.setdefault(f["slot"], []).append(f)
        for s in POSMAP:
            if s not in slots:
                F("schema", f"slot '{s}' missing (must be a form or an explicit no_form)")
                continue
            fs = slots[s]
            if len(fs) > 1:
                if fs[0].get("status") == "no_form" or any(x.get("status") not in ("existing", "other_meaning") for x in fs[1:]):
                    F("schema", f"slot '{s}': extra entries must come after the main one and be existing or other_meaning")
                if len(fs) > 3:
                    F("schema", f"slot '{s}': at most 2 extra other-meaning forms")
        slots = {s: fs[0] for s, fs in slots.items()}
        existing = [f for f in m.get("forms", []) if f.get("status") == "existing"]
        for f in existing:
            family |= inflections(f["form"])
        fam_closure = closure([f["form"] for f in existing] + [hw])

        # sense consistency: the headword sits in its own slot
        own = slots.get(m["sense_pos"])
        if not own or own.get("status") != "existing" or own.get("form", "").lower() != hw.lower():
            F("wrong sense", f"headword '{hw}' is not in its own slot ({m['sense_pos']})")

        shown = {v for f in m.get("forms", []) if f.get("form") for v in spellings(f["form"])}
        nf_all = {w.lower() for f in m.get("forms", []) for w in f.get("not_family", [])}
        for s_ in POSMAP:
            if slots.get(s_, {}).get("status") == "no_form":
                continue  # handled by the no_form check below
            near_ = {w for w in closure([x["form"] for x in existing] + [hw], 1) if wn_has(w, POSMAP[s_]) and "_" not in w}
            linked_ = {w for w in fam_closure if wn_has(w, POSMAP[s_]) and "_" not in w}
            sfx_ = suffix_candidates([x["form"] for x in existing] + [hw], s_)
            maybe_ = []
            ppl_shown = {v for p_ in m.get("people", []) for v in spellings(p_.get("form", ""))}
            for w in sorted((linked_ | sfx_) - shown - nf_all - family - ppl_shown):
                zf = zipf_frequency(w, "en")
                if s_ != "noun" and w in near_ and zf >= 3.5 and UPOS[s_] in getAllLemmas(w):
                    F("missing form", f"{s_}: common family word '{w}' (zipf {zf:.1f}) isn't shown. Add it to this slot (existing or other_meaning), or list it in not_family.")
                elif zf >= 3.0:
                    maybe_.append(w)
            if maybe_:
                G("not shown", f"{s_}: real words that may be in the family but aren't shown: {', '.join(maybe_[:6])}")
        defs_seen = {}
        for f in m.get("forms", []):
            slot = f["slot"]
            if f.get("status") == "no_form":
                # gate-3: "No such form" only when no real word exists for this slot.
                note = (f.get("note") or "").lower()
                linked = sorted(w.replace("_", " ") for w in fam_closure if wn_has(w, POSMAP[slot]) and w.replace("_", " ") not in family)
                # a note alone no longer excuses a real derived word; exclusions must be listed in not_family
                nf = {w.lower() for w in f.get("not_family", [])}
                ppl_any = {v for p_ in m.get("people", []) for v in spellings(p_.get("form", ""))}
                rare_linked = [c for c in linked if c not in nf and c not in ppl_any and (zipf_frequency(c, "en") < 2.5 or UPOS[slot] not in getAllLemmas(c))]
                linked = [c for c in linked if c not in nf and c not in ppl_any and zipf_frequency(c, "en") >= 2.5 and UPOS[slot] in getAllLemmas(c)]
                if rare_linked:
                    G("no_form check", f"{slot}: marked 'no such form'; rare or doubtful family words exist: {', '.join(rare_linked[:4])}")
                guessed = sorted(c for c in suffix_candidates([x["form"] for x in existing] + [hw], slot)
                                 if c not in family and c not in linked and c not in nf)
                if linked:
                    F("missing form", f"{slot}: marked 'no such form', but the dictionary links {', '.join(linked[:4])}. Show it (existing or other_meaning), or list it in not_family if it isn't made from this word.")
                if guessed and any(g in note and zipf_frequency(g, "en") >= 2.5 for g in guessed):
                    F("missing form", f"{slot}: the note names {', '.join(g for g in guessed if g in note and zipf_frequency(g, 'en') >= 2.5)} but the slot says 'no such form'. Show it (existing or other_meaning), or list it in not_family if it isn't made from this word.")
                elif guessed:
                    G("no_form check", f"{slot}: marked 'no such form'; real words that look related: {', '.join(guessed[:4])}. Check.")
                continue
            if f.get("status") == "other_meaning":
                form, d, ex = f.get("form", ""), f.get("definition", ""), f.get("example", "")
                if not word_pos(form, slot) and not wn_has(form.replace(" ", "_"), POSMAP[slot]):
                    F("invented form" if not wn_has(form) and zipf_frequency(form, "en") < 1.0 else "wrong POS", f"{slot} '{form}' (other meaning): not in the dictionary as a {slot}")
                if not f.get("note"):
                    F("schema", f"{slot} '{form}': other_meaning needs a note saying which meaning it belongs to")
                if not any(re.search(rf"\b{re.escape(v)}\b", ex, re.I) for v in inflections(form)):
                    F("bad example", f"{slot} example doesn't contain '{form}'")
                if not d or len(toks(d)) < 3:
                    F("bad definition", f"{slot} '{form}' definition too short")
                if any(t.lower() in inflections(form) for t in toks(d)):
                    F("bad definition", f"{slot} '{form}' definition uses its own word")
                fl = form.lower()
                lk = (fl in fam_closure or hw.lower() in closure([form])
                      or any(st in family or st in shown or st == hw.lower() for sfx in AFFIXES if AFFIXES[sfx][0] == "suffix" for st in stems(form, sfx))
                      or any(fl.startswith(p) and fl[len(p):] in shown for p in ("un", "dis", "mis", "in", "im", "ir", "il", "non"))
                      or any(l in shown or l == hw.lower() for l in getAllLemmas(fl).get("VERB", ())))
                if not lk and form.lower() != hw.lower():
                    G("wrong morphology", f"{slot} '{form}' (other meaning): family link not confirmed by the dictionary or a suffix rule")
                if zipf_frequency(form, "en") < 2.0:
                    G("level mismatch", f"{slot} '{form}' (other meaning) is rare (zipf {zipf_frequency(form, 'en'):.1f})")
                continue
            form, rel = f["form"], f.get("relation")
            pos = POSMAP[slot]
            neg = [p for p in ("un", "dis", "mis", "in", "im", "non") if form.lower().startswith(p) and form.lower()[len(p):] in {x["form"].lower() for x in existing if x is not f}
                   and (p in ("un", "dis", "mis", "non") or form.lower() in wn_antonyms(form.lower()[len(p):]))]
            if neg:
                F("schema", f"{slot} '{form}' is the opposite of a family form: put it under that form's antonyms, not in Word forms")
            # 1. real word with that POS
            ok_pos = wn_has(form, pos) or UPOS[slot] in getAllLemmas(form.lower())
            if rel == "participial":
                verbs = [x["form"] for x in existing if x["slot"] == "verb"] + [hw]
                parts = set()
                for v in verbs:
                    for k, vals in getAllInflections(v, upos="VERB").items():
                        if k in ("VBN", "VBG", "VBD"):
                            parts |= {x.lower() for x in vals}
                if form.lower() not in parts:
                    F("wrong morphology", f"{slot} '{form}' is marked participial but is not a participle of {', '.join(verbs)}")
                ok_pos = True
            elif rel in ("base", "conversion"):
                if form.lower() != hw.lower():
                    F("wrong morphology", f"{slot} '{form}' is marked {rel} but differs from the headword")
            if not ok_pos and not wn_has(form) and zipf_frequency(form, "en") >= 2.0 and any(st in family or st == hw.lower() for sfx in AFFIXES if AFFIXES[sfx][0] == "suffix" for st in stems(form, sfx)):
                G("unchecked POS", f"{slot} '{form}': not in WordNet, but common in real text (zipf {zipf_frequency(form, 'en'):.1f}) and built by a suffix rule")
            elif not ok_pos:
                F("invented form" if not wn_has(form) else "wrong POS",
                  f"{slot} '{form}': not in the dictionary as a {pos}")
            if zipf_frequency(form, "en") < 2.0:
                G("level mismatch", f"{slot} '{form}' is rare (zipf {zipf_frequency(form, 'en'):.1f})")
            # 2. relationship to the headword
            if rel == "derivational":
                linked = form.lower() in closure([hw]) or hw.lower() in closure([form]) or form.lower() in fam_closure
                ruled = any(st in family or st == hw.lower() for sfx in AFFIXES if AFFIXES[sfx][0] == "suffix" for st in stems(form, sfx))
                if not linked and not ruled:
                    G("wrong morphology", f"{slot} '{form}': family link not confirmed by the dictionary or a suffix rule")
            # 3. example
            ex, d = f.get("example", ""), f.get("definition", "")
            variants = inflections(form)
            if not any(re.search(rf"\b{re.escape(v)}\b", ex, re.I) for v in variants):
                F("bad example", f"{slot} example doesn't contain '{form}'")
            n = len(toks(ex))
            if n < 4 or n > 25:
                F("bad example", f"{slot} example is {n} words (4–25)")
            # 4. definition
            own_forms = inflections(form)
            base_forms = inflections(hw)
            bad = [t for t in toks(d) if t.lower() in family]
            hard = [t for t in bad if t.lower() in own_forms or t.lower() not in base_forms]
            soft = [t for t in bad if t not in hard]
            if hard:
                F("bad definition", f"{slot} definition uses {'its own word' if any(t.lower() in own_forms for t in hard) else 'another family form'}: {', '.join(sorted(set(hard)))}")
            if soft:
                G("bad definition", f"{slot} definition leans on the headword: {', '.join(sorted(set(soft)))} (OK if the learner already knows it)")
            if not d or len(toks(d)) < 3:
                F("bad definition", f"{slot} definition too short")
            rare = [t for t in toks(d) if t.lower() not in STOP and zipf_frequency(t, "en") < 3.3]
            if rare:
                G("level mismatch", f"{slot} definition has rare words: {', '.join(rare)}")
            if d.strip().lower() in defs_seen:
                F("bad definition", f"{slot} definition repeats the {defs_seen[d.strip().lower()]} definition")
            defs_seen[d.strip().lower()] = slot
            # inflections (deterministic, not generated)
            upos = {"noun": "NOUN", "verb": "VERB", "adjective": "ADJ", "adverb": "ADV"}[slot]
            inf = {k: list(v) for k, v in getAllInflections(form, upos=upos).items() if k in ("VBD", "VBN", "NNS", "JJR", "JJS")}
            irregular = False
            if "VBD" in inf and not inf["VBD"][0].endswith("ed"):
                irregular = True
            if "NNS" in inf and not inf["NNS"][0].endswith("s"):
                irregular = True
            if inf and slot not in infl_out:
                infl_out[slot] = {"forms": inf, "irregular": irregular}

        # gate-4.4: compounds are not forms or people (GENERATOR rule 7)
        bases_c = [x["form"] for x in existing] + [hw]
        for x in m.get("forms", []) + m.get("people", []):
            fm = x.get("form") or ""
            if fm and fm.lower() not in {b.lower() for b in bases_c}:
                cp = compound_parts(fm, bases_c)
                if cp:
                    F("schema", f"'{fm}' is a compound ({cp[0]} + {cp[1]}): compounds are left out for now (rule 7), remove it")
        # person nouns belong in People & things, not the noun slot (rule 8)
        for x in m.get("forms", []):
            fm = (x.get("form") or "").lower()
            if x.get("slot") == "noun" and fm != hw.lower() and fm.endswith(("ist", "ian", "ee", "er", "or")) and zipf_frequency(fm, "en") >= 2.0 and fm not in {"order", "power", "water", "paper", "matter", "colour", "color", "error", "honor", "honour", "labor", "labour", "manner", "number", "border", "corner", "anger", "danger", "winter", "summer", "dinner", "letter", "weather", "feather", "leather", "silver", "mirror", "terror", "horror", "favour", "favor", "flavour", "flavor", "humour", "humor", "behaviour", "behavior"}:
                G("person noun in noun slot?", f"noun '{x.get('form')}' looks like a person/thing noun; rule 8 puts those in People & things")

        # People & things branch (gate-4)
        ppl = m.get("people", [])
        if len(ppl) > 4:
            F("schema", f"People & things has {len(ppl)} entries, max 4")
        seen_p = set()
        for p in ppl:
            pf = p.get("form", ""); pl = pf.lower()
            if p.get("kind") not in PEOPLE_KINDS:
                F("schema", f"people '{pf}': kind must be one of {sorted(PEOPLE_KINDS)}")
            if p.get("status") not in ("existing", "other_meaning"):
                F("schema", f"people '{pf}': status must be existing or other_meaning")
            if (pl in shown or pl in seen_p) and pl != hw.lower():
                F("schema", f"people '{pf}' is already shown elsewhere in the map")
            seen_p.add(pl)
            if not word_pos(pf, "noun") and not wn_has(pf.replace(" ", "_"), "noun"):
                F("invented form" if zipf_frequency(pf, "en") < 2.0 else "wrong POS", f"people '{pf}': not in the dictionary as a noun")
            ex, d = p.get("example", ""), p.get("definition", "")
            if not any(re.search(rf"\b{re.escape(v)}\b", ex, re.I) for v in inflections(pf)):
                F("bad example", f"people '{pf}': example doesn't contain it")
            if not d or len(toks(d)) < 3:
                F("bad definition", f"people '{pf}': definition too short")
            if any(t.lower() in inflections(pf) for t in toks(d)):
                F("bad definition", f"people '{pf}': definition uses its own word")
            if p.get("status") == "other_meaning" and not p.get("note"):
                F("schema", f"people '{pf}': other_meaning needs a note")
            lk = (pl in fam_closure or any(st in family or st in shown or st == hw.lower() for sfx in AFFIXES if AFFIXES[sfx][0] == "suffix" for st in stems(pf, sfx)))
            if not lk:
                G("wrong morphology", f"people '{pf}': family link not confirmed by the dictionary or a suffix rule")
            if zipf_frequency(pf, "en") < 2.0:
                G("level mismatch", f"people '{pf}' is rare (zipf {zipf_frequency(pf, 'en'):.1f})")
            if p.get("status") == "existing":
                family |= inflections(pf)
        shown |= {v for p_ in seen_p for v in spellings(p_)}
        # common person/job/field nouns of the family that aren't shown
        near_n = {w for w in closure([x["form"] for x in existing] + [hw], 1) if wn_has(w, "noun") and "_" not in w}
        bases_ = [x["form"].lower() for x in existing] + [hw.lower()]
        sfx_n = set()
        for b_ in bases_:
            for st in {b_, b_[:-1], b_[:-2], b_[:-1] + "i"}:
                for sx in PEOPLE_SFX:
                    w = st + sx
                    if len(st) >= 3 and w != b_ and word_pos(w, "noun") and zipf_frequency(w, "en") >= 3.0:
                        sfx_n.add(w)
        nf_p = {w.lower() for w in m.get("people_not_family", [])} | nf_all
        for w in sorted((near_n | sfx_n) - shown - nf_p - family):
            if not w.endswith(PEOPLE_SFX):
                continue
            zf = zipf_frequency(w, "en")
            if w in near_n and zf >= 3.8 and len(ppl) < 4:
                F("missing form", f"People & things: common family noun '{w}' (zipf {zf:.1f}) isn't shown. Add it, or list it in people_not_family if it isn't made from this word.")
            elif zf >= 3.0:
                G("not shown", f"People & things: '{w}' (zipf {zf:.1f}) may belong here")

        # affixes
        for a in m.get("affixes", []):
            key, form = a["affix"], a["in_form"]
            if key not in AFFIXES:
                F("false affix", f"'{key}' is not in the affix table")
                continue
            if a.get("meaning_key") != key:
                F("false affix", f"'{key}' record points at the meaning of '{a.get('meaning_key')}'")
            typ, meaning, test = AFFIXES[key]
            s = key.strip("-")
            fl = form.lower()
            if (typ == "prefix" and not fl.startswith(s)) or (typ == "suffix" and not fl.endswith(s)):
                F("false affix", f"'{key}' is not at the {'start' if typ == 'prefix' else 'end'} of '{form}'")
                continue
            in_map = fl in family
            if not in_map:
                if wn_has(fl) and (fl in closure([hw], 3) or hw.lower() in closure([fl], 3)):
                    G("affix outside map", f"'{key}' is shown with '{form}', which is family but not one of the four slots")
                else:
                    F("false affix", f"'{form}' (for '{key}') is not a confirmed family member")
            if typ == "prefix":
                stem = fl[len(s):]
                if test == "classical":
                    G("bound root", f"'{key}' + '{stem}': classical prefix on a bound root; reviewer confirms")
                elif test == "antonym":
                    if stem not in wn_antonyms(fl) and fl not in wn_antonyms(stem):
                        F("false affix", f"'{key}' + '{stem}': '{form}' is not the opposite of '{stem}', so this is not the prefix {key}")
                elif test == "verb_stem":
                    if not wn_has(stem, "verb"):
                        F("false affix", f"'{key}' + '{stem}': '{stem}' is not a verb, so this is not the prefix {key}")
                elif test == "word_stem":
                    if not wn_has(stem):
                        F("false affix", f"'{key}' + '{stem}': '{stem}' is not a word")
            else:
                sts = stems(fl, key)
                real = [st for st in sts if wn_has(st)]
                if not real:
                    bound_ok = any(x["affix"] in AFFIXES and AFFIXES[x["affix"]][2] == "classical" and x["in_form"].lower() == fl for x in m.get("affixes", []))
                    if bound_ok:
                        G("bound root", f"'{form}' = bound root + '{key}'; reviewer confirms")
                    else:
                        F("false affix", f"'{form}' minus '{key}' leaves no real word ({', '.join(sorted(sts)) or '-'})")
                elif not any(st in family or st in closure([fl]) or fl in closure([st]) for st in real):
                    G("false affix", f"'{form}' = '{real[0]}' + '{key}', but '{real[0]}' isn't confirmed as related. Real split?")
            for w in a.get("also", []):
                w0 = w.split("→")[-1].strip().lower()
                if (typ == "prefix" and not w0.startswith(s)) or (typ == "suffix" and not w0.endswith(s)):
                    F("false affix", f"'also in' word '{w}' doesn't carry '{key}'")
                elif not wn_has(w0) and zipf_frequency(w0, "en") < 3:
                    F("false affix", f"'also in' word '{w}' is not a real word")

    # relations (WordRelation rules), per form since gate-2
    def rel_rows():
        if kind in ("phrasal", "phrase", "function"):
            for r in m.get("relations", []):
                yield None, r
        for f in m.get("forms", []):
            if f.get("status") != "existing":
                if f.get("syn") or f.get("ant"):
                    F("schema", f"{f['slot']}: relations on a no_form slot")
                continue
            syn, ant = f.get("syn", []), f.get("ant", [])
            if len(syn) > 6:
                F("bad synonym", f"{f['form']}: {len(syn)} synonyms, max 6")
            if len(ant) > 3:
                F("bad antonym", f"{f['form']}: {len(ant)} antonyms, max 3")
            if syn and not any(easy(r["to"]) for r in syn):
                G("level mismatch", f"{f['form']}: no easy synonym (all below the frequency bar)")
            for r in syn + ant:
                yield f, r
    for f, r in rel_rows():
        tgt, rel = r["to"], r["relation"]
        where = f"{f['form']} → " if f else ""
        if not r.get("note"):
            F("bad synonym" if rel != "antonym" else "bad antonym", f"{where}'{tgt}' has no note")
        elif len(r["note"]) > 300:
            F("schema", f"{where}'{tgt}' note is over 300 characters (WordRelation limit)")
        if rel in ("synonym", "related"):
            st = r.get("strength")
            if st not in (0.95, 0.8, 0.6, 0.4):
                F("bad synonym", f"{where}'{tgt}' strength {st} is off the 4-step scale")
            elif rel == "synonym" and st < 0.8:
                F("bad synonym", f"{where}'{tgt}' is called a synonym at {st}; at 0.60 or below it must be 'related'")
            elif rel == "related" and st > 0.6:
                F("bad synonym", f"{where}'{tgt}' is 'related' at {st}; 0.80+ must be 'synonym'")
            if tgt.lower() in family:
                F("bad synonym", f"{where}'{tgt}' is a family member, not a synonym")
            if st in (0.95, 0.8):
                batch_ctx["targets"][tgt.lower()].append(hw)
        elif rel == "antonym":
            if tgt.lower().startswith("not "):
                F("bad antonym", f"{where}'{tgt}' looks like a negation gloss")
            if tgt.lower() in family:
                F("bad antonym", f"{where}'{tgt}' is a family member")
        else:
            F("schema", f"unknown relation '{rel}'")
        for t in re.findall(r"[a-z'-]+", tgt.lower()):
            if t not in ("someone", "something") and zipf_frequency(t, "en") < 1.5:
                F("bad synonym", f"{where}'{tgt}' is not a real word/phrase")
        if f:
            ok = pos_fits(tgt, f["slot"])
            cat = "bad antonym" if rel == "antonym" else "bad synonym"
            if ok is False:
                F(cat, f"{where}'{tgt}' is not a {f['slot']} (form is a {f['slot']})")
            elif ok is None:
                G("unchecked POS", f"{where}'{tgt}': phrase, part of speech not confirmed")

    # in context
    c = m.get("context", {})
    text = c.get("text", "")
    sents = [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z\"“])", text.strip()) if s]
    if not 2 <= len(sents) <= 3:
        F("bad example", f"in-context text has {len(sents)} sentence(s), needs 2–3")
    used = {u for u in family if re.search(rf"(?<!\w){re.escape(u)}(?!\w)", text, re.I)}
    if kind in ("phrasal", "phrase", "function") and not used and re.search(phrase_regex(hw), text, re.I):
        used = {hw}
    if kind in ("phrasal", "phrase", "function"):
        if not used:
            F("bad example", f"in-context text doesn't use the {kind}")
    else:
        need = 2 if len([f for f in m.get("forms", []) if f.get("status") == "existing" and f.get("form", "").lower() != hw.lower()]) >= 1 else 1
        distinct_bases = {f["form"].lower() for f in m.get("forms", []) if f.get("status") == "existing" and any(re.search(rf"\b{re.escape(v)}\b", text, re.I) for v in inflections(f["form"]))}
        if len(distinct_bases) < need:
            F("bad example", f"in-context text uses {len(distinct_bases)} family form(s), needs {need}")
    if len(toks(text)) > 60:
        G("level mismatch", f"in-context text is long ({len(toks(text))} words)")

    # reviewed overrides: a FAIL the coordinator judged to be the gate's mistake becomes a visible flag
    for ov in m.get("gate_overrides", []):
        hit = [f for f in fails if ov.get("msg_contains", "\0") in f["msg"]]
        for f in hit:
            fails.remove(f)
            flags.append({"cat": "override", "msg": f"{f['msg']} — overridden: {ov.get('reason', '')}"})
    return {"headword": hw, "kind": kind, "cefr": m.get("cefr"), "fails": fails, "flags": flags, "inflections": infl_out,
            "reviewer_note": m.get("reviewer_note", "")}

def run(paths):
    maps = []
    for p in paths:
        maps += json.load(open(p))
    ctx = {"headwords": {m["headword"].lower() for m in maps}, "targets": collections.defaultdict(list)}
    results = [check(m, ctx) for m in maps]
    shared = {t: hws for t, hws in ctx["targets"].items() if len(set(hws)) > 1}
    for r in results:
        for t, hws in shared.items():
            if r["headword"] in hws:
                r["flags"].append({"cat": "clue collision", "msg": f"'{t}' is a synonym/related target for {', '.join(sorted(set(hws)))}"})
    return maps, results

if __name__ == "__main__":
    maps, results = run(sorted(glob.glob(sys.argv[1])))
    out = {"gate_version": GATE_VERSION, "affix_table_version": AFFIX_TABLE_VERSION, "lexicon_version": "WordNet 3.1 (wordnet-db)",
           "results": results}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "gate_report.json"), "w"), indent=1, ensure_ascii=False)
    nf = sum(1 for r in results if r["fails"])
    print(f"{len(results)} maps · {len(results) - nf} pass · {nf} fail · {sum(len(r['flags']) for r in results)} flags")
    cats = collections.Counter(f["cat"] for r in results for f in r["fails"])
    print("FAIL categories:", dict(cats))
    print("FLAG categories:", dict(collections.Counter(f["cat"] for r in results for f in r["flags"])))
    for r in results:
        for f in r["fails"]:
            print(f"  FAIL {r['headword']:12} [{f['cat']}] {f['msg']}")
