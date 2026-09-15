/**
 * DP-FedAvg-style differential privacy for federated aggregation.
 *
 * Each client sends a parameter *update* (delta from the current global
 * model), not raw weights. Before sending, the update is:
 *   1. Clipped to a max L2 norm (bounds any one client's influence/sensitivity)
 *   2. Perturbed with Gaussian noise scaled to that clip norm
 *
 * This is the standard McMahan et al. ("Learning Differentially Private
 * Recurrent Language Models", 2018) construction. `noiseMultiplier` is the
 * usual DP-SGD/DP-FedAvg knob: higher = more privacy, more accuracy cost.
 */

export interface DifferentialPrivacyConfig {
  clipNorm: number;
  noiseMultiplier: number;
}

export function l2Norm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
}

/** Scales `vector` down so its L2 norm is at most `maxNorm` (no-op if already within bounds). */
export function clipByNorm(vector: number[], maxNorm: number): number[] {
  const norm = l2Norm(vector);
  if (norm <= maxNorm || norm === 0) return [...vector];
  const scale = maxNorm / norm;
  return vector.map((v) => v * scale);
}

function gaussianNoise(stdDev: number): number {
  const u1 = Math.random() || 1e-12;
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stdDev;
}

export function addGaussianNoise(vector: number[], stdDev: number): number[] {
  return vector.map((v) => v + gaussianNoise(stdDev));
}

/** Clips then adds calibrated noise to a single client's update. */
export function privatizeUpdate(update: number[], config: DifferentialPrivacyConfig): number[] {
  const clipped = clipByNorm(update, config.clipNorm);
  return addGaussianNoise(clipped, config.noiseMultiplier * config.clipNorm);
}
