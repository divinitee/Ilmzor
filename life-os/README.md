# LIFE OS

A local-first personal operating system. It connects **direction** (mission → goals → objectives), **systems** (domains, recurring responsibilities, habits), **projects**, **next actions**, **waiting items**, and the **resources** they all compete for (time, money, energy, attention).

It is self-contained in this folder and independent of the VIRORA app in the rest of the repository.

## Use it

Open **`Life-OS.html`** in a browser. It is a single file with no server, no account and no network access. Data stays in your browser's localStorage. Export it regularly from **⋯ Data & settings → Export JSON**.

On first run, a five-question setup asks for your mission, domains, current focus, constraints and current projects. You can also load an example system, import a JSON export, or import data from the V3 prototype if the browser still holds it.

| Key | Action |
| --- | --- |
| `/` or `⌘K` | Search everything / command palette |
| `N` | New item (context-aware: a project under the selected domain, an action under the selected project, …) |
| `1`–`8` | Map · Today · Week · Goals · Projects · Waiting · Capacity · Review |
| `F` / `+` / `−` | Fit / zoom the map |
| `E` or `Enter` | Expand/collapse the selected node |
| `Esc` | Close dialog → cancel link → deselect → close inspector |

## Develop

```bash
# edit life-os/src/** and life-os/styles.css, then rebuild the single-file app
node life-os/build.mjs

# during development, serve the folder so native ES modules load (file:// blocks them)
npx serve life-os        # then open /index.html

# end-to-end acceptance test (Playwright)
node life-os/build.mjs && node life-os/tests/acceptance.cjs
```

`build.mjs` has no dependencies. It inlines `styles.css` and the module graph into `Life-OS.html`. The source uses only named `import { … }`, `import * as`, and `export function|const|class`, and the build rejects anything else and any circular import.

## Architecture

```
src/
  util.js          dates, escaping, text wrapping, file helpers
  schema.js        entity types, horizons, statuses, relationship types, migrations  ← data contract
  store.js         the document, id index, CRUD, cascade delete, persistence, change events
  model.js         business logic: why-chain, impact (upstream/downstream), flags,
                   progress, capacity & conflicts, today/week selectors, search
  seed.js          example system
  ui.js            view state (separate storage key) + event bus
  graph/layout.js  visibility per mode, radial tree layout, relative drag offsets, edge lifting
  graph/graph.js   SVG renderer: keyed nodes/edges, tweened motion, camera, pointer input
  ui/              inspector, dialogs, command palette, field helpers, toast
  views/           today, week, goals, projects, waiting, capacity, review, onboarding
  app.js           shell, render loop, central action + binding handlers, keyboard
```

Dependencies only point downward, from `app` → `views/ui/graph` → `model` → `store` → `schema` → `util`. The store knows nothing about the UI. Swapping localStorage for a database means replacing `load`/`persist` in `store.js`.

Inputs persist through one mechanism: `data-bind="<id>|<field>"`. Typing saves live without re-rendering the field. Blur or change re-renders, and focus, caret, scroll and half-typed text are preserved.

## Data model (schema v1)

```jsonc
{
  "schemaVersion": 1,
  "meta": { "onboardedAt": "…", "lastReviewAt": "…" },
  "mission": { "statement": "…", "vision": "…", "focus": "…", "focusAreaId": "…" },
  "settings": { "weeklyHours": 74, "dailyHours": 11, "currency": "" },
  "areas": [], "goals": [], "objectives": [], "projects": [], "tasks": [],
  "responsibilities": [], "habits": [], "waiting": [], "resources": [],
  "constraints": [], "people": [], "relationships": [], "allocations": [], "reviews": [],
  "days": {},                    // daily shutdown log
  "layout": { "offsets": {} }    // your dragged node positions, relative to parent
}
```

Following the architecture brief, there are two hierarchies that meet at actions:

```
MISSION ─┬─ GOAL (long-term, 3-year) ── OBJECTIVE (annual → quarterly → monthly → weekly) ─┐
         └─ AREA (domain) ── PROJECT (── sub-project) ─────────────────────────────────────┴─ ACTION ── TIME
```

- **Why-chain.** Every item has one "why" parent. For a task: project → objective → area. For a project: parent project → objective → area. For objectives and goals: parent → area. Walking it up gives the breadcrumb *Mission → Finance Career → Enter the Finance industry → Obtain first role → Job Search → Finance CV → Rewrite experience section*. A task that doesn't connect to anything is flagged "not connected".
- **Relationships** are first-class records `{ from, to, kind, note }`. They are always directed upstream → downstream. `competes` and `related` are the only symmetric kinds. Kinds: `enables`, `supports`, `builds`, `funds`, `produces`, `requires` (resource dependency), `blocks` (dependency), `constrains`, `competes`, `related`.
- **Next action** is an explicit flag on one open task per project. Completing it promotes the next open task. An active project with no next action, no waiting item and no active sub-projects is flagged ⚠ everywhere.
- **Capacity.** *Available = committable hours − fixed commitments* (from recurring responsibilities). Allocations give time budgets to domains, projects or a buffer, and a project allocation can be split (for example 3h engineering / 3h product / 2h content / 2h QA). A domain is **over** when its projects claim more than its budget, or its next actions' estimates exceed it. The whole plan is **OVERALLOCATED** when allocations exceed available hours; that is never silently accepted. Money uses inflows and outflows; energy and attention use a percentage of capacity.
- **Migrations.** `schema.js` `migrate()` upgrades step by step. Step 0 → 1 converts the V3 prototype's flat node array. Imports with a newer schema are refused with a message.

## Graph

- **Visual grammar (shape before colour).** Domain: large ring. Goal: concentric target. Objective: ring with a progress arc. Project: card with an accent bar, next-action line and progress bar. Action: pill with a checkbox. Waiting: dashed amber pill. Responsibility: ↻ tile. Habit: progress ring. Resource: hexagon. Constraint: triangle.
- **Modes.**
  - *Structure*: hierarchy, plus the quiet "who helps whom" layer.
  - *Relationships*: every typed edge, labelled.
  - *Resources*: flows for one resource at a time, width proportional to hours or amount.
  - *Execution*: only active projects, their next actions and blockers.
- **Interaction.** Click to inspect. Double-click to expand or collapse (branches animate out and in). Drag a node to move it; its subtree follows and the position persists. Wheel zooms around the cursor. Drag empty space to pan. Click a line for its explanation.
- **Selection.** The selected node lights its whole why-path back to the mission in mint, and dims everything unrelated. Searching for an item frames that entire path.
- **Edge lifting.** Relationships between items hidden in collapsed branches are lifted to the nearest visible ancestor (dashed), so cross-domain dependencies stay visible.

## What changed from V3 (audit)

**Bugs fixed.**
- `viewBox 1600×900` with `preserveAspectRatio="none"` distorted the graph and broke pan, zoom and drag maths on any non-16:9 window.
- A full DOM rebuild on every click destroyed the node under the cursor, so double-click to expand rarely fired.
- The "Deep Work" goal, parented to a resource, never received a position. That forced a re-layout on every load, which wiped dragged positions.
- Search hid matches inside collapsed domains.
- `/` and `0` shortcuts fired while typing in fields.
- Tasks were placed on a fixed grid instead of near their parent.

**Architecture.** The flat `nodes[]` array with untyped, duplicated `links` became typed collections plus first-class relationships. Hardcoded capacity, mission and focus became data. Regex-based "open loops" became a real waiting and next-action model. Import and export are versioned and migrated. A single script became layered modules.

**Dead UI replaced.**
- The *Execution* mode only recoloured lines; it now shows the execution map, plus Today and Week views.
- *Goals* and *Projects* were just node filters; they are now real views.
- The parent picker only listed domains; tasks can now belong to projects.

## Not built yet (on purpose)

No backend, sync, accounts, notifications or AI, per the brief. Candidates for the next iteration:
- Calendar time blocks: fixed commitments have days and times, but tasks are not yet scheduled into hour slots.
- Recurring tasks that are not fixed commitments.
- Person-centric views.
- A mobile layout that is more than responsive.
