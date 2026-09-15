/** Minimal, dependency-free tensor operations for the tiny transformer. */

export type Matrix = number[][];
export type Vector = number[];

export function zerosMatrix(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}

export function randomMatrix(rows: number, cols: number, scale = 0.1): Matrix {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale));
}

export function randomVector(size: number, scale = 0.1): Vector {
  return Array.from({ length: size }, () => (Math.random() * 2 - 1) * scale);
}

/** A x B, where A is [m x k] and B is [k x n]. */
export function matmul(a: Matrix, b: Matrix): Matrix {
  const m = a.length;
  const k = a[0]?.length ?? 0;
  const n = b[0]?.length ?? 0;
  const out = zerosMatrix(m, n);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let p = 0; p < k; p++) sum += a[i][p] * b[p][j];
      out[i][j] = sum;
    }
  }
  return out;
}

export function transpose(a: Matrix): Matrix {
  const rows = a.length;
  const cols = a[0]?.length ?? 0;
  const out = zerosMatrix(cols, rows);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) out[j][i] = a[i][j];
  return out;
}

export function addMatrix(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

/** Adds a row vector to every row of a matrix (broadcast). */
export function addRowVector(a: Matrix, v: Vector): Matrix {
  return a.map((row) => row.map((val, j) => val + v[j]));
}

export function scaleMatrix(a: Matrix, scalar: number): Matrix {
  return a.map((row) => row.map((v) => v * scalar));
}

export function elementwise(a: Matrix, fn: (x: number) => number): Matrix {
  return a.map((row) => row.map(fn));
}

/** Row-wise softmax. */
export function softmaxRows(a: Matrix): Matrix {
  return a.map((row) => {
    const max = Math.max(...row);
    const exps = row.map((x) => Math.exp(x - max));
    const sum = exps.reduce((s, x) => s + x, 0);
    return exps.map((x) => x / sum);
  });
}

export function relu(x: number): number {
  return Math.max(0, x);
}

export function gelu(x: number): number {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));
}

/** Row-wise layer normalization with learnable gain/bias, one per feature. */
export function layerNorm(a: Matrix, gamma: Vector, beta: Vector, eps = 1e-5): Matrix {
  return a.map((row) => {
    const mean = row.reduce((s, x) => s + x, 0) / row.length;
    const variance = row.reduce((s, x) => s + (x - mean) ** 2, 0) / row.length;
    const inv = 1 / Math.sqrt(variance + eps);
    return row.map((x, j) => (x - mean) * inv * gamma[j] + beta[j]);
  });
}

/** Mean-pools rows of a matrix into a single vector (sequence -> fixed-size representation). */
export function meanPoolRows(a: Matrix): Vector {
  const rows = a.length;
  const cols = a[0]?.length ?? 0;
  const out = new Array(cols).fill(0);
  for (const row of a) for (let j = 0; j < cols; j++) out[j] += row[j] / rows;
  return out;
}
