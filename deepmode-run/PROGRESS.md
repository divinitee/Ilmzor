# Deep Mode run: progress log

| batch | maps | first-pass FAILs | final | notes |
|---|---|---|---|---|
| 001–052, 209 | 524 | 122 maps had ≥1 FAIL (missing form 36, bad synonym 33, bad example 28, …) | all pass gate-4.2 | Done by Claude in Cowork. Delivered to Tee as deepmode-maps-done-599.json together with the 75 pilot/regression maps. |
| done-599 import | 599 | – | – | Base44 AI, 2026-10-06: imported into WordFamily: 599 created, 0 updated, 0 rejected (approved:false). |
| 053 | 10 | 4 of 10 maps: missing form 1 (societal), false affix 1 (sociable -able), bad example 2 (context forms), wrong morphology 1 (spice marked conversion) | all pass gate-4.2 | Base44 AI. Imported: 10 created, approved:false, gate flags attached. |
| infra | – | – | – | Claude, 2026-10-06: gate-4.3. Dependencies vendored in deepmode-run/vendor (no pip/npm needed after sandbox resets). Re-checked: examples 4/4, batch 053 10/10 pass; batch 054 has 9 maps with FAILs to fix. |
| 054 | 10 | 9 of 10 maps: synonym/related strength mismatch 6, bad example/context 5, self-defining definition 2, family-as-synonym 2, wrong morphology 2 (strange base, striped participial), headword not in own slot 1 (stranger), false affix 1 (-age), missing form 1 (stamp: post → not_family), non-word antonym 1 (unstamped) | all pass gate-4.3 (round 2) | Base44 AI. Imported: 10 created, approved:false, 22 gate flags attached. |
| 055 | 11 | 3 of 11 maps: missing form 2 (suit ×2: sue → not_family), bad example 1 (stuff context 1 sentence), wrong POS 1 (sucker as adjective, removed) | all pass gate-4.3 (round 2) | Base44 AI. suit split into 2 maps (be right / clothes). Imported: 11 created, approved:false, 13 per-map gate flags attached. |