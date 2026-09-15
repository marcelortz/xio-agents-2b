import { l2Norm, clipByNorm, addGaussianNoise, privatizeUpdate } from '../src/federated/differential-privacy';

describe('l2Norm', () => {
  test('computes the Euclidean norm', () => {
    expect(l2Norm([3, 4])).toBe(5);
  });

  test('is zero for a zero vector', () => {
    expect(l2Norm([0, 0, 0])).toBe(0);
  });
});

describe('clipByNorm', () => {
  test('leaves a vector already under the max norm unchanged', () => {
    const v = [1, 1];
    expect(clipByNorm(v, 10)).toEqual(v);
  });

  test('scales a vector over the max norm down to exactly that norm', () => {
    const clipped = clipByNorm([3, 4], 2.5);
    expect(l2Norm(clipped)).toBeCloseTo(2.5);
    expect(clipped[0] / clipped[1]).toBeCloseTo(3 / 4);
  });

  test('does not divide by zero for a zero vector', () => {
    expect(clipByNorm([0, 0], 1)).toEqual([0, 0]);
  });
});

describe('addGaussianNoise', () => {
  test('preserves vector length', () => {
    expect(addGaussianNoise([1, 2, 3, 4], 0.1)).toHaveLength(4);
  });

  test('adds no noise when stdDev is 0', () => {
    expect(addGaussianNoise([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });
});

describe('privatizeUpdate', () => {
  test('output length matches input length', () => {
    const out = privatizeUpdate([1, 2, 3], { clipNorm: 1, noiseMultiplier: 0.1 });
    expect(out).toHaveLength(3);
  });

  test('clips large updates before noising, keeping them bounded near clipNorm', () => {
    const huge = [1000, 1000, 1000];
    const out = privatizeUpdate(huge, { clipNorm: 1, noiseMultiplier: 0.01 });
    // clipped to norm 1, then a small amount of noise (stdDev = 0.01) is added
    expect(l2Norm(out)).toBeLessThan(2);
  });
});
