import {
  Matrix,
  Vector,
  matmul,
  transpose,
  addRowVector,
  scaleMatrix,
  softmaxRows,
  layerNorm,
  elementwise,
  gelu,
  meanPoolRows,
  randomMatrix,
  randomVector,
} from './tensor-ops';

export interface TransformerConfig {
  vocabSize: number;
  dModel: number;
  numHeads: number;
  dFeedForward: number;
  numLayers: number;
  seqLen: number;
  outputDim: number;
}

interface LayerWeights {
  wq: Matrix;
  wk: Matrix;
  wv: Matrix;
  wo: Matrix;
  ln1Gamma: Vector;
  ln1Beta: Vector;
  ffnW1: Matrix;
  ffnB1: Vector;
  ffnW2: Matrix;
  ffnB2: Vector;
  ln2Gamma: Vector;
  ln2Beta: Vector;
}

/**
 * A small, from-scratch transformer encoder: token embedding + sinusoidal
 * positional encoding, N layers of (multi-head self-attention -> residual
 * -> layer norm -> position-wise feed-forward -> residual -> layer norm),
 * then mean-pooling and a linear head.
 *
 * Weights are trained via evolutionary search (see transformer-trainer.ts),
 * not backpropagation — see that file's header comment for why. Because of
 * that, this class only needs a forward pass plus flatten/unflatten of its
 * parameters into a single vector; there is no backward pass.
 */
export class TinyTransformer {
  private embedding: Matrix;
  private layers: LayerWeights[];
  private outputW: Matrix;
  private outputB: Vector;
  private readonly positionalEncoding: Matrix;
  private readonly headDim: number;

  constructor(public readonly config: TransformerConfig) {
    if (config.dModel % config.numHeads !== 0) {
      throw new Error(`dModel (${config.dModel}) must be divisible by numHeads (${config.numHeads})`);
    }
    this.headDim = config.dModel / config.numHeads;
    this.embedding = randomMatrix(config.vocabSize, config.dModel);
    this.layers = Array.from({ length: config.numLayers }, () => this.initLayer());
    this.outputW = randomMatrix(config.dModel, config.outputDim);
    this.outputB = randomVector(config.outputDim, 0);
    this.positionalEncoding = this.buildPositionalEncoding();
  }

  private initLayer(): LayerWeights {
    const { dModel, dFeedForward } = this.config;
    return {
      wq: randomMatrix(dModel, dModel),
      wk: randomMatrix(dModel, dModel),
      wv: randomMatrix(dModel, dModel),
      wo: randomMatrix(dModel, dModel),
      ln1Gamma: new Array(dModel).fill(1),
      ln1Beta: new Array(dModel).fill(0),
      ffnW1: randomMatrix(dModel, dFeedForward),
      ffnB1: new Array(dFeedForward).fill(0),
      ffnW2: randomMatrix(dFeedForward, dModel),
      ffnB2: new Array(dModel).fill(0),
      ln2Gamma: new Array(dModel).fill(1),
      ln2Beta: new Array(dModel).fill(0),
    };
  }

  private buildPositionalEncoding(): Matrix {
    const { seqLen, dModel } = this.config;
    const pe = Array.from({ length: seqLen }, () => new Array(dModel).fill(0));
    for (let pos = 0; pos < seqLen; pos++) {
      for (let i = 0; i < dModel; i++) {
        const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / dModel);
        pe[pos][i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
      }
    }
    return pe;
  }

  /** Runs the encoder on a sequence of token ids, returning an `outputDim`-length vector. */
  forward(tokenIds: number[]): Vector {
    if (tokenIds.length !== this.config.seqLen) {
      throw new Error(`expected ${this.config.seqLen} tokens, got ${tokenIds.length}`);
    }

    let hidden: Matrix = tokenIds.map((id, pos) => {
      if (id < 0 || id >= this.config.vocabSize) throw new Error(`token id ${id} out of vocab range`);
      return this.embedding[id].map((v, j) => v + this.positionalEncoding[pos][j]);
    });

    for (const layer of this.layers) {
      const attended = this.selfAttention(hidden, layer);
      const afterAttention = layerNorm(addMatrixRows(hidden, attended), layer.ln1Gamma, layer.ln1Beta);

      const ffnOut = this.feedForward(afterAttention, layer);
      hidden = layerNorm(addMatrixRows(afterAttention, ffnOut), layer.ln2Gamma, layer.ln2Beta);
    }

    const pooled = meanPoolRows(hidden);
    return addVector(matVec(this.outputW, pooled), this.outputB);
  }

  private selfAttention(hidden: Matrix, layer: LayerWeights): Matrix {
    const { numHeads } = this.config;
    const q = matmul(hidden, layer.wq);
    const k = matmul(hidden, layer.wk);
    const v = matmul(hidden, layer.wv);

    const headOutputs: Matrix[] = [];
    for (let h = 0; h < numHeads; h++) {
      const start = h * this.headDim;
      const end = start + this.headDim;
      const qh = sliceCols(q, start, end);
      const kh = sliceCols(k, start, end);
      const vh = sliceCols(v, start, end);

      const scores = scaleMatrix(matmul(qh, transpose(kh)), 1 / Math.sqrt(this.headDim));
      const weights = softmaxRows(scores);
      headOutputs.push(matmul(weights, vh));
    }

    const concatenated = concatCols(headOutputs);
    return matmul(concatenated, layer.wo);
  }

  private feedForward(hidden: Matrix, layer: LayerWeights): Matrix {
    const h1 = elementwise(addRowVector(matmul(hidden, layer.ffnW1), layer.ffnB1), gelu);
    return addRowVector(matmul(h1, layer.ffnW2), layer.ffnB2);
  }

  /** Flattens every weight into a single parameter vector, in a fixed, stable order. */
  getParameters(): Vector {
    const params: number[] = [];
    pushMatrix(params, this.embedding);
    for (const layer of this.layers) {
      pushMatrix(params, layer.wq);
      pushMatrix(params, layer.wk);
      pushMatrix(params, layer.wv);
      pushMatrix(params, layer.wo);
      params.push(...layer.ln1Gamma, ...layer.ln1Beta);
      pushMatrix(params, layer.ffnW1);
      params.push(...layer.ffnB1);
      pushMatrix(params, layer.ffnW2);
      params.push(...layer.ffnB2);
      params.push(...layer.ln2Gamma, ...layer.ln2Beta);
    }
    pushMatrix(params, this.outputW);
    params.push(...this.outputB);
    return params;
  }

  getParameterCount(): number {
    return this.getParameters().length;
  }

  /** Loads a flat parameter vector produced by getParameters() (same config only). */
  setParameters(params: Vector): void {
    let cursor = 0;
    const readMatrix = (rows: number, cols: number): Matrix => {
      const m = Array.from({ length: rows }, () => params.slice(cursor, (cursor += cols)));
      return m;
    };
    const readVector = (size: number): Vector => params.slice(cursor, (cursor += size));

    const { vocabSize, dModel, dFeedForward, outputDim } = this.config;
    this.embedding = readMatrix(vocabSize, dModel);
    for (const layer of this.layers) {
      layer.wq = readMatrix(dModel, dModel);
      layer.wk = readMatrix(dModel, dModel);
      layer.wv = readMatrix(dModel, dModel);
      layer.wo = readMatrix(dModel, dModel);
      layer.ln1Gamma = readVector(dModel);
      layer.ln1Beta = readVector(dModel);
      layer.ffnW1 = readMatrix(dModel, dFeedForward);
      layer.ffnB1 = readVector(dFeedForward);
      layer.ffnW2 = readMatrix(dFeedForward, dModel);
      layer.ffnB2 = readVector(dModel);
      layer.ln2Gamma = readVector(dModel);
      layer.ln2Beta = readVector(dModel);
    }
    this.outputW = readMatrix(dModel, outputDim);
    this.outputB = readVector(outputDim);

    if (cursor !== params.length) {
      throw new Error(`parameter vector length mismatch: consumed ${cursor}, received ${params.length}`);
    }
  }
}

function pushMatrix(target: number[], m: Matrix): void {
  for (const row of m) target.push(...row);
}

function sliceCols(m: Matrix, start: number, end: number): Matrix {
  return m.map((row) => row.slice(start, end));
}

function concatCols(matrices: Matrix[]): Matrix {
  const rows = matrices[0].length;
  return Array.from({ length: rows }, (_, i) => matrices.flatMap((m) => m[i]));
}

function addMatrixRows(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

function matVec(m: Matrix, v: Vector): Vector {
  return transpose(m).map((col) => col.reduce((sum, w, i) => sum + w * v[i], 0));
}

function addVector(a: Vector, b: Vector): Vector {
  return a.map((v, i) => v + b[i]);
}
