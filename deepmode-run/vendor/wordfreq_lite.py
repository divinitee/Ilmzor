"""Dependency-free stand-in for wordfreq.zipf_frequency (English only), so the gate runs without pip.

Uses wordfreq 3.1.1's own English 'large' wordlist (vendor/wordfreq_large_en.json.gz, same cBpack buckets),
the same multi-token formula (1/f = 1/f1 + 1/f2 + ...), the same 3-significant-digit rounding and the same
Zipf conversion. Tokenization is a close approximation of wordfreq's (lowercase, split on non-word characters,
keep inner apostrophes); verified equal to the real library on the gate's vocabulary (see HANDOFF.md).
"""
import gzip, json, math, os, re

_HERE = os.path.dirname(os.path.abspath(__file__))
_FREQ = None
_TOKEN = re.compile(r"[^\W_]+(?:'[^\W_]+)*")


def _freqs():
    global _FREQ
    if _FREQ is None:
        buckets = json.load(gzip.open(os.path.join(_HERE, "wordfreq_large_en.json.gz"), "rt", encoding="utf-8"))
        _FREQ = {}
        for i, words in enumerate(buckets):
            f = 10 ** (-i / 100)
            for w in words:
                _FREQ[w] = f
    return _FREQ


def _tokens(text):
    t = text.replace("’", "'").casefold()
    return _TOKEN.findall(t)


def _smash(token):
    return re.sub(r"\d", "0", token) if re.search(r"\d\d", token) else token


def word_frequency(word, lang="en", wordlist="best", minimum=0.0):
    toks = _tokens(word)
    if not toks:
        return minimum
    freqs = _freqs()
    inv = 0.0
    for tok in toks:
        s = _smash(tok)
        if s not in freqs:
            return minimum
        inv += 1.0 / freqs[s]
    unrounded = max(1.0 / inv, minimum)
    if unrounded == 0.0:
        return 0.0
    lead = math.floor(-math.log(unrounded, 10))
    return round(unrounded, lead + 3)


def zipf_frequency(word, lang="en", wordlist="best", minimum=0.0):
    freq_min = 10 ** (minimum - 9)
    freq = word_frequency(word, lang, wordlist, freq_min)
    return round(math.log(freq, 10) + 9, 2)
