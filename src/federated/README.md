# Federated transformer training

A from-scratch, tiny transformer encoder (`src/models/transformer/tiny-transformer.ts`) trained across simulated clients with differentially-private aggregation (`differential-privacy.ts`), demonstrated end-to-end in `federated-transformer-demo.ts`.

## Run it

```bash
npm run demo:federated-transformer
```

Trains a 1-layer, 8-dim, 2-head transformer (666 parameters) on a toy task — predicting whether a 4-token sequence sums to an even or odd number — across 4 simulated clients for 6 federated rounds. Typical output:

```
round 0 (random init): validation loss = 0.66
round 1: validation loss = 0.59
...
round 6: validation loss = 0.30
```

## How it fits together

1. **`models/transformer/tiny-transformer.ts`** — a real transformer encoder: token embedding + sinusoidal positional encoding, multi-head scaled dot-product self-attention, residual connections, layer norm, a position-wise feed-forward block, mean-pooling, and a linear output head. `getParameters()`/`setParameters()` flatten/restore every weight to/from a single vector.

2. **`models/transformer/transformer-trainer.ts`** — trains that parameter vector with a (1, λ) evolution strategy instead of backpropagation. This repo has no autodiff engine, and a correct from-scratch backward pass through attention/softmax/layer norm is a large, bug-prone undertaking; evolution strategies are a legitimate, established alternative for small networks (Salimans et al., 2017) and only need a forward pass to score candidates. This also means each client can warm-start from the *current global model* every round, rather than training from scratch.

3. **`federated/differential-privacy.ts`** — implements DP-FedAvg (McMahan et al., 2018): each client's parameter *update* (not raw weights) is clipped to a max L2 norm, then perturbed with Gaussian noise scaled to that norm, before the server averages updates across clients.

4. **`federated/federated-transformer-demo.ts`** — orchestrates it: each round, every client evolves its local copy of the global weights against its own local dataset, computes its (privatized) update, and the server averages those updates into the new global model.

## Tuning knobs

- `CONFIG` in the demo file: model size (`dModel`, `numHeads`, `dFeedForward`, `numLayers`), and the task shape (`vocabSize`, `seqLen`, `outputDim`).
- `DP_CONFIG.noiseMultiplier`: raise for stronger privacy (slower/noisier convergence), lower for faster convergence with weaker privacy guarantees.
- `evolveParameters` options in the demo (`generations`, `populationSize`, `mutationSigma`): more generations/population converge better per round at the cost of compute.

## Known limitations

- This is a demonstration, not a production federated learning deployment: there's no real network transport between "clients" and "server" (everything runs in one process), no client dropout/failure handling, and no formal (ε, δ) privacy accounting across rounds.
- Evolution-strategy training scales to small models (hundreds to low thousands of parameters); it is not a substitute for gradient-based training on larger networks.
