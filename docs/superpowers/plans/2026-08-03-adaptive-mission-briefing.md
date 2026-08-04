# Adaptive Mission Briefing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give MissionMind a new landing page — one Granite-powered briefing engine that renders at two depths (Operator Brief / Public Digest) from the same mission state — plus the judge-facing positioning artifacts (README, demo video script) that go with it.

**Architecture:** A pure `summarizeMissionState()` function reduces existing simulated mission data into one structured object. Two system prompts turn that same object into two genuinely different depths of explanation via the existing `generate()` client service (unchanged). A new landing page at `/` renders whichever depth is selected, with a CTA into the unchanged 13-page console (moved to `/dashboard`).

**Tech Stack:** React 19, Vite, Tailwind CSS, React Router v7, Vitest — all already in place. No new dependencies.

## Global Constraints

- No new npm dependencies — reuse `react-router-dom`'s `useNavigate`, `lucide-react`'s existing icon set (one new icon import is fine, same package), and the existing `granite.js`/`AiSourceBadge` from Phase 0.
- Do not modify `src/services/granite.js`, `server/graniteProxy.js`, or any of the other 13 existing pages' internals.
- Every commit message ends with the trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- All work happens in `C:\Users\aleks\missionmind`, on branch `adaptive-mission-briefing` off `main`. `npm run lint`, `npm test`, and `npm run build` must all pass at the end.
- Follow the existing codebase's Tailwind arbitrary-value color convention (e.g. `text-[#22d3ee]`, `bg-[#22d3ee22]`) — the colors used in this plan (`#22d3ee`, `#64748b`, `#1e2d55`) are already covered by the `@source inline(...)` allowlist in `src/index.css`, so no new allowlist entries are needed.

---

## File Structure

- Create `src/services/missionBriefing.js` — mission-state summarizer, two system prompts, two deterministic fallback templates.
- Create `src/services/missionBriefing.test.js` — unit tests for the above.
- Create `src/pages/MissionBriefing.jsx` — the new landing page.
- Modify `src/App.jsx` — mount `MissionBriefing` at `/`, move `Dashboard` to `/dashboard`, update `NAV_GROUPS`.
- Modify `README.md` — full restructure into the judge-facing format with sourced real-world impact figures.
- Create `docs/demo-video-script.md` — 3-minute video script.

---

## Task 0: Create feature branch

**Files:** none (branch operation only)

- [ ] **Step 1: Create and switch to the feature branch**

Run:
```bash
cd /c/Users/aleks/missionmind && git checkout -b adaptive-mission-briefing
```
Expected: `Switched to a new branch 'adaptive-mission-briefing'`

---

## Task 1: Mission briefing engine

**Files:**
- Create: `src/services/missionBriefing.js`
- Test: `src/services/missionBriefing.test.js`

**Interfaces:**
- Consumes: `ACTIVE_ANOMALY`, `ROOT_CAUSE_HYPOTHESES` from `../data/anomalies.js`; `AUTONOMY_DECISIONS`, `PLAN_ACTIVITIES` from `../data/missions.js` (all pre-existing, unchanged).
- Produces:
  - `summarizeMissionState() → { anomaly: {title, severity, summary}, topHypothesis: {label, confidence}, autonomy: {decisionCount, intentDriftCount}, plan: {completed, missed, delayed, unplanned, pending} }`
  - `OPERATOR_BRIEF_SYSTEM_PROMPT`, `PUBLIC_DIGEST_SYSTEM_PROMPT` — string constants.
  - `buildOperatorBrief(state) → string`, `buildPublicDigest(state) → string`.

- [ ] **Step 1: Write the failing tests for `summarizeMissionState`**

Create `src/services/missionBriefing.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { summarizeMissionState } from './missionBriefing.js';

describe('summarizeMissionState', () => {
  it('extracts the active anomaly title and severity', () => {
    const state = summarizeMissionState();
    expect(state.anomaly.title).toBe('Solar Array Power Degradation');
    expect(state.anomaly.severity).toBe('critical');
  });

  it('picks the highest-confidence root cause hypothesis', () => {
    const state = summarizeMissionState();
    expect(state.topHypothesis.label).toBe('Partial Solar Panel Shadowing');
    expect(state.topHypothesis.confidence).toBe(0.72);
  });

  it('counts autonomy decisions and intent drift', () => {
    const state = summarizeMissionState();
    expect(state.autonomy.decisionCount).toBe(3);
    expect(state.autonomy.intentDriftCount).toBe(1);
  });

  it('breaks down plan activity status counts', () => {
    const state = summarizeMissionState();
    expect(state.plan.completed).toBe(3);
    expect(state.plan.missed).toBe(1);
    expect(state.plan.delayed).toBe(1);
    expect(state.plan.unplanned).toBe(1);
    expect(state.plan.pending).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/services/missionBriefing.test.js`
Expected: FAIL — module `./missionBriefing.js` not found.

- [ ] **Step 3: Implement `summarizeMissionState`**

Create `src/services/missionBriefing.js`:
```js
// src/services/missionBriefing.js
// Reduces live mission data to one structured summary. Both briefing depths
// (operator, public) render from this same object via different prompts —
// they never read the raw data files directly.
import { ACTIVE_ANOMALY, ROOT_CAUSE_HYPOTHESES } from '../data/anomalies.js';
import { AUTONOMY_DECISIONS, PLAN_ACTIVITIES } from '../data/missions.js';

export function summarizeMissionState() {
  const topHypothesis = [...ROOT_CAUSE_HYPOTHESES].sort((a, b) => b.confidence - a.confidence)[0];
  const intentDriftCount = AUTONOMY_DECISIONS.filter((d) => !d.aligned).length;
  const planStatusCounts = PLAN_ACTIVITIES.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return {
    anomaly: {
      title: ACTIVE_ANOMALY.title,
      severity: ACTIVE_ANOMALY.severity,
      summary: ACTIVE_ANOMALY.summary,
    },
    topHypothesis: {
      label: topHypothesis.label,
      confidence: topHypothesis.confidence,
    },
    autonomy: {
      decisionCount: AUTONOMY_DECISIONS.length,
      intentDriftCount,
    },
    plan: {
      completed: planStatusCounts.completed || 0,
      missed: planStatusCounts.missed || 0,
      delayed: planStatusCounts.delayed || 0,
      unplanned: planStatusCounts.unplanned || 0,
      pending: planStatusCounts.pending || 0,
    },
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/services/missionBriefing.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing tests for the prompts and fallback templates**

Append to `src/services/missionBriefing.test.js`:
```js
import {
  OPERATOR_BRIEF_SYSTEM_PROMPT,
  PUBLIC_DIGEST_SYSTEM_PROMPT,
  buildOperatorBrief,
  buildPublicDigest,
} from './missionBriefing.js';

describe('system prompts', () => {
  it('grounds the operator prompt as a shift-handoff assistant', () => {
    expect(OPERATOR_BRIEF_SYSTEM_PROMPT).toContain('shift-handoff');
  });

  it('grounds the public prompt as a plain-language storyteller', () => {
    expect(PUBLIC_DIGEST_SYSTEM_PROMPT).toContain('plain language');
  });
});

describe('buildOperatorBrief', () => {
  it('includes the anomaly, hypothesis, drift note, and plan counts', () => {
    const state = summarizeMissionState();
    const brief = buildOperatorBrief(state);
    expect(brief).toContain('Solar Array Power Degradation');
    expect(brief).toContain('CRITICAL');
    expect(brief).toContain('Partial Solar Panel Shadowing');
    expect(brief).toContain('72% confidence');
    expect(brief).toContain('intent drift');
    expect(brief).toContain('3 completed');
  });

  it('reports full alignment when there is no intent drift', () => {
    const state = summarizeMissionState();
    const aligned = { ...state, autonomy: { decisionCount: 2, intentDriftCount: 0 } };
    const brief = buildOperatorBrief(aligned);
    expect(brief).toContain('All 2 autonomy decisions are aligned');
  });
});

describe('buildPublicDigest', () => {
  it('describes the situation in plain language', () => {
    const state = summarizeMissionState();
    const digest = buildPublicDigest(state);
    expect(digest).toContain('ARES-7');
    expect(digest).toContain('solar array power degradation');
    expect(digest).toContain('partial solar panel shadowing');
    expect(digest).toContain('double-check');
  });

  it('reports the AI making sound calls when there is no intent drift', () => {
    const state = summarizeMissionState();
    const aligned = { ...state, autonomy: { decisionCount: 2, intentDriftCount: 0 } };
    const digest = buildPublicDigest(aligned);
    expect(digest).toContain('sound calls');
  });
});
```

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run src/services/missionBriefing.test.js`
Expected: FAIL — `OPERATOR_BRIEF_SYSTEM_PROMPT` (and the other three) not exported.

- [ ] **Step 7: Implement the prompts and fallback templates**

Append to `src/services/missionBriefing.js`:
```js
export const OPERATOR_BRIEF_SYSTEM_PROMPT =
  'You are the MissionMind shift-handoff assistant for the ARES-7 Mars Orbiter (Sol 412). ' +
  'Write a concise operator briefing: what changed, what needs a decision now, and what can ' +
  'wait. Address the reader as a mission operator who already knows the domain vocabulary — ' +
  'do not explain basic terms. Be specific and actionable, not vague.';

export const PUBLIC_DIGEST_SYSTEM_PROMPT =
  'You are a mission storyteller explaining the ARES-7 Mars Orbiter mission (Sol 412) to a ' +
  'member of the public with no space engineering background. Explain what is happening on ' +
  'the mission right now in plain language, like a short news update. Do not use acronyms, ' +
  'jargon, or technical unit names without explaining them in everyday terms. Keep it warm ' +
  'and engaging, not alarming.';

export function buildOperatorBrief(state) {
  const driftNote = state.autonomy.intentDriftCount > 0
    ? `${state.autonomy.intentDriftCount} of ${state.autonomy.decisionCount} autonomy decisions show intent drift — review before next shift.`
    : `All ${state.autonomy.decisionCount} autonomy decisions are aligned with operator intent.`;
  return `ACTIVE: ${state.anomaly.title} (${state.anomaly.severity.toUpperCase()}). ` +
    `Leading hypothesis: ${state.topHypothesis.label} (${Math.round(state.topHypothesis.confidence * 100)}% confidence). ` +
    `${driftNote} ` +
    `Plan status: ${state.plan.completed} completed, ${state.plan.delayed} delayed, ${state.plan.missed} missed, ${state.plan.unplanned} unplanned, ${state.plan.pending} pending.`;
}

export function buildPublicDigest(state) {
  const driftNote = state.autonomy.intentDriftCount > 0
    ? `The spacecraft's onboard AI has made a call the ground team will want to double-check.`
    : `The spacecraft's onboard AI is making sound calls on its own.`;
  return `Right now, ARES-7 is dealing with a power issue: ${state.anomaly.title.toLowerCase()}. ` +
    `Engineers think the most likely cause is ${state.topHypothesis.label.toLowerCase()}. ` +
    `${driftNote} ` +
    `Of today's planned activities, ${state.plan.completed} have gone as planned and ${state.plan.missed + state.plan.delayed} were affected by the issue.`;
}
```

- [ ] **Step 8: Run to verify pass**

Run: `npx vitest run src/services/missionBriefing.test.js`
Expected: PASS (10 tests total: 4 from Step 1 + 2 system-prompt + 2 buildOperatorBrief + 2 buildPublicDigest).

- [ ] **Step 9: Run the full test suite (no regressions)**

Run: `npm test`
Expected: PASS — `analytics.test.js` (19), `graniteProxy.test.js` (15), `granite.test.js` (8), `missionBriefing.test.js` (10), 52 tests total, all green.

- [ ] **Step 10: Confirm lint passes**

Run: `npx eslint .`
Expected: exit 0.

- [ ] **Step 11: Commit**

```bash
git add src/services/missionBriefing.js src/services/missionBriefing.test.js
git commit -m "feat(briefing): mission-state summarizer with operator/public prompts and fallbacks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Landing page and routing

**Files:**
- Create: `src/pages/MissionBriefing.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `summarizeMissionState`, `OPERATOR_BRIEF_SYSTEM_PROMPT`, `PUBLIC_DIGEST_SYSTEM_PROMPT`, `buildOperatorBrief`, `buildPublicDigest` (from Task 1); `generate`, `getLastSource` (from `../services/granite.js`, unchanged); `AiSourceBadge`, `TopBar`, `Panel` (existing components, unchanged).
- Produces: the `/` route rendering `MissionBriefing`; `/dashboard` rendering the existing `Dashboard`.

This task has no new automated tests — it's UI wiring verified manually in-browser, the same pattern used for Knowledge Brain in Phase 0.

- [ ] **Step 1: Create the landing page**

Create `src/pages/MissionBriefing.jsx`:
```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar.jsx';
import Panel from '../components/Panel.jsx';
import AiSourceBadge from '../components/AiSourceBadge.jsx';
import { generate, getLastSource } from '../services/granite.js';
import {
  summarizeMissionState,
  OPERATOR_BRIEF_SYSTEM_PROMPT,
  PUBLIC_DIGEST_SYSTEM_PROMPT,
  buildOperatorBrief,
  buildPublicDigest,
} from '../services/missionBriefing.js';

const MODES = {
  operator: { label: 'Operator Brief', system: OPERATOR_BRIEF_SYSTEM_PROMPT, fallback: buildOperatorBrief },
  public: { label: 'Public Digest', system: PUBLIC_DIGEST_SYSTEM_PROMPT, fallback: buildPublicDigest },
};

export default function MissionBriefing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('operator');
  const [brief, setBrief] = useState('');
  const [source, setSource] = useState('simulated');
  const [loading, setLoading] = useState(false);

  function runBriefing(nextMode) {
    setLoading(true);
    setBrief('');
    const state = summarizeMissionState();
    const cfg = MODES[nextMode];
    generate(JSON.stringify(state), {
      system: cfg.system,
      fallback: () => cfg.fallback(state),
    }).then((text) => {
      setBrief(text);
      setSource(getLastSource());
      setLoading(false);
    });
  }

  // Runs once on mount to render the default (operator) brief immediately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { runBriefing('operator'); }, []);

  function selectMode(nextMode) {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    runBriefing(nextMode);
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mission Briefing — ARES-7" />
      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        <Panel title="Adaptive Mission Briefing" className="max-w-[720px] w-full">
          <div className="flex gap-2 mb-4">
            {Object.entries(MODES).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => selectMode(key)}
                className={`flex-1 py-2 rounded-[5px] text-[12px] font-semibold border cursor-pointer ${mode === key ? 'bg-[#162040] border-[#22d3ee44] text-[#22d3ee]' : 'bg-[#0a1020] border-[#1e2d55] text-[#64748b]'}`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {loading && <div className="text-[12px] text-[#22d3ee] mb-4">⏳ Generating briefing…</div>}
          {brief && !loading && (
            <div className="bg-[#071220] border border-[#22d3ee33] rounded-[5px] p-4 text-[13px] text-[#94a3b8] leading-[1.7] mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-[#22d3ee] tracking-[1px]">{MODES[mode].label.toUpperCase()}</span>
                <AiSourceBadge source={source} />
              </div>
              <p>{brief}</p>
            </div>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-[#162040] border border-[#22d3ee44] rounded-[5px] py-3 text-[13px] font-semibold text-[#22d3ee] cursor-pointer"
          >
            Enter Mission Control →
          </button>
        </Panel>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `App.jsx`**

In `src/App.jsx`:

(a) Add `FileText` to the `lucide-react` import (alongside the existing icons):
```jsx
import { LayoutDashboard, AlertTriangle, Brain, GitCompare, Calendar, BookOpen, Satellite, Activity, FlaskConical, RotateCcw, Radio, BarChart3, MapPin, Users, FileText } from 'lucide-react';
```

(b) Add the lazy import, alongside the existing page imports:
```jsx
const MissionBriefing = lazy(() => import('./pages/MissionBriefing.jsx'));
```

(c) In `NAV_GROUPS`, replace the first `CORE OPS` entry:
```jsx
{ to: '/',          icon: LayoutDashboard, label: 'Mission Dashboard' },
```
with:
```jsx
{ to: '/',          icon: FileText,        label: 'Mission Briefing' },
{ to: '/dashboard', icon: LayoutDashboard, label: 'Mission Dashboard' },
```

(d) In the `<Routes>` block inside `RoutedMain`, replace:
```jsx
<Route path="/"          element={<Dashboard />} />
```
with:
```jsx
<Route path="/"          element={<MissionBriefing />} />
<Route path="/dashboard" element={<Dashboard />} />
```

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev` (default port), open `http://localhost:5173/#/`.
Expected:
- The Operator Brief renders automatically, containing the anomaly title and a `SIMULATED` badge (no `.env` is configured).
- Clicking "Public Digest" re-renders in plain language, still `SIMULATED`.
- Clicking "Operator Brief" again switches back.
- Clicking "Enter Mission Control →" navigates to `/#/dashboard` and shows the original Mission Dashboard.
- The sidebar shows both "Mission Briefing" (active on `/`) and "Mission Dashboard" (active on `/dashboard`) as separate entries.
- No console errors.

Stop the dev server when done (this environment's Git Bash has no `pkill`; use `netstat -ano | grep 5173 | grep LISTENING` to find the PID, then `taskkill //F //PID <pid> //T`).

- [ ] **Step 4: Confirm lint and build**

Run: `npx eslint . && npm run build`
Expected: lint exit 0; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/MissionBriefing.jsx src/App.jsx
git commit -m "feat(briefing): add Adaptive Mission Briefing landing page

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: README overhaul

**Files:**
- Modify: `README.md`

No automated tests. Verification is a manual checklist against the required sections.

- [ ] **Step 1: Replace `README.md`**

Replace the entire contents of `README.md` with:

````markdown
# MissionMind — Explainable AI Mission Control

> Two audiences currently locked out of spaceflight telemetry — the small team running a
> mission with no 24/7 ops room, and the public watching a mission they can't parse — get
> one AI-generated briefing, at two depths.

**Hackathon:** IBM Bob AI Challenge — "Advance Space Exploration with AI" (August Challenge)
**Demo Mission:** ARES-7 Mars Orbiter, Sol 412

## Problem Statement

Space missions produce more telemetry than any one person can read in real time — and that
data currently serves almost nobody outside professional flight control.

- **Small teams have no ops room.** University teams have built and launched 763
  nanosatellites to date ([Nanosats Database](https://www.nanosats.eu/database)) — most
  flown by a handful of students taking shifts around classes, not a 24/7 mission control
  staff. When something goes wrong, there's no colleague down the hall to explain it.
- **The public watches, but can't follow.** 149.4 million people followed NASA's Artemis II
  mission across agency platforms in March–April 2026 alone
  ([NASA](https://www.nasa.gov/general/nasas-artemis-ii-breaks-agency-streaming-record/)) —
  but raw telemetry and acronym-heavy commentary leave most of that audience unable to
  understand what they're actually watching.

Both audiences need the same underlying mission understanding. Neither gets it today.

## Solution

MissionMind is an explainable AI mission-operations console. Its landing page, **Adaptive
Mission Briefing**, takes the same real-time mission state — active anomalies, autonomy
decisions, plan vs. actual — and generates it at two depths from one engine:

- **Operator Brief** — a terse shift-handoff summary for the person actually running the
  mission: what changed, what needs a decision now.
- **Public Digest** — a plain-language story of what's happening on the mission right now,
  no jargon, for anyone watching from outside.

Behind the briefing sits the full Mission Control console this project was originally built
around: anomaly investigation, autonomy explanation, Bayesian diagnosis, mission planning,
telemetry analytics, and more — all reachable with one click via "Enter Mission Control."

## AI Approach & Architecture

MissionMind was built with **IBM Bob** as the primary development tool.

- **IBM Granite** on watsonx.ai powers every explanation in the app — the mission briefing,
  the Knowledge Brain Q&A, and both briefing depths — through a local proxy that keeps the
  API key server-side and never in the browser.
- **One briefing engine, two prompts.** `summarizeMissionState()` reduces live mission data
  into a single structured object; two system prompts (`OPERATOR_BRIEF_SYSTEM_PROMPT`,
  `PUBLIC_DIGEST_SYSTEM_PROMPT`) generate two genuinely different depths of explanation from
  the *same* underlying facts — not two hardcoded copies.
- **Demo-safe by design.** Every AI call — briefing, Q&A, or otherwise — falls back to a
  deterministic, still-correct simulation if watsonx is unreachable, misconfigured, or in
  mock mode. An honesty badge always shows whether an answer is **GRANITE** (live) or
  **SIMULATED** (fallback), so nothing is ever silently wrong.

### Enabling IBM Granite (watsonx.ai)

1. Copy `.env.example` to `.env` and fill in your watsonx values
   (`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`).
2. `npm run dev` — that's it. Answers now show a **GRANITE** badge when live and
   **SIMULATED** when the fallback is used.
3. To force the reliable simulated path (e.g. for an offline demo), set
   `VITE_GRANITE_MODE=mock` in `.env`.

The API key stays server-side in the Node process and never reaches the browser.

## Challenge Theme Fit

Space Exploration — "Advance Space Exploration with AI." MissionMind directly targets the
challenge's own framing: turning mission operations "from data-heavy to insight-driven,"
and making space "more accessible and understandable" to both operators and the public.

## Real-World Impact

- **763 university-built nanosatellites** have flown with no dedicated ops staff
  ([Nanosats Database](https://www.nanosats.eu/database)) — MissionMind's Operator Brief is
  built for exactly this team.
- **149.4 million people** followed Artemis II across NASA's platforms in a single
  two-month window
  ([NASA](https://www.nasa.gov/general/nasas-artemis-ii-breaks-agency-streaming-record/)) —
  MissionMind's Public Digest is built for that audience, at the scale it actually exists.

## Pages

| Page | Route |
|------|-------|
| Mission Briefing (landing) | `/` |
| Mission Dashboard | `/dashboard` |
| Anomaly Investigation | `/anomaly` |
| Autonomy Explainer | `/autonomy` |
| Plan vs Actual | `/plan` |
| Mission Planner | `/planner` |
| Knowledge Brain | `/knowledge` |
| Telemetry Analytics | `/analytics` |
| Bayesian Diagnosis | `/bayes` |
| Mission Replay | `/replay` |
| Earth-Independent Ops | `/earthind` |
| Benchmark Mode | `/benchmark` |
| Rover Surface Ops | `/rover` |
| Multi-Agent Coordination | `/multiagent` |

## How to Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — the app runs entirely in the browser with simulated data
(HashRouter, no backend required beyond the local Granite proxy described above).

## Tech Stack

- React 19 + Vite + Tailwind CSS
- Recharts for all charts
- React Router v7 (HashRouter)
- Lucide React for icons
- IBM Granite on watsonx.ai (via local proxy), with full simulation fallback
- All telemetry, anomaly, and analytics data is simulated client-side in `src/data/`
````

- [ ] **Step 2: Verify required sections are present**

Run:
```bash
grep -c "^## " README.md
```
Expected: 8 (Problem Statement, Solution, AI Approach & Architecture, Challenge Theme Fit,
Real-World Impact, Pages, How to Run, Tech Stack — "Enabling IBM Granite" is a `###`
subsection under AI Approach & Architecture, not counted by this grep).

Manually confirm both citation links (`nanosats.eu` and `nasa.gov`) resolve to real pages by opening them, and confirm the `Pages` table lists all 14 routes defined in `src/App.jsx`'s `<Routes>` block (13 pages + NotFound is not listed, so 14 rows here since briefing + dashboard are now separate).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: restructure README around problem, solution, and sourced real-world impact

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Demo video script

**Files:**
- Create: `docs/demo-video-script.md`

- [ ] **Step 1: Write the script**

Create `docs/demo-video-script.md`:
```markdown
# Demo Video Script — MissionMind (3:00 max)

## 0:00–0:30 — The Problem (cold open, no slides)

Voiceover over B-roll / mission audio:

> "Somewhere, a five-person university team is running a satellite mission with no
> mission control room — just a laptop and a group chat. Somewhere else, millions of
> people are watching a NASA broadcast live, and most of them have no idea what the
> numbers on screen actually mean.
>
> Space missions produce more data than anyone can read. Almost none of it is built
> for the people who actually need it."

## 0:30–1:30 — Live Demo

- Open MissionMind at `/`. Show the **Operator Brief** rendering: point out the
  **GRANITE** badge, and read one sentence of the generated brief aloud.
- Click the **Public Digest** toggle. Show the same mission state rendering as a
  plain-language story — no jargon. Read one sentence aloud, contrast the tone with the
  Operator Brief.
- Click **Enter Mission Control →**. Show 2–3 of the pages behind it quickly
  (Anomaly Investigation, Autonomy Explainer) to establish depth.
- (Optional, if `.env` is configured for this recording) Kill the local proxy mid-demo
  to show the badge flip to **SIMULATED** with no broken UI — proves the "never break a
  live demo" design point in one shot.

## 1:30–2:30 — How It Works

Voiceover over a simple architecture diagram or screen annotations:

> "MissionMind was built with IBM Bob. Every explanation in the app — including this
> briefing — runs on IBM Granite through a local proxy that keeps the API key
> server-side.
>
> The briefing isn't two hardcoded scripts. One function reduces the mission's real
> state — anomalies, autonomy decisions, plan versus actual — into a single structured
> summary. Two system prompts turn that same summary into two genuinely different
> depths of explanation. And if watsonx is ever unreachable, every answer falls back to
> a deterministic simulation — the badge just tells you which one you're looking at."

## 2:30–3:00 — Real-World Impact

Voiceover over the two stats, shown on screen:

> "763 university-built nanosatellites have flown with no dedicated ops staff. 149
> million people followed NASA's Artemis II mission in a single two-month window this
> year. MissionMind is built for both of them — the team with no mission control room,
> and the public watching from outside it."

**End card:** MissionMind — built with IBM Bob.

## Recording Notes

- Keep the whole thing under 3:00 — the submission form enforces this as a hard cap.
- Record the live demo segment (0:30–1:30) in one continuous take if possible; cuts
  during a "does it actually work" moment read as suspicious to judges.
- Confirm the publicly-accessible video link works in an incognito window before
  submitting — a publicly accessible link is a stated submission requirement.
```

- [ ] **Step 2: Commit**

```bash
git add docs/demo-video-script.md
git commit -m "docs: add 3-minute demo video script

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
