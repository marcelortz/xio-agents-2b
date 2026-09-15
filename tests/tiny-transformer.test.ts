import { TinyTransformer, TransformerConfig } from '../src/models/transformer/tiny-transformer';

const CONFIG: TransformerConfig = {
  vocabSize: 10,
  dModel: 8,
  numHeads: 2,
  dFeedForward: 16,
  numLayers: 2,
  seqLen: 4,
  outputDim: 3,
};

describe('TinyTransformer', () => {
  test('forward() returns a vector of length outputDim', () => {
    const model = new TinyTransformer(CONFIG);
    const output = model.forward([1, 2, 3, 4]);
    expect(output).toHaveLength(CONFIG.outputDim);
    expect(output.every((v) => typeof v === 'number' && !Number.isNaN(v))).toBe(true);
  });

  test('forward() is deterministic for fixed parameters', () => {
    const model = new TinyTransformer(CONFIG);
    const params = model.getParameters();
    model.setParameters(params);
    const first = model.forward([0, 1, 2, 3]);
    model.setParameters(params);
    const second = model.forward([0, 1, 2, 3]);
    expect(second).toEqual(first);
  });

  test('getParameters()/setParameters() round-trip exactly', () => {
    const model = new TinyTransformer(CONFIG);
    const original = model.getParameters();
    model.setParameters(original);
    expect(model.getParameters()).toEqual(original);
  });

  test('setParameters() with a different vector changes forward() output', () => {
    const model = new TinyTransformer(CONFIG);
    const params = model.getParameters();
    const before = model.forward([1, 1, 1, 1]);
    model.setParameters(params.map((p) => p + 1));
    const after = model.forward([1, 1, 1, 1]);
    expect(after).not.toEqual(before);
  });

  test('throws when given the wrong sequence length', () => {
    const model = new TinyTransformer(CONFIG);
    expect(() => model.forward([1, 2, 3])).toThrow(/expected 4 tokens/);
  });

  test('throws when a token id is out of vocab range', () => {
    const model = new TinyTransformer(CONFIG);
    expect(() => model.forward([0, 1, 2, CONFIG.vocabSize])).toThrow(/out of vocab range/);
  });

  test('throws when dModel is not divisible by numHeads', () => {
    expect(() => new TinyTransformer({ ...CONFIG, dModel: 7, numHeads: 2 })).toThrow(/divisible/);
  });

  test('getParameterCount() matches the length getParameters() returns', () => {
    const model = new TinyTransformer(CONFIG);
    expect(model.getParameterCount()).toBe(model.getParameters().length);
  });
});
