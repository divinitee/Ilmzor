import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/useAppLang";

const DIFF_CONFIG = {
  beginner:     { count: 4 },
  intermediate: { count: 6 },
  advanced:      { count: 8 },
  proficient:    { count: 10 },
};

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// Build a small crossword by placing words intersecting on shared letters.
function buildCrossword(wordList, difficulty = "intermediate") {
  // wordList: [{ english, uzbek }]
  const items = shuffle(wordList).slice(0, 20)
    .map(w => ({ word: w.english.replace(/[^a-zA-Z]/g, "").toLowerCase(), clue: w.uzbek }))
    .filter(w => w.word.length >= 3)
    .sort((a, b) => b.word.length - a.word.length);

  const target = Math.min(Math.max(DIFF_CONFIG[difficulty] ? DIFF_CONFIG[difficulty].count : 6, 4), items.length);

  const placed = []; // {word, clue, row, col, dir:'across'|'down', num}
  const cells = {}; // "r,c" -> { letter, words: [] }

  const setCell = (r, c, letter) => { cells[`${r},${c}`] = { letter, words: [] }; };
  const getCell = (r, c) => cells[`${r},${c}`];
  const canPlace = (word, r, c, dir) => {
    for (let i = 0; i < word.length; i++) {
      const rr = dir === "down" ? r + i : r;
      const cc = dir === "across" ? c + i : c;
      const existing = getCell(rr, cc);
      if (existing && existing.letter !== word[i]) return false;
      // check adjacent cells don't collide (except at intersections)
      if (!existing) {
        if (dir === "across") {
          if (getCell(rr - 1, cc) || getCell(rr + 1, cc)) return false;
        } else {
          if (getCell(rr, cc - 1) || getCell(rr, cc + 1)) return false;
        }
      }
    }
    // check cell before start and after end are empty
    const beforeR = dir === "down" ? r - 1 : r;
    const beforeC = dir === "across" ? c - 1 : c;
    const afterR = dir === "down" ? r + word.length : r;
    const afterC = dir === "across" ? c + word.length : c;
    if (getCell(beforeR, beforeC)) return false;
    if (getCell(afterR, afterC)) return false;
    return true;
  };

  const place = (item) => {
    if (placed.length === 0) {
      placeWord(item, 0, 0, "across");
      return true;
    }
    for (const p of placed) {
      for (let i = 0; i < p.word.length; i++) {
        const letter = p.word[i];
        for (let j = 0; j < item.word.length; j++) {
          if (item.word[j] !== letter) continue;
          const r = p.dir === "across" ? p.row : p.row + i;
          const c = p.dir === "across" ? p.col + i : p.col;
          const newR = dir => dir === "down" ? r - j : r;
          const newC = dir => dir === "across" ? c - j : c;
          const tryDir = p.dir === "across" ? "down" : "across";
          if (canPlace(item.word, newR(tryDir), newC(tryDir), tryDir)) {
            placeWord(item, newR(tryDir), newC(tryDir), tryDir);
            return true;
          }
        }
      }
    }
    return false;
  };

  const placeWord = (item, r, c, dir) => {
    for (let i = 0; i < item.word.length; i++) {
      const rr = dir === "down" ? r + i : r;
      const cc = dir === "across" ? c + i : c;
      if (!getCell(rr, cc)) setCell(rr, cc, item.word[i]);
    }
    placed.push({ ...item, row: r, col: c, dir });
  };

  let placedCount = 0;
  for (const it of items) {
    if (placedCount >= target) break;
    if (place(it)) placedCount++;
  }
  if (placed.length === 0) return null;

  // compute bounds
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  Object.keys(cells).forEach(k => {
    const [r, c] = k.split(",").map(Number);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  });

  // normalize to 0-based and number cells
  const grid = {}; // "r,c" -> {letter, num, across, down}
  const numbered = {};
  let nextNum = 1;
  placed.forEach(p => {
    p.row -= minR; p.col -= minC;
  });
  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  // assign numbers at word starts
  const starts = [...placed].sort((a, b) => (a.row === b.row ? a.col - b.col : a.row - b.row));
  const cellMap = {};
  // rebuild cellMap with normalized coords
  Object.keys(cells).forEach(k => {
    const [r, c] = k.split(",").map(Number);
    cellMap[`${r - minR},${c - minC}`] = cells[k].letter;
  });

  // number assignment: a cell starts a word if it's the start of an across or down word
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!cellMap[`${r},${c}`]) continue;
      const startsAcross = (c === 0 || !cellMap[`${r},${c - 1}`]) && cellMap[`${r},${c + 1}`];
      const startsDown = (r === 0 || !cellMap[`${r - 1},${c}`]) && cellMap[`${r + 1},${c}`];
      if (startsAcross || startsDown) {
        grid[`${r},${c}`] = { letter: cellMap[`${r},${c}`], num: nextNum, across: startsAcross, down: startsDown };
        nextNum++;
      } else {
        grid[`${r},${c}`] = { letter: cellMap[`${r},${c}`], num: null, across: false, down: false };
      }
    }
  }

  // map placed words to numbers + clue lists
  const across = [];
  const down = [];
  placed.forEach(p => {
    const cell = grid[`${p.row},${p.col}`];
    const entry = { num: cell.num, word: p.word, clue: p.clue, row: p.row, col: p.col, dir: p.dir };
    if (p.dir === "across") across.push(entry); else down.push(entry);
  });
  across.sort((a, b) => a.num - b.num);
  down.sort((a, b) => a.num - b.num);

  return { grid, rows, cols, across, down };
}

export default function CrosswordGame({ words, unitName, onBack, onCoinsEarned, difficulty = "intermediate" }) {
  const { t } = useAppLang();
  const cfg = DIFF_CONFIG[difficulty] || DIFF_CONFIG.intermediate;
  const puzzle = useMemo(() => buildCrossword(words, cfg.count), [words, difficulty]);
  const [entries, setEntries] = useState({}); // "r,c" -> user char
  const [active, setActive] = useState({ r: 0, c: 0, dir: "across" });
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [coinAnim, setCoinAnim] = useState(null);
  const inputRefs = useRef({});

  useEffect(() => {
    if (!puzzle) return;
    // set first across start as active
    const first = puzzle.across[0] || puzzle.down[0];
    if (first) setActive({ r: first.row, c: first.col, dir: first.dir });
  }, [puzzle]);

  useEffect(() => () => { try { window.speechSynthesis.cancel(); } catch { /* */ } }, []);

  if (!puzzle) {
    return (
      <div className="max-w-sm mx-auto px-4 py-10 text-center">
        <p className="text-muted-foreground text-sm mb-4">{t("gameui.crossword_not_enough")}</p>
        <Button variant="outline" onClick={onBack} className="w-full">{t("gameui.back")}</Button>
      </div>
    );
  }

  const cellKey = (r, c) => `${r},${c}`;
  const isCell = (r, c) => !!puzzle.grid[cellKey(r, c)];

  // find the word (entry) currently active
  const activeWord = (() => {
    const list = active.dir === "across" ? puzzle.across : puzzle.down;
    return list.find(w => {
      if (w.dir !== active.dir) return false;
      if (active.dir === "across") return w.row === active.r && active.c >= w.col && active.c < w.col + w.word.length;
      return w.col === active.c && active.r >= w.row && active.r < w.row + w.word.length;
    }) || list[0];
  })();

  const focusCell = (r, c, dir) => {
    if (!isCell(r, c)) return;
    let d = dir || active.dir;
    // flip direction if cell not in current word
    const inWord = activeWord && (
      (activeWord.dir === "across" && activeWord.row === r && c >= activeWord.col && c < activeWord.col + activeWord.word.length) ||
      (activeWord.dir === "down" && activeWord.col === c && r >= activeWord.row && r < activeWord.row + activeWord.word.length)
    );
    if (!inWord) {
      // pick a direction that has a word through this cell
      const acrossW = puzzle.across.find(w => w.row === r && c >= w.col && c < w.col + w.word.length);
      const downW = puzzle.down.find(w => w.col === c && r >= w.row && r < w.row + w.word.length);
      if (d === "across" && !acrossW && downW) d = "down";
      else if (d === "down" && !downW && acrossW) d = "across";
      else if (!acrossW && downW) d = "down";
      else if (acrossW && !downW) d = "across";
    }
    setActive({ r, c, dir: d });
    setTimeout(() => inputRefs.current[cellKey(r, c)]?.focus(), 0);
  };

  const handleInput = (r, c, val) => {
    const ch = (val || "").toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
    setEntries(e => ({ ...e, [cellKey(r, c)]: ch }));
    // auto-advance
    if (ch) {
      if (active.dir === "across") {
        let nc = c + 1;
        while (nc < puzzle.cols && !isCell(r, nc)) nc++;
        if (isCell(r, nc)) focusCell(r, nc, "across");
      } else {
        let nr = r + 1;
        while (nr < puzzle.rows && !isCell(nr, c)) nr++;
        if (isCell(nr, c)) focusCell(nr, c, "down");
      }
    }
  };

  const handleKey = (r, c, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const cur = entries[cellKey(r, c)];
      if (cur) {
        setEntries(en => { const n = { ...en }; delete n[cellKey(r, c)]; return n; });
      } else {
        if (active.dir === "across") {
          let nc = c - 1;
          while (nc >= 0 && !isCell(r, nc)) nc--;
          if (isCell(r, nc)) focusCell(r, nc, "across");
        } else {
          let nr = r - 1;
          while (nr >= 0 && !isCell(nr, c)) nr--;
          if (isCell(nr, c)) focusCell(nr, c, "down");
        }
      }
    } else if (e.key === "ArrowRight") { e.preventDefault(); focusCell(r, c + 1, "across"); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); focusCell(r, c - 1, "across"); }
    else if (e.key === "ArrowDown") { e.preventDefault(); focusCell(r + 1, c, "down"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusCell(r - 1, c, "down"); }
    else if (e.key === " " || e.key === "Tab") {
      e.preventDefault();
      const newDir = active.dir === "across" ? "down" : "across";
      focusCell(r, c, newDir);
    }
  };

  const isCorrectCell = (r, c) => {
    const cell = puzzle.grid[cellKey(r, c)];
    if (!cell) return false;
    return (entries[cellKey(r, c)] || "").toUpperCase() === cell.letter.toUpperCase();
  };

  const isFilled = () => Object.keys(puzzle.grid).every(k => (entries[k] || "").trim());

  const handleCheck = () => {
    setChecked(true);
    setTimeout(() => setChecked(false), 2000);
    if (isAllCorrect()) complete();
  };

  const isAllCorrect = () => Object.keys(puzzle.grid).every(k => (entries[k] || "").toUpperCase() === puzzle.grid[k].letter.toUpperCase());

  const complete = () => {
    if (done) return;
    setDone(true);
    const coins = puzzle.across.length + puzzle.down.length;
    setCoinAnim(`+${coins} 🪙`);
    setTimeout(() => setCoinAnim(null), 1200);
    if (onCoinsEarned) onCoinsEarned(coins, coins);
  };

  const handleReveal = () => {
    setRevealed(true);
    const filled = { ...entries };
    Object.keys(puzzle.grid).forEach(k => { filled[k] = puzzle.grid[k].letter.toUpperCase(); });
    setEntries(filled);
  };

  const reset = () => { setEntries({}); setChecked(false); setRevealed(false); setDone(false); };

  // is a cell part of the active word?
  const inActiveWord = (r, c) => {
    if (!activeWord) return false;
    if (activeWord.dir === "across") return activeWord.row === r && c >= activeWord.col && c < activeWord.col + activeWord.word.length;
    return activeWord.col === c && r >= activeWord.row && r < activeWord.row + activeWord.word.length;
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-6 relative">
      <AnimatePresence>
        {coinAnim && (
          <motion.div initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -60, scale: 1.4 }}
            className="absolute top-12 left-1/2 -translate-x-1/2 z-50 text-xl font-bold text-amber-500 pointer-events-none">
            {coinAnim}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-muted-foreground text-sm hover:text-foreground select-none flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> {t("gameui.back")}
        </button>
        <span className="text-xs text-muted-foreground font-medium">{unitName}</span>
        <span className="w-10" />
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-4 mb-4 text-center">
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{t("gameui.crossword_done")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("gameui.crossword_done_desc")}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="bg-background border border-border rounded-2xl p-3 mb-4 overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: puzzle.rows }).map((_, r) =>
            Array.from({ length: puzzle.cols }).map((_, c) => {
              const cell = puzzle.grid[cellKey(r, c)];
              if (!cell) return <div key={cellKey(r, c)} className="w-8 h-8 sm:w-9 sm:h-9" />;
              const val = entries[cellKey(r, c)] || "";
              const isActive = active.r === r && active.c === c;
              const inWord = inActiveWord(r, c);
              const correct = checked && isCorrectCell(r, c);
              const wrong = checked && !isCorrectCell(r, c);
              let cls = "relative w-8 h-8 sm:w-9 sm:h-9 rounded-md border text-center text-sm font-bold flex items-center justify-center select-none transition-colors ";
              if (isActive) cls += "border-primary bg-primary/20 ring-2 ring-primary ";
              else if (inWord) cls += "border-primary/40 bg-primary/5 ";
              else cls += "border-border bg-background ";
              if (wrong) cls += "!border-destructive !bg-destructive/15 ";
              else if (correct) cls += "!border-emerald-500 !bg-emerald-50 dark:!bg-emerald-950 ";
              return (
                <div key={cellKey(r, c)} className={cls} onClick={() => focusCell(r, c)}>
                  {cell.num && <span className="absolute top-0 left-0.5 text-[8px] text-muted-foreground font-semibold leading-none">{cell.num}</span>}
                  <input
                    ref={el => { inputRefs.current[cellKey(r, c)] = el; }}
                    value={val}
                    onChange={e => handleInput(r, c, e.target.value)}
                    onKeyDown={e => handleKey(r, c, e)}
                    onFocus={() => setActive(a => ({ r, c, dir: a.dir }))}
                    maxLength={1}
                    inputMode="text"
                    className="w-full h-full bg-transparent text-center text-sm font-bold uppercase outline-none caret-transparent"
                    disabled={done}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-5">
        <Button variant="outline" onClick={handleCheck} disabled={done} className="flex-1 select-none text-xs">
          <Check className="w-4 h-4 mr-1" /> {t("gameui.crossword_check")}
        </Button>
        <Button variant="outline" onClick={handleReveal} disabled={done} className="flex-1 select-none text-xs">
          <Eye className="w-4 h-4 mr-1" /> {t("gameui.crossword_reveal")}
        </Button>
        <Button variant="outline" onClick={reset} className="flex-1 select-none text-xs">
          <RefreshCw className="w-4 h-4 mr-1" /> {t("gameui.crossword_clear")}
        </Button>
      </div>

      {/* Active clue */}
      {activeWord && (
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-300 dark:border-indigo-700 rounded-2xl p-3 mb-4">
          <p className="text-xs text-muted-foreground mb-0.5">
            {activeWord.num}. {activeWord.dir === "across" ? t("gameui.crossword_across") : t("gameui.crossword_down")} · {t("gameui.crossword_letters", { n: activeWord.word.length })}
          </p>
          <p className="text-sm font-semibold text-foreground">{activeWord.clue}</p>
        </div>
      )}

      {/* Clue lists */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("gameui.crossword_across")}</p>
          <div className="space-y-1.5">
            {puzzle.across.map(w => (
              <button key={w.num} onClick={() => focusCell(w.row, w.col, "across")}
                className={`block text-left text-xs w-full rounded-lg px-2 py-1.5 select-none transition-colors ${activeWord && activeWord.dir === "across" && activeWord.num === w.num ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/40 text-muted-foreground"}`}>
                <strong>{w.num}.</strong> {w.clue} <span className="opacity-60">({w.word.length})</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("gameui.crossword_down")}</p>
          <div className="space-y-1.5">
            {puzzle.down.map(w => (
              <button key={w.num} onClick={() => focusCell(w.row, w.col, "down")}
                className={`block text-left text-xs w-full rounded-lg px-2 py-1.5 select-none transition-colors ${activeWord && activeWord.dir === "down" && activeWord.num === w.num ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/40 text-muted-foreground"}`}>
                <strong>{w.num}.</strong> {w.clue} <span className="opacity-60">({w.word.length})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}