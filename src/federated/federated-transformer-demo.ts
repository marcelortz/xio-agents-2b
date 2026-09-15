import { TinyTransformer, TransformerConfig } from '../models/transformer/tiny-transformer';
import { evolveParameters, meanSquaredError } from '../models/transformer/transformer-trainer';
import { privatizeUpdate, DifferentialPrivacyConfig } from './differential-privacy';
import { Vector } from '../models/transformer/tensor-ops';

interface Example {
  tokens: number[];
  target: Vector;
}

const CONFIG: TransformerConfig = {
  vocabSize: 10,
  dModel: 8,
  numHeads: 2,
  dFeedForward: 16,
  numLayers: 1,
  seqLen: 4,
  outputDim: 2,
};

const DP_CONFIG: DifferentialPrivacyConfig = {
  clipNorm: 1.0,
  noiseMultiplier: 0.05,
};

const NUM_CLIENTS = 4;
const EXAMPLES_PER_CLIENT = 12;
const NUM_ROUNDS = 6;

/** Toy task: predict whether the sum of the token sequence is even (=[1,0]) or odd (=[0,1]). */
function makeExample(): Example {
  const tokens = Array.from({ length: CONFIG.seqLen }, () => Math.floor(Math.random() * CONFIG.vocabSize));
  const isEven = tokens.reduce((a, b) => a + b, 0) % 2 === 0;
  return { tokens, target: isEven ? [1, 0] : [0, 1] };
}

function datasetLoss(model: TinyTransformer, params: Vector, dataset: Example[]): number {
  model.setParameters(params);
  let total = 0;
  for (const { tokens, target } of dataset) total += meanSquaredError(model.forward(tokens), target);
  return total / dataset.length;
}

function averageVectors(vectors: Vector[]): Vector {
  const length = vectors[0].length;
  const sum = new Array(length).fill(0);
  for (const v of vectors) for (let i = 0; i < length; i++) sum[i] += v[i] / vectors.length;
  return sum;
}

function subtract(a: Vector, b: Vector): Vector {
  return a.map((v, i) => v - b[i]);
}

function add(a: Vector, b: Vector): Vector {
  return a.map((v, i) => v + b[i]);
}

function main(): void {
  console.log(
    `Federated training of a ${CONFIG.numLayers}-layer transformer ` +
      `(${new TinyTransformer(CONFIG).getParameterCount()} params) across ${NUM_CLIENTS} clients, ` +
      `${NUM_ROUNDS} rounds, DP noiseMultiplier=${DP_CONFIG.noiseMultiplier}\n`,
  );

  const clientDatasets: Example[][] = Array.from({ length: NUM_CLIENTS }, () =>
    Array.from({ length: EXAMPLES_PER_CLIENT }, makeExample),
  );
  const validationSet = Array.from({ length: 40 }, makeExample);

  const scratchModel = new TinyTransformer(CONFIG);
  let globalParams = scratchModel.getParameters();

  const initialLoss = datasetLoss(scratchModel, globalParams, validationSet);
  console.log(`round 0 (random init): validation loss = ${initialLoss.toFixed(4)}`);

  for (let round = 1; round <= NUM_ROUNDS; round++) {
    const clientDeltas: Vector[] = [];

    for (let c = 0; c < NUM_CLIENTS; c++) {
      const localModel = new TinyTransformer(CONFIG);
      const dataset = clientDatasets[c];

      const { parameters: trained } = evolveParameters(
        globalParams,
        (params) => datasetLoss(localModel, params, dataset),
        { generations: 20, populationSize: 10, mutationSigma: 0.15, sigmaDecay: 0.97 },
      );

      const rawDelta = subtract(trained, globalParams);
      clientDeltas.push(privatizeUpdate(rawDelta, DP_CONFIG));
    }

    globalParams = add(globalParams, averageVectors(clientDeltas));
    const loss = datasetLoss(scratchModel, globalParams, validationSet);
    console.log(`round ${round}: validation loss = ${loss.toFixed(4)}`);
  }
}

main();
