# Adaptive Mission Briefing (Design)

**Date:** 2026-08-03
**Project:** MissionMind (IBM Bob AI Challenge — "Advance Space Exploration with AI", August Challenge)
**Status:** Approved design, pending implementation plan

## 1. Goal

Give MissionMind a sharp, judge-facing story instead of a generic "mission ops platform"
pitch. Two specific, underserved audiences currently locked out of mission telemetry —
the small/solo team running a mission with no 24/7 ops room, and the public watching a
mission they can't parse — get one Granite-powered briefing engine, at two depths, as the
app's new front door. The existing 13-page console stays intact behind it as the "depth"
story. This also produces the positioning artifacts (README, demo video script) the
judging criteria actually reward: Real-World Impact, Challenge Fit, and a demo that's
legible in three minutes.

## 2. Scope

**In scope**
- One briefing engine (`src/services/missionBriefing.js`) that reduces existing mission
  data to a structured state, and renders it via Granite at two depths: an Operator Brief
  and a Public Digest.
- A new landing page (`src/pages/MissionBriefing.jsx`) at `/`, with a mode toggle and a CTA
  into the existing console (moved to `/dashboard`).
- README restructured into the judge-facing format (Problem / Solution / AI Approach /
  Real-World Impact / How to Run), with real, source-cited impact figures.
- A 3-minute demo video script (`docs/demo-video-script.md`).
- Unit tests for the deterministic parts of the briefing engine.

**Out of scope**
- Any site-wide "plain-language" re-skin of the other 13 pages. Public Mode only
  simplifies the landing brief's own text; everyone sees the same professional console
  once they click through.
- Session/"since you last checked in" delta tracking (localStorage timestamps, etc.) — the
  brief summarizes current mission state, not a literal diff since a prior visit. The
  narrative language can imply a handoff without the app tracking real session history.
- Any change to `granite.js`, `graniteProxy.js`, or the existing 13 pages' internals.

## 3. Architecture

```
src/data/{anomalies,missions}.js  (existing, unchanged)
            │
            ▼
summarizeMissionState()  ── pure function ──▶  structured mission-state object
            │
            ├──▶ OPERATOR_BRIEF_SYSTEM_PROMPT ──┐
            │                                    ├──▶ generate() (existing granite.js)
            └──▶ PUBLIC_DIGEST_SYSTEM_PROMPT ───┘         │
                                                            ▼
                                              MissionBriefing.jsx renders
                                              text + AiSourceBadge, mode toggle,
                                              CTA → /dashboard
```

One structured summary feeds both prompts and both fallbacks — the "one engine, two
audiences" story is real, not just a UI toggle wearing two labels.

## 4. Components

### 4.1 `src/services/missionBriefing.js`

- **`summarizeMissionState()`** — pure function. Reads `ACTIVE_ANOMALY` and
  `ROOT_CAUSE_HYPOTHESES` from `data/anomalies.js`, `AUTONOMY_DECISIONS` and
  `PLAN_ACTIVITIES` from `data/missions.js`. Returns one structured object: active anomaly
  (title, severity), top root-cause hypothesis (label, confidence), autonomy decision count
  and intent-drift count, and a plan-status breakdown (completed/missed/delayed/unplanned
  counts). No network, no side effects — this is the single source of truth for everything
  downstream.
- **`OPERATOR_BRIEF_SYSTEM_PROMPT`** — grounds Granite as a terse, technical shift-handoff
  assistant: what changed, what needs a decision now, addressed to an operator who already
  knows the domain vocabulary.
- **`PUBLIC_DIGEST_SYSTEM_PROMPT`** — grounds Granite as a plain-language mission storyteller:
  no acronyms, no jargon, told as "here's what's happening on this mission right now."
- **`buildOperatorBrief(state)`** / **`buildPublicDigest(state)`** — deterministic template
  strings built from the same structured state, used as the `fallback` argument to
  `generate()`. Mirrors the `matchTopic` pattern already established for Knowledge Brain in
  Phase 0, so the "never break a live demo" guarantee applies here for free.

### 4.2 `src/pages/MissionBriefing.jsx`

- Mode toggle (Operator / Public), defaulting to Operator.
- Calls `generate(JSON.stringify(summarizeMissionState()), { system: <mode prompt>,
  fallback: () => <mode template>(state) })` from the existing `src/services/granite.js` —
  no changes to that service.
- Renders the returned text with `<AiSourceBadge source={getLastSource()} />`.
- Re-entry guard on mode switching (`if (loading) return;` at the top of the handler),
  same pattern as the Knowledge Brain double-click fix from Phase 0.
- CTA button: "Enter Mission Control →", navigates to `/dashboard`.

### 4.3 `src/App.jsx` changes

- Add `MissionBriefing` to the lazy-loaded page imports.
- `/` renders `MissionBriefing` instead of `Dashboard`.
- New `/dashboard` route renders the existing `Dashboard` component, unchanged internally.
- `NAV_GROUPS`: first CORE OPS entry becomes "Mission Briefing" → `/`; "Mission Dashboard" →
  `/dashboard` added immediately after it. No other nav changes.

## 5. Real-World Impact & Positioning Artifacts

- **README overhaul** — restructured into: Problem Statement, Solution, AI Approach &
  Architecture (including how IBM Bob was used), Real-World Impact, How to Run. Leads with
  the human problem for both personas, not the tech stack.
- **Real-world impact numbers** — no fabricated statistics. Before this section is written,
  a research pass finds real, citable figures: how many CubeSat/smallsat missions are
  student- or volunteer-run (e.g. the nanosats.eu tracking database), and real public
  viewership numbers for a past NASA mission livestream (e.g. a landing broadcast). Both go
  in the README with their source linked.
- **Demo video script** (`docs/demo-video-script.md`) — 0:00–0:30 cold open on the two
  personas' problem, 0:30–1:30 live demo of the mode toggle and both briefs, 1:30–2:30 the
  IBM Bob/Granite architecture in plain terms, 2:30–3:00 the impact numbers. A script to
  record from, not a produced video.

## 6. Error Handling

Nothing new. Mode switching reuses `generate()`'s existing three-trigger fallback (mock
mode / unconfigured / failure-or-timeout), so a killed proxy or missing `.env` during a
live demo still renders a sensible, correctly-labeled `SIMULATED` brief.

## 7. Testing

- `src/services/missionBriefing.test.js` — `summarizeMissionState()` correctly extracts and
  aggregates from the existing data (including the intent-drift and missed-activity cases
  already present); `buildOperatorBrief()`/`buildPublicDigest()` produce the expected
  deterministic output shape for that state.
- `MissionBriefing.jsx` page wiring is verified manually in-browser (mode toggle, badge,
  CTA), same pattern used for Knowledge Brain in Phase 0 — not unit tested, since it's UI
  glue over an already-tested service.

## 8. Success Criteria

1. Landing on `/` shows the Operator Brief by default, generated from real mission data,
   with a correct `GRANITE`/`SIMULATED` badge.
2. Toggling to Public Mode re-renders a plain-language digest of the same mission state,
   no jargon, same badge behavior.
3. "Enter Mission Control →" takes the user to the unchanged 13-page console at
   `/dashboard`.
4. With no `.env`, both modes still render a sensible, correctly-labeled `SIMULATED` brief —
   no error, no broken UI.
5. README leads with the two personas' problems and cites real, sourced impact figures.
6. `npm run lint`, `npm test`, and `npm run build` all pass.
