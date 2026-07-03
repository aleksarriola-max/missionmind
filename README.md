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
