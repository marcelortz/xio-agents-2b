/**
 * Federated Learning Client Library - Examples and Tests
 */

import {
  FederatedLearningClient,
  SessionManager,
  BatchOperations,
  ClientData,
  ValidationError,
  SessionNotFoundError,
  ClientNotFoundError,
} from './federated-learning-client';

// ============================================================================
// Example 1: Basic Session Management
// ============================================================================

async function exampleBasicSession() {
  console.log('\n=== Example 1: Basic Session Management ===\n');

  const client = new FederatedLearningClient({
    baseUrl: 'http://localhost:3000/federated',
  });

  try {
    // Create a session
    const sessionResponse = await client.createSession({
      initialWeights: Array(10).fill(0.1),
      aggregationStrategy: 'averaging',
    });

    console.log(`✓ Session created: ${sessionResponse.sessionId}`);

    // Get session details
    const sessionDetails = await client.getSession(sessionResponse.sessionId);
    console.log(`✓ Session status: ${sessionDetails.status}`);
    console.log(`✓ Clients: ${sessionDetails.clientCount}`);

    // List all sessions
    const sessions = await client.listSessions();
    console.log(`✓ Total sessions: ${sessions.totalSessions}`);

    return sessionResponse.sessionId;
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 2: Client Management
// ============================================================================

async function exampleClientManagement(sessionId: string) {
  console.log('\n=== Example 2: Client Management ===\n');

  const client = new FederatedLearningClient();

  try {
    // Create sample training data
    const clientData1: ClientData = {
      clientId: 'client-1',
      features: [
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.1],
      ],
      labels: [1, 0],
    };

    // Add client
    const addResponse = await client.addClient(sessionId, clientData1);
    console.log(`✓ Client added: ${addResponse.clientId}`);
    console.log(`✓ Samples: ${addResponse.samplesAdded}`);

    // Add more clients
    for (let i = 2; i <= 3; i++) {
      const features = Array(2)
        .fill(0)
        .map(() => Array(10).fill(0).map(() => Math.random()));

      await client.addClient(sessionId, {
        clientId: `client-${i}`,
        features,
        labels: [Math.round(Math.random()), Math.round(Math.random())],
      });
    }

    // List clients
    const clientList = await client.listClients(sessionId);
    console.log(`✓ Total clients: ${clientList.totalClients}`);
    clientList.clients.forEach(c => {
      console.log(`  - ${c.clientId}: ${c.samplesCount} samples`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 3: Training and Evaluation
// ============================================================================

async function exampleTraining(sessionId: string) {
  console.log('\n=== Example 3: Training and Evaluation ===\n');

  const client = new FederatedLearningClient();

  try {
    // Run training
    console.log('Running federated training...');
    const trainingResponse = await client.train(sessionId, {
      rounds: 3,
      epochs: 2,
    });

    console.log(`✓ Training completed`);
    console.log(`✓ Rounds: ${trainingResponse.roundsCompleted}`);
    console.log(`✓ Duration: ${trainingResponse.duration}ms`);
    console.log(`✓ Avg time per round: ${trainingResponse.averageTimePerRound}ms`);

    // Get model
    const modelResponse = await client.getModel(sessionId);
    console.log(`✓ Model dimension: ${modelResponse.globalModel.dimension}`);
    console.log(
      `✓ First 3 weights: ${modelResponse.globalModel.weights.slice(0, 3).map(w => w.toFixed(4)).join(', ')}`
    );

    // Evaluate model
    const testFeatures = Array(5)
      .fill(0)
      .map(() => Array(10).fill(0).map(() => Math.random()));
    const testLabels = [1, 0, 1, 0, 1];

    const evaluation = await client.evaluate(sessionId, {
      testFeatures,
      testLabels,
    });

    console.log(`✓ Model accuracy: ${evaluation.accuracy}%`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 4: Session Manager (High-level API)
// ============================================================================

async function exampleSessionManager() {
  console.log('\n=== Example 4: Session Manager (High-level API) ===\n');

  const client = new FederatedLearningClient();

  try {
    // Create session
    const sessionResponse = await client.createSession({
      initialWeights: Array(10).fill(0.1),
      aggregationStrategy: 'median',
    });

    // Use SessionManager for easier operations
    const manager = new SessionManager(client, sessionResponse.sessionId);

    console.log(`✓ Session manager created`);

    // Add clients using manager
    for (let i = 1; i <= 2; i++) {
      const features = Array(3)
        .fill(0)
        .map(() => Array(10).fill(0).map(() => Math.random()));
      const labels = [1, 0, 1];

      await manager.addClient({
        clientId: `client-${i}`,
        features,
        labels,
      });
    }

    // Train using manager
    const training = await manager.train(2, 1);
    console.log(`✓ Training completed: ${training.roundsCompleted} rounds`);

    // Evaluate using manager
    const testFeatures = Array(2)
      .fill(0)
      .map(() => Array(10).fill(0).map(() => Math.random()));
    const testLabels = [1, 0];

    const evaluation = await manager.evaluate(testFeatures, testLabels);
    console.log(`✓ Evaluation accuracy: ${evaluation.accuracy}%`);

    // Get metrics
    const metrics = await manager.getMetrics();
    console.log(`✓ Metrics retrieved`);
    console.log(`  - Communication rounds: ${metrics.metrics.communicationRounds}`);
    console.log(`  - Client count: ${metrics.metrics.clientCount}`);
    console.log(`  - Strategy: ${metrics.metrics.aggregationStrategy}`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 5: Batch Operations
// ============================================================================

async function exampleBatchOperations() {
  console.log('\n=== Example 5: Batch Operations ===\n');

  const client = new FederatedLearningClient();
  const batch = new BatchOperations(client);

  try {
    // Create clients data
    const clients: ClientData[] = [];
    for (let i = 1; i <= 3; i++) {
      clients.push({
        clientId: `batch-client-${i}`,
        features: Array(4)
          .fill(0)
          .map(() => Array(10).fill(0).map(() => Math.random())),
        labels: [1, 0, 1, 0],
      });
    }

    // Create session and add all clients at once
    console.log('Creating session with multiple clients...');
    const manager = await batch.createSessionWithClients(
      {
        initialWeights: Array(10).fill(0.1),
        aggregationStrategy: 'averaging',
      },
      clients
    );

    console.log(`✓ Session created with ${clients.length} clients`);

    // Train with periodic evaluation
    console.log('Training with periodic evaluation...');
    const testFeatures = Array(5)
      .fill(0)
      .map(() => Array(10).fill(0).map(() => Math.random()));
    const testLabels = [1, 0, 1, 0, 1];

    const results = await batch.trainWithEvaluation(
      manager,
      4,
      2,
      testFeatures,
      testLabels
    );

    console.log('✓ Training with evaluation completed');
    results.forEach(r => {
      console.log(`  - Round ${r.round}: Accuracy ${r.accuracy}%`);
    });

    // Clean up
    await manager.delete();
    console.log('✓ Session deleted');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 6: Error Handling
// ============================================================================

async function exampleErrorHandling() {
  console.log('\n=== Example 6: Error Handling ===\n');

  const client = new FederatedLearningClient();

  try {
    // Test validation errors
    console.log('Testing validation errors...');
    try {
      await client.createSession({
        initialWeights: [], // Invalid: empty
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        console.log(`✓ Caught ValidationError: ${error.message}`);
      }
    }

    try {
      await client.getSession('invalid-session'); // This will trigger a 404
    } catch (error) {
      if (error instanceof SessionNotFoundError) {
        console.log(`✓ Caught SessionNotFoundError: ${error.message}`);
      }
    }

    // Test client data validation
    try {
      const sessionResponse = await client.createSession({
        initialWeights: Array(10).fill(0.1),
      });

      await client.addClient(sessionResponse.sessionId, {
        clientId: 'test',
        features: [[1, 2, 3]], // 3 features
        labels: [1, 0], // 2 labels - mismatch!
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        console.log(`✓ Caught ValidationError (mismatched data): ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Example 7: Strategies
// ============================================================================

async function exampleStrategies() {
  console.log('\n=== Example 7: Available Strategies ===\n');

  const client = new FederatedLearningClient();

  try {
    const strategies = await client.getStrategies();
    console.log('Available aggregation strategies:\n');

    strategies.strategies.forEach(strategy => {
      console.log(`📊 ${strategy.name}`);
      console.log(`   ID: ${strategy.id}`);
      console.log(`   Description: ${strategy.description}`);
      console.log(`   Robustness: ${strategy.robustness}`);
      console.log(`   Speed: ${strategy.speed}`);
      console.log(`   Use Case: ${strategy.useCase}\n`);
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  Federated Learning Client Library - Examples      ║');
  console.log('╚════════════════════════════════════════════════════╝');

  try {
    // Run examples
    const sessionId = await exampleBasicSession();

    if (sessionId) {
      await exampleClientManagement(sessionId);
      await exampleTraining(sessionId);

      // Clean up first session
      const client = new FederatedLearningClient();
      await client.deleteSession(sessionId);
      console.log('\n✓ First session cleaned up');
    }

    await exampleSessionManager();
    await exampleBatchOperations();
    await exampleErrorHandling();
    await exampleStrategies();

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║  ✓ All examples completed successfully!            ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export { exampleBasicSession, exampleClientManagement, exampleTraining, exampleSessionManager, exampleBatchOperations, exampleErrorHandling, exampleStrategies };
