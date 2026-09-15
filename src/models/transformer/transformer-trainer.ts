import { Vector } from './tensor-ops';

/**
 * Trains TinyTransformer weights with a (mu, lambda) evolution strategy
 * instead of backpropagation.
 *
 * Why not backprop: a correct, from-scratch backward pass through
 * multi-head attention, softmax, and layer norm is a large surface for
 * subtle gradient bugs, and this repo already has no autodiff engine to
 * lean on. Evolution strategies are a legitimate, well-studied alternative
 * for training small networks (see Salimans et al., "Evolution Strategies
 * as a Scalable Alternative to Reinforcement Learning", 2017) — every
 * candidate is scored by a plain forward pass, so the model above only
 * ever needs `forward()`, `getParameters()`, and `setParameters()`.
 *
 * Critically for federated learning, this trainer supports warm-starting
 * from a given parameter vector (the current global model), so each
 * client refines the shared model locally rather than training a fresh
 * random model from scratch every round.
 */

export interface EvolutionOptions {
  generations: number;
  populationSize: number;
  /** Std-dev of the Gaussian mutation applied to each parameter per generation. */
  mutationSigma: number;
  /** Multiplies mutationSigma by this factor each generation (e.g. 0.98 to anneal). */
  sigmaDecay?: number;
}

export interface TrainResult {
  parameters: Vector;
  finalLoss: number;
  lossHistory: number[];
}

const DEFAULT_OPTIONS: EvolutionOptions = {
  generations: 40,
  populationSize: 16,
  mutationSigma: 0.15,
  sigmaDecay: 0.97,
};

/**
 * Minimizes `lossFn` starting from `initialParameters` using a simple
 * (1, lambda) evolution strategy: each generation, spawn `populationSize`
 * children by adding Gaussian noise to the current best parameters, keep
 * whichever child (or the parent) has the lowest loss.
 */
export function evolveParameters(
  initialParameters: Vector,
  lossFn: (params: Vector) => number,
  options: Partial<EvolutionOptions> = {},
): TrainResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let current = [...initialParameters];
  let currentLoss = lossFn(current);
  let sigma = opts.mutationSigma;
  const lossHistory: number[] = [currentLoss];

  for (let generation = 0; generation < opts.generations; generation++) {
    let bestChild: Vector | null = null;
    let bestChildLoss = currentLoss;

    for (let i = 0; i < opts.populationSize; i++) {
      const child = current.map((w) => w + gaussianNoise() * sigma);
      const loss = lossFn(child);
      if (loss < bestChildLoss) {
        bestChild = child;
        bestChildLoss = loss;
      }
    }

    if (bestChild) {
      current = bestChild;
      currentLoss = bestChildLoss;
    }
    sigma *= opts.sigmaDecay ?? 1;
    lossHistory.push(currentLoss);
  }

  return { parameters: current, finalLoss: currentLoss, lossHistory };
}

/** Standard normal sample via Box-Muller. */
function gaussianNoise(): number {
  const u1 = Math.random() || 1e-12;
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function meanSquaredError(predicted: Vector, target: Vector): number {
  return predicted.reduce((sum, p, i) => sum + (p - target[i]) ** 2, 0) / predicted.length;
}
