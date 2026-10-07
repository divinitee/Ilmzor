# Tandem run (from 7 Oct 2026)

Two generators work on the remaining batches at the same time:

| who | batches | log |
|---|---|---|
| Base44 AI | **even** batches: 058, 060, 062 … 208 | `PROGRESS.md` (as before) |
| Claude (Cowork, parallel agents) | **odd** batches: 059, 061, 063 … 207 | `PROGRESS-claude.md` |

Rules:
- Never write, edit or gate the other side's batch files.
- Claude's agents write `outputs/batch_NNN.json` (odd NNN), gate them with gate-4.4 until they pass, and log each one in `PROGRESS-claude.md` with status `gated, not imported`.
- **Importing stays with the Base44 AI** (it has the data tools): at the start of each turn, import every batch in `PROGRESS-claude.md` marked `gated, not imported` (same upsert rule: word_id + sense_label, approved:false, gate flags attached), then change its status to `imported` in `PROGRESS-claude.md`.
- The every-5-batches full re-check (`gate_all_outputs.py`) covers both sides' files.
