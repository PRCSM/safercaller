import { getTrustTier, clampScore, TRUST_THRESHOLDS } from '../trust';

describe('getTrustTier', () => {
  it('classifies high scores as safe', () => {
    expect(getTrustTier(900).key).toBe('safe');
    expect(getTrustTier(700).key).toBe('safe'); // boundary inclusive
  });

  it('classifies mid scores as caution', () => {
    expect(getTrustTier(699).key).toBe('caution');
    expect(getTrustTier(400).key).toBe('caution'); // boundary inclusive
  });

  it('classifies low scores as danger', () => {
    expect(getTrustTier(399).key).toBe('danger');
    expect(getTrustTier(0).key).toBe('danger');
  });

  it('treats non-numbers as the lowest tier (defensive)', () => {
    expect(getTrustTier(undefined).key).toBe('danger');
    expect(getTrustTier(null).key).toBe('danger');
  });

  it('returns a colour, label and icon for every tier', () => {
    for (const score of [900, 500, 100]) {
      const tier = getTrustTier(score);
      expect(tier.color).toMatch(/^#/);
      expect(typeof tier.label).toBe('string');
      expect(typeof tier.icon).toBe('string');
    }
  });

  it('exposes the documented thresholds', () => {
    expect(TRUST_THRESHOLDS).toEqual({ safe: 700, caution: 400 });
  });
});

describe('clampScore', () => {
  it('clamps into the 0–1000 range', () => {
    expect(clampScore(-50)).toBe(0);
    expect(clampScore(1200)).toBe(1000);
    expect(clampScore(742.6)).toBe(743); // rounds
  });

  it('handles missing values', () => {
    expect(clampScore(undefined)).toBe(0);
    expect(clampScore(NaN)).toBe(0);
  });
});
