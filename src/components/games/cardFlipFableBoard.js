// Pure board logic for CardFlip Fable's rotating board. Zero imports on
// purpose: the invariant simulation (a throwaway node script, see the
// bake-off report) loads this file directly, so anything it needs lives here.
//
// Cards: { id, pairId, ... }, exactly two per pairId. A matched pair leaves
// the board together, so every card still on the board has its partner
// either on the board or in the pile — never gone.
//
// Invariants, in priority order:
//   1. never deadlock — the board never has zero live (complete, unmatched)
//      pairs while the pile is non-empty;
//   2. livePairs >= minLivePairs(slots) whenever the stream can still supply
//      it (i.e. until the pile runs dry);
//   3. never deal both halves of one fresh pair into the two freed slots.
// Rule 3 yields to 1 and 2; dealInto reports `freePair: true` when it had to.

export const MIN_LIVE_PAIRS_FLOOR = 2;
// How many deals a single may sit on the board unmatchable before its
// partner is forced in, even when the live-pair floor is already met.
export const ORPHAN_MAX_AGE = 4;

// ~1 complete pair per 3 board slots, never below the floor.
export function minLivePairs(slots) {
  return Math.max(MIN_LIVE_PAIRS_FLOOR, Math.floor(slots / 3));
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const present = (board) => board.filter(Boolean);
const stamp0 = (c) => ({ ...c, dealtAt: 0 });

function pairCounts(board) {
  const n = new Map();
  present(board).forEach((c) => n.set(c.pairId, (n.get(c.pairId) || 0) + 1));
  return n;
}

export function livePairCount(board) {
  let live = 0;
  pairCounts(board).forEach((v) => { if (v === 2) live++; });
  return live;
}

// Singles whose partner is still in the pile, oldest first.
export function orphansOn(board) {
  const n = pairCounts(board);
  return present(board).filter((c) => n.get(c.pairId) === 1).sort((a, b) => a.dealtAt - b.dealtAt);
}

export const isDead = (board, pile) => pile.length === 0 && livePairCount(board) === 0;

// Opening board built BY PAIR, not by card: `complete` whole pairs plus an
// even, bounded number of orphan singles (their partners go to the pile),
// then positions shuffled so it doesn't read as ordered. If the whole round
// fits on the board there is no pile and every pair is complete.
export function buildOpeningBoard(cards, slots, rng = Math.random) {
  const byPair = new Map();
  cards.forEach((c) => { const l = byPair.get(c.pairId) || []; l.push(c); byPair.set(c.pairId, l); });
  const pairs = shuffle([...byPair.values()], rng);
  const cap = Math.floor(slots / 2);
  if (pairs.length <= cap) return { board: shuffle(pairs.flat(), rng).map(stamp0), pile: [], dealSeq: 0 };
  const extra = pairs.length - cap;
  const orphans = 2 * Math.min(Math.floor(slots / 8), Math.floor(extra / 2));
  const complete = (slots - orphans) / 2;
  const board = [], pile = [];
  pairs.forEach((p, i) => {
    if (i < complete) board.push(...p);
    else if (i < complete + orphans) { const [a, b] = shuffle(p, rng); board.push(a); pile.push(b); }
    else pile.push(...p);
  });
  return { board: shuffle(board, rng).map(stamp0), pile: shuffle(pile, rng), dealSeq: 0 };
}

// Call after the matched pair has been cleared (board[idx] === null for each
// freed index). Fills each freed slot from the pile, healing the board toward
// the live-pair floor before dealing anything fresh.
export function dealInto({ board, pile, dealSeq }, freedIdx) {
  board = [...board];
  pile = [...pile];
  const seq = dealSeq + 1;
  const need = minLivePairs(board.length);
  const dealtNow = [];
  let freePair = false;
  for (const idx of freedIdx) {
    if (!pile.length) { board[idx] = null; continue; }
    const onBoard = new Set(present(board).map((c) => c.pairId));
    // Orphans dealt this very deal are excluded: completing one of those
    // would be exactly the free pair rule 3 forbids.
    const healable = orphansOn(board).filter((o) => o.dealtAt !== seq);
    const partnerOf = (o) => pile.findIndex((c) => c.pairId === o.pairId);
    let pick = -1;
    // (1)+(2): below the floor → the oldest orphan's partner.
    if (livePairCount(board) < need && healable.length) pick = partnerOf(healable[0]);
    // Orphan lifetime bound.
    if (pick === -1 && healable.length && seq - healable[0].dealtAt >= ORPHAN_MAX_AGE) pick = partnerOf(healable[0]);
    // (3): a fresh single whose pair is not on the board at all.
    if (pick === -1) pick = pile.findIndex((c) => !onBoard.has(c.pairId));
    // Pile holds only partners of board cards → heal anything not dealt now.
    if (pick === -1) pick = pile.findIndex((c) => !dealtNow.includes(c.pairId));
    // Only the mate of a card dealt this deal is left: rule 3 yields.
    if (pick === -1) { pick = 0; freePair = true; }
    const card = { ...pile[pick], dealtAt: seq };
    pile.splice(pick, 1);
    board[idx] = card;
    dealtNow.push(card.pairId);
  }
  return { board, pile, dealSeq: seq, freePair };
}