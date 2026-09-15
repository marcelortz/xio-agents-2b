# Federated Learning TypeScript Client Library

Complete, type-safe TypeScript client library for the Federated Learning REST API.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)

---

## Installation

The client library is part of the `ml-optimization-suite` package.

```typescript
import {
  FederatedLearningClient,
  SessionManager,
  BatchOperations,
} from './src/api/federated-learning-client';
```

---

## Quick Start

### Basic Usage

```typescript
import { FederatedLearningClient } from './src/api/federated-learning-client';

// Create client
const client = new FederatedLearningClient({
  baseUrl: 'http://localhost:3000/federated',
});

// Create a session
const session = await client.createSession({
  initialWeights: Array(10).fill(0.1),
  aggregationStrategy: 'averaging',
});

console.log(`Session created: ${session.sessionId}`);

// Add clients
await client.addClient(session.sessionId, {
  clientId: 'client-1',
  features: [[0.1, 0.2, ...], [0.3, 0.4, ...]],
  labels: [1, 0],
});

// Run training
const result = await client.train(session.sessionId, {
  rounds: 5,
  epochs: 2,
});

console.log(`Training completed: ${result.roundsCompleted} rounds`);
```

---

## Core Concepts

### FederatedLearningClient

Main client class for API communication. Handles all REST operations with:
- Automatic retry logic
- Request timeout handling
- Type-safe responses
- Comprehensive error handling

### SessionManager

High-level wrapper around a specific session for convenience. All operations are scoped to a session.

### BatchOperations

Helper class for complex multi-step operations:
- Create session with multiple clients
- Train with periodic evaluation

---

## API Reference

### FederatedLearningClient

#### Constructor

```typescript
constructor(config?: ClientConfig)
```

**Config Options:**
```typescript
interface ClientConfig {
  baseUrl?: string;        // Default: 'http://localhost:3000/federated'
  timeout?: number;        // Default: 30000ms
  retryAttempts?: number;  // Default: 3
  retryDelay?: number;     // Default: 1000ms
}
```

#### Session Management

##### `createSession(config: SessionConfig): Promise<SessionResponse>`

Create a new federated learning session.

```typescript
const response = await client.createSession({
  initialWeights: [0.1, 0.1, ...],
  aggregationStrategy: 'averaging' // optional
});
```

---

##### `getSession(sessionId: string): Promise<SessionDetails>`

Get detailed information about a session.

```typescript
const details = await client.getSession('session-1-xxx');
```

**Response:**
```typescript
{
  sessionId: string;
  status: 'active' | 'training' | 'completed';
  createdAt: string;
  aggregationStrategy: string;
  trainingRounds: number;
  clientCount: number;
  globalModelWeights: number[];
  communicationRounds: number;
  trainingHistory: Array<{round, loss, accuracy}>;
}
```

---

##### `listSessions(): Promise<SessionListResponse>`

List all active sessions.

```typescript
const sessions = await client.listSessions();
// Returns: { totalSessions: number; sessions: SessionInfo[] }
```

---

##### `deleteSession(sessionId: string): Promise<DeleteResponse>`

Delete a session and clean up resources.

```typescript
await client.deleteSession('session-1-xxx');
```

---

#### Client Management

##### `addClient(sessionId: string, client: ClientData): Promise<ClientResponse>`

Add a client to a session with training data.

```typescript
await client.addClient(sessionId, {
  clientId: 'client-1',
  features: [[0.1, 0.2, ...], [0.3, 0.4, ...]],  // N x D array
  labels: [1, 0],                                 // N array
});
```

**ClientData:**
```typescript
interface ClientData {
  clientId: string;
  features: number[][];  // N samples × D features
  labels: number[];      // N labels
}
```

---

##### `listClients(sessionId: string): Promise<ClientListResponse>`

List all clients in a session.

```typescript
const clients = await client.listClients(sessionId);
// Returns: { totalClients: number; clients: ClientInfo[] }
```

---

##### `removeClient(sessionId: string, clientId: string): Promise<ClientDeleteResponse>`

Remove a client from a session.

```typescript
await client.removeClient(sessionId, 'client-1');
```

---

#### Training & Evaluation

##### `train(sessionId: string, request: TrainingRequest): Promise<TrainingResponse>`

Run federated training rounds.

```typescript
const result = await client.train(sessionId, {
  rounds: 5,    // Number of federated rounds
  epochs: 2,    // Optional: local training epochs
});
```

**Response:**
```typescript
{
  sessionId: string;
  roundsCompleted: number;
  communicationRounds: number;
  duration: number;                    // in ms
  globalModelWeights: number[];
  averageTimePerRound: string;
  timestamp: string;
}
```

---

##### `evaluate(sessionId: string, request: EvaluationRequest): Promise<EvaluationResponse>`

Evaluate the global model on test data.

```typescript
const evaluation = await client.evaluate(sessionId, {
  testFeatures: [[...], [...], ...],  // Test samples
  testLabels: [1, 0, 1, ...],         // Test labels
});

console.log(`Accuracy: ${evaluation.accuracy}%`);
```

---

##### `getModel(sessionId: string): Promise<ModelResponse>`

Get the current global model weights.

```typescript
const model = await client.getModel(sessionId);
// Returns: { globalModel: { weights, dimension, aggregationStrategy } }
```

---

##### `getMetrics(sessionId: string): Promise<MetricsResponse>`

Get detailed training metrics.

```typescript
const metrics = await client.getMetrics(sessionId);
// Returns: { metrics: { globalWeights, communicationRounds, trainingHistory } }
```

---

#### Strategies

##### `getStrategies(): Promise<StrategiesResponse>`

List available aggregation strategies.

```typescript
const strategies = await client.getStrategies();
// Returns: { strategies: StrategyInfo[] }
```

**StrategyInfo:**
```typescript
{
  id: string;
  name: string;
  description: string;
  robustness: string;     // 'Low' | 'High'
  speed: string;          // 'Fast' | 'Medium' | 'Slow'
  useCase: string;
}
```

---

#### Info

##### `getInfo(): Promise<ApiInfoResponse>`

Get API information and available endpoints.

```typescript
const info = await client.getInfo();
```

---

### SessionManager

Convenience wrapper for scoped operations on a session.

#### Constructor

```typescript
const manager = new SessionManager(client, sessionId);
```

#### Methods

All methods are equivalent to client methods but don't require sessionId:

```typescript
await manager.addClient(clientData);
await manager.listClients();
await manager.removeClient(clientId);
await manager.train(rounds, epochs);
await manager.evaluate(testFeatures, testLabels);
await manager.getModel();
await manager.getMetrics();
await manager.getDetails();
await manager.delete();
```

---

### BatchOperations

Helper for complex workflows.

#### Constructor

```typescript
const batch = new BatchOperations(client);
```

#### Methods

##### `createSessionWithClients(config, clients): Promise<SessionManager>`

Create session and add multiple clients in one operation.

```typescript
const manager = await batch.createSessionWithClients(
  {
    initialWeights: Array(10).fill(0.1),
    aggregationStrategy: 'averaging',
  },
  [
    { clientId: 'c1', features: [...], labels: [...] },
    { clientId: 'c2', features: [...], labels: [...] },
    // ...
  ]
);
```

---

##### `trainWithEvaluation(manager, totalRounds, roundsPerEval, testFeatures, testLabels): Promise<Result[]>`

Train and evaluate at specified intervals.

```typescript
const results = await batch.trainWithEvaluation(
  manager,
  10,                    // Total rounds
  2,                     // Rounds per evaluation
  testFeatures,
  testLabels
);

results.forEach(r => {
  console.log(`Round ${r.round}: Accuracy ${r.accuracy}%`);
});
```

---

## Examples

### Example 1: Basic Workflow

```typescript
const client = new FederatedLearningClient();

// Create session
const session = await client.createSession({
  initialWeights: Array(10).fill(0.1),
  aggregationStrategy: 'averaging',
});

// Add clients
for (let i = 1; i <= 3; i++) {
  const features = Array(20).fill(0).map(() =>
    Array(10).fill(0).map(() => Math.random())
  );
  const labels = Array(20).fill(0).map(() => Math.round(Math.random()));

  await client.addClient(session.sessionId, {
    clientId: `client-${i}`,
    features,
    labels,
  });
}

// Train
const training = await client.train(session.sessionId, {
  rounds: 5,
  epochs: 2,
});

console.log(`Completed ${training.roundsCompleted} rounds`);

// Evaluate
const test = Array(10).fill(0).map(() =>
  Array(10).fill(0).map(() => Math.random())
);
const testLabels = Array(10).fill(0).map(() => Math.round(Math.random()));

const evaluation = await client.evaluate(session.sessionId, {
  testFeatures: test,
  testLabels,
});

console.log(`Model accuracy: ${evaluation.accuracy}%`);

// Cleanup
await client.deleteSession(session.sessionId);
```

---

### Example 2: Using SessionManager

```typescript
const client = new FederatedLearningClient();

// Create session
const sessionResponse = await client.createSession({
  initialWeights: Array(10).fill(0.1),
});

// Use SessionManager for convenience
const manager = new SessionManager(client, sessionResponse.sessionId);

// All operations are scoped to this session
await manager.addClient({
  clientId: 'client-1',
  features: [...],
  labels: [...],
});

const training = await manager.train(5, 2);
const evaluation = await manager.evaluate(testFeatures, testLabels);
const metrics = await manager.getMetrics();

await manager.delete();
```

---

### Example 3: Error Handling

```typescript
import {
  FederatedLearningClient,
  ValidationError,
  SessionNotFoundError,
} from './federated-learning-client';

const client = new FederatedLearningClient();

try {
  // This will throw ValidationError
  await client.createSession({
    initialWeights: [],  // Invalid: empty
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation error: ${error.message}`);
  }
}

try {
  // This will throw SessionNotFoundError
  await client.getSession('non-existent-session');
} catch (error) {
  if (error instanceof SessionNotFoundError) {
    console.error(`Session not found: ${error.message}`);
  }
}
```

---

### Example 4: Batch Operations

```typescript
const batch = new BatchOperations(client);

// Create session with multiple clients at once
const clients = [
  {
    clientId: 'client-1',
    features: Array(50).fill(0).map(() => Array(10).fill(0).map(() => Math.random())),
    labels: Array(50).fill(0).map(() => Math.round(Math.random())),
  },
  {
    clientId: 'client-2',
    features: Array(50).fill(0).map(() => Array(10).fill(0).map(() => Math.random())),
    labels: Array(50).fill(0).map(() => Math.round(Math.random())),
  },
];

const manager = await batch.createSessionWithClients(
  {
    initialWeights: Array(10).fill(0.1),
    aggregationStrategy: 'median',
  },
  clients
);

// Train with periodic evaluation
const results = await batch.trainWithEvaluation(
  manager,
  10,                           // 10 total rounds
  2,                            // Evaluate every 2 rounds
  testFeatures,
  testLabels
);

console.log('Training progress:');
results.forEach(r => {
  console.log(`  Round ${r.round}: ${r.accuracy}%`);
});
```

---

## Error Handling

### Error Classes

```typescript
// Base error class
class FederatedLearningClientError extends Error {
  statusCode: number;
  response?: any;
}

// Specific error subclasses
class SessionNotFoundError extends FederatedLearningClientError
class ClientNotFoundError extends FederatedLearningClientError
class ValidationError extends FederatedLearningClientError
```

### Error Handling Pattern

```typescript
try {
  const result = await client.train(sessionId, { rounds: 5 });
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors (400)
    console.error(`Invalid input: ${error.message}`);
  } else if (error instanceof SessionNotFoundError) {
    // Handle not found errors (404)
    console.error(`Session not found: ${error.message}`);
  } else if (error instanceof FederatedLearningClientError) {
    // Handle other API errors
    console.error(`API error [${error.statusCode}]: ${error.message}`);
  } else {
    // Handle unexpected errors
    console.error(`Unexpected error: ${error}`);
  }
}
```

---

## Advanced Usage

### Custom Configuration

```typescript
const client = new FederatedLearningClient({
  baseUrl: 'https://api.example.com/federated',
  timeout: 60000,         // 60 second timeout
  retryAttempts: 5,       // Retry up to 5 times
  retryDelay: 2000,       // Initial delay of 2 seconds
});
```

### Changing Base URL

```typescript
// Start with production
const client = new FederatedLearningClient({
  baseUrl: 'https://prod.example.com/federated',
});

// Switch to staging for testing
client.setBaseUrl('https://staging.example.com/federated');

// Clear session cache when switching
client.clearCache();
```

### Caching Strategy

The client automatically caches session details. Clear when needed:

```typescript
// Clear all cache
client.clearCache();

// Cache is automatically cleared when:
// - Creating a session
// - Adding/removing clients
// - Training
// - Deleting a session
```

### Building Custom Workflows

```typescript
class CustomFederatedWorkflow {
  private client: FederatedLearningClient;

  constructor() {
    this.client = new FederatedLearningClient();
  }

  async runExperiment(
    config: SessionConfig,
    clients: ClientData[],
    testFeatures: number[][],
    testLabels: number[]
  ) {
    // Create session
    const session = await this.client.createSession(config);

    // Add all clients
    for (const client of clients) {
      await this.client.addClient(session.sessionId, client);
    }

    // Run training with evaluation
    const results = [];
    for (let round = 0; round < 5; round++) {
      await this.client.train(session.sessionId, { rounds: 1 });
      const eval = await this.client.evaluate(
        session.sessionId,
        { testFeatures, testLabels }
      );
      results.push({ round: round + 1, accuracy: eval.accuracy });
    }

    // Get final metrics
    const metrics = await this.client.getMetrics(session.sessionId);

    // Cleanup
    await this.client.deleteSession(session.sessionId);

    return { results, metrics };
  }
}
```

---

## TypeScript Types

All major types are exported from the client module:

```typescript
export type {
  ClientData,
  TrainingRequest,
  EvaluationRequest,
  SessionConfig,
  SessionResponse,
  SessionDetails,
  TrainingResponse,
  EvaluationResponse,
  ModelResponse,
  MetricsResponse,
  StrategyInfo,
  ClientConfig,
  // ... and more
};

export class FederatedLearningClientError { ... }
export class SessionNotFoundError { ... }
export class ClientNotFoundError { ... }
export class ValidationError { ... }
```

---

## Performance Tips

1. **Batch Operations**: Use `BatchOperations.createSessionWithClients()` instead of adding clients one-by-one
2. **Training Strategy**: Larger epochs per round reduces communication overhead
3. **Caching**: Utilize automatic session caching - it's cleared appropriately
4. **Error Retry**: Automatic retry with exponential backoff for transient failures
5. **Connection Pooling**: Consider HTTP client connection pooling for production

---

## Troubleshooting

### "Session not found" Error

```typescript
// Make sure you're using the correct sessionId
const session = await client.createSession({...});
// Use session.sessionId, not session.id
await client.train(session.sessionId, {...});
```

### Validation Errors on Training

```typescript
// Ensure at least one client is added before training
await client.addClient(sessionId, {...});
const result = await client.train(sessionId, {rounds: 1});
```

### Timeout Issues

```typescript
// Increase timeout for large datasets
const client = new FederatedLearningClient({
  timeout: 120000,  // 2 minutes
});
```

---

## Further Reading

- [API Documentation](./FEDERATED_LEARNING_API.md)
- [Framework Documentation](./FEDERATED_LEARNING.md)
- [Usage Examples](./src/api/federated-learning-client.demo.ts)
