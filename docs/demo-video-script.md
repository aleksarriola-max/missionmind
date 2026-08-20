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
