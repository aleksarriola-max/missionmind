# MissionMind — Explainable AI Mission Control

> A mission-operations copilot that transforms telemetry, anomalies, autonomy decisions, and mission plans into grounded human understanding.

**Hackathon:** IBM Bob AI Challenge — "Advance Space Exploration with AI"
**Demo Mission:** ARES-7 Mars Orbiter, Sol 412

## What It Does

MissionMind is an explainable AI copilot for mission operations teams, covering telemetry monitoring, anomaly investigation, autonomy explanation, mission planning, and Earth-independent operations support across 11 pages.

| Page | Route |
|------|-------|
| Mission Dashboard | `/` |
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

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — the app runs entirely in the browser with simulated data (HashRouter, no backend required).

## Tech Stack

- React 19 + Vite + Tailwind CSS (CDN)
- Recharts for all charts
- React Router v7 (HashRouter)
- Lucide React for icons
- All telemetry, anomaly, and analytics data is simulated client-side in `src/data/`

## Enabling IBM Granite (watsonx.ai)

MissionMind's AI features call **IBM Granite** on watsonx.ai through a local proxy
(the Vite dev server); the app falls back to a built-in simulation whenever the
proxy is unconfigured or unreachable, so it always runs.

1. Copy `.env.example` to `.env` and fill in your watsonx values
   (`WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`).
2. `npm run dev` — that's it. Answers now show a **GRANITE** badge when live and
   **SIMULATED** when the fallback is used.
3. To force the reliable simulated path (e.g. for an offline demo), set
   `VITE_GRANITE_MODE=mock` in `.env`.

The API key stays server-side in the Node process and never reaches the browser.
