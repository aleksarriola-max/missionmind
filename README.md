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
