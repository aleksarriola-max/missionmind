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
