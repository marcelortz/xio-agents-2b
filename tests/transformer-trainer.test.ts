import { evolveParameters, meanSquaredError } from '../src/models/transformer/transformer-trainer';

describe('evolveParameters', () => {
  test('reduces loss on a simple quadratic bowl', () => {
    const target = [3, -2, 1];
    const lossFn = (params: number[]) => meanSquaredError(params, target);

    const start = [0, 0, 0];
    const startLoss = lossFn(start);

    const { parameters, finalLoss, lossHistory } = evolveParameters(start, lossFn, {
      generations: 60,
      populationSize: 20,
      mutationSigma: 0.5,
      sigmaDecay: 0.95,
    });

    expect(finalLoss).toBeLessThan(startLoss);
    expect(lossHistory[0]).toBeCloseTo(startLoss);
    expect(lossHistory[lossHistory.length - 1]).toBeCloseTo(finalLoss);
    expect(parameters).toHaveLength(3);
  });

  test('never returns a worse solution than the starting point', () => {
    const lossFn = (params: number[]) => meanSquaredError(params, [0, 0]);
    const start = [5, 5];
    const { finalLoss } = evolveParameters(start, lossFn, { generations: 10, populationSize: 5 });
    expect(finalLoss).toBeLessThanOrEqual(lossFn(start));
  });
});

describe('meanSquaredError', () => {
  test('is zero for identical vectors', () => {
    expect(meanSquaredError([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  test('matches manual calculation', () => {
    expect(meanSquaredError([1, 2], [0, 0])).toBeCloseTo((1 + 4) / 2);
  });
});
