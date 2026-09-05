// Pre-play study reveal length for CardFlip Fable.
//
// The reveal is an encoding phase, so its length is driven by HOW MUCH
// INFORMATION is on screen, never by CEFR level. A harder level usually means
// longer, more nuanced meaning text — that should buy the student more reading
// time, not less. Deterministic: same board, same duration.

export const STUDY_MIN_MS = 3500;
export const STUDY_MAX_MS = 14000;
export const MS_PER_PAIR = 420;   // one word + one meaning card to bind
export const MS_PER_CHAR = 16;    // reading cost of the meaning text itself

export function studyMsFor({ pairsOnBoard = 0, meaningChars = 0 } = {}) {
  const raw = pairsOnBoard * MS_PER_PAIR + meaningChars * MS_PER_CHAR;
  return Math.min(STUDY_MAX_MS, Math.max(STUDY_MIN_MS, Math.round(raw)));
}

// Information load of an opening board: its pairs and the total meaning text.
export function studyMsForBoard(board = []) {
  const cards = board.filter(Boolean);
  const meanings = cards.filter((c) => c.type === "meaning");
  return studyMsFor({
    pairsOnBoard: Math.round(cards.length / 2),
    meaningChars: meanings.reduce((n, c) => n + String(c.content || "").length, 0),
  });
}