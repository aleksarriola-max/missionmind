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
