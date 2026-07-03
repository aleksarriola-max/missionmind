import { describe, it, expect } from 'vitest';
import {
  zScore,
  ewma,
  iqrOutliers,
  linearRegression,
  pearsonCorrelation,
  predictTimeToLimit,
  bayesianScore,
  runAllDetectors,
} from './analytics.js';

// Build a {t, v}[] series from a bare array of values.
const mk = (vals) => vals.map((v, i) => ({ t: i * 60000, v }));

describe('zScore', () => {
  it('computes mean, std and standardized values', () => {
    const out = zScore(mk([1, 2, 3, 4, 5]));
    expect(out[0].mean).toBe(3);
    // population std of 1..5 = sqrt(2)
    expect(out[0].std).toBeCloseTo(Math.SQRT2, 6);
    // z at v=5 = (5-3)/sqrt(2)
    expect(out[4].z).toBeCloseTo(2 / Math.SQRT2, 6);
    // symmetric endpoints
    expect(out[0].z).toBeCloseTo(-out[4].z, 6);
  });

  it('returns z=0 everywhere for a constant series (std=0 guard)', () => {
    const out = zScore(mk([7, 7, 7, 7]));
    expect(out.every((p) => p.z === 0)).toBe(true);
    expect(out[0].std).toBe(0);
  });
});

describe('ewma', () => {
  it('seeds on the first value and stays flat for a constant series', () => {
    const out = ewma(mk([5, 5, 5, 5]));
    expect(out[0].ewma).toBe(5);
    expect(out[out.length - 1].ewma).toBe(5);
    expect(out[out.length - 1].ewmaStd).toBe(0);
    expect(out[out.length - 1].ucl).toBe(5);
    expect(out[out.length - 1].lcl).toBe(5);
  });

  it('lags a step change (smoothed value between old and new)', () => {
    const out = ewma(mk([0, 0, 0, 10]), 0.15);
    const last = out[out.length - 1].ewma;
    expect(last).toBeGreaterThan(0);
    expect(last).toBeLessThan(10);
  });
});

describe('iqrOutliers', () => {
  it('flags a clear high outlier and nothing else', () => {
    const out = iqrOutliers(mk([10, 11, 12, 13, 14, 15, 16, 17, 18, 100]));
    const flagged = out.filter((p) => p.isOutlier).map((p) => p.v);
    expect(flagged).toEqual([100]);
  });
});

describe('linearRegression', () => {
  it('recovers slope/intercept exactly for a perfect line', () => {
    const out = linearRegression(mk([0, 2, 4, 6, 8])); // y = 2x
    expect(out.slope).toBeCloseTo(2, 10);
    expect(out.intercept).toBeCloseTo(0, 10);
    expect(out.r2).toBeCloseTo(1, 10);
    expect(out.rse).toBeCloseTo(0, 10);
  });

  it('produces a negative slope for a declining series', () => {
    const out = linearRegression(mk([10, 9, 8, 7, 6]));
    expect(out.slope).toBeCloseTo(-1, 10);
    expect(out.intercept).toBeCloseTo(10, 10);
  });
});

describe('pearsonCorrelation', () => {
  it('is +1 for identical series', () => {
    expect(pearsonCorrelation(mk([1, 2, 3, 4]), mk([1, 2, 3, 4]))).toBe(1);
  });

  it('is -1 for a perfectly inverse series', () => {
    expect(pearsonCorrelation(mk([1, 2, 3, 4]), mk([4, 3, 2, 1]))).toBe(-1);
  });

  it('returns 0 when one side has zero variance (den=0 guard)', () => {
    expect(pearsonCorrelation(mk([1, 2, 3]), mk([5, 5, 5]))).toBe(0);
  });
});

describe('predictTimeToLimit', () => {
  it('projects the number of steps to a downward limit', () => {
    // v = 10 - i, current estimate at last index = 6, limit 0 → 6 steps
    const pred = predictTimeToLimit(mk([10, 9, 8, 7, 6]), 0);
    expect(pred.already).toBe(false);
    expect(pred.minutes).toBeCloseTo(6, 6);
  });

  it('returns null for a flat trend (no limit risk)', () => {
    expect(predictTimeToLimit(mk([5, 5, 5, 5, 5]), 0)).toBeNull();
  });

  it('reports already-at-limit when the limit is behind the trend', () => {
    const pred = predictTimeToLimit(mk([10, 9, 8, 7, 6]), 8);
    expect(pred.already).toBe(true);
    expect(pred.minutes).toBe(0);
  });
});

describe('bayesianScore', () => {
  it('returns the prior unchanged when there is no evidence', () => {
    expect(bayesianScore(0.35, []).posterior).toBeCloseTo(0.35, 3);
  });

  it('leaves the posterior unchanged for neutral evidence (LR = 1)', () => {
    const r = bayesianScore(0.4, [{ pIfTrue: 0.5, pIfFalse: 0.5 }]);
    expect(r.posterior).toBeCloseTo(0.4, 3);
  });

  it('raises the posterior for supporting evidence (LR > 1)', () => {
    const r = bayesianScore(0.3, [{ pIfTrue: 0.9, pIfFalse: 0.3 }]);
    expect(r.posterior).toBeGreaterThan(0.3);
    expect(r.steps).toHaveLength(1);
    expect(r.steps[0].lr).toBeCloseTo(3, 3);
  });

  it('lowers the posterior for weakening evidence (LR < 1)', () => {
    const r = bayesianScore(0.6, [{ pIfTrue: 0.3, pIfFalse: 0.9 }]);
    expect(r.posterior).toBeLessThan(0.6);
  });

  it('stays finite when the prior is 0 or 1 (clamp guard)', () => {
    const lo = bayesianScore(0, []).posterior;
    const hi = bayesianScore(1, []).posterior;
    expect(Number.isFinite(lo)).toBe(true);
    expect(Number.isFinite(hi)).toBe(true);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
  });
});

describe('runAllDetectors', () => {
  it('returns per-point detection flags of the same length as the input', () => {
    const series = mk([4, 4, 4, 4, 4, 4, 4, 4, 4, 12]);
    const { detections } = runAllDetectors(series);
    expect(detections).toHaveLength(series.length);
    for (const d of detections) {
      expect(typeof d.flagged).toBe('boolean');
      expect(d.ensembleScore).toBeGreaterThanOrEqual(0);
      expect(d.ensembleScore).toBeLessThanOrEqual(1);
    }
    // the injected spike should be flagged by the ensemble
    expect(detections[detections.length - 1].flagged).toBe(true);
  });
});
