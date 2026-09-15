import {
  FederatedClient,
  FederatedServer,
  FederatedLearningFramework,
  AveragingAggregator,
  WeightedAveragingAggregator,
  MedianAggregator,
  TrimmedMeanAggregator,
  FederatedData,
} from './federated-learning';

function generateSyntheticData(numSamples: number, numFeatures: number): FederatedData {
  const features: number[][] = [];
  const labels: number[] = [];

  for (let i = 0; i < numSamples; i++) {
    const feature = Array.from({ length: numFeatures }, () => Math.random());
    features.push(feature);
    const label = feature.reduce((sum, f) => sum + f, 0) > numFeatures / 2 ? 1 : 0;
    labels.push(label);
  }

  return { features, labels };
}

function runFederatedLearningDemo() {
  console.log('=== Federated Learning Demo ===\n');

  const initialWeights = Array(10).fill(0.1);
  const framework = new FederatedLearningFramework(
    initialWeights,
    new AveragingAggregator()
  );

  console.log('1. Adding clients with local training data...');
  const numClients = 3;
  const samplesPerClient = 50;
  const numFeatures = 10;

  for (let i = 0; i < numClients; i++) {
    const trainingData = generateSyntheticData(samplesPerClient, numFeatures);
    framework.addClient(`client-${i}`, trainingData);
    console.log(`   ✓ Client ${i} added with ${samplesPerClient} samples`);
  }

  console.log('\n2. Running federated training (5 rounds, 2 epochs each)...');
  const result = framework.runTraining(5, 2);
  console.log(`   ✓ Training completed in ${result.rounds} communication rounds`);

  console.log('\n3. Global Model Weights (first 5):');
  const weights = framework.getGlobalModel();
  console.log(`   ${weights.slice(0, 5).map(w => w.toFixed(4)).join(', ')}...`);

  console.log('\n4. Testing global model...');
  const testData = generateSyntheticData(20, numFeatures);
  const accuracy = framework.evaluate(testData.features, testData.labels);
  console.log(`   ✓ Global model accuracy: ${(accuracy * 100).toFixed(2)}%`);

  console.log('\n5. Training Metrics:');
  const metrics = framework.getMetrics();
  console.log(`   - Communication Rounds: ${metrics.communicationRounds}`);
  console.log(`   - Aggregation Strategy: ${metrics.aggregationStrategy}`);
  console.log(`   - Number of Clients: ${metrics.clientCount}`);
  console.log(`   - Training History Length: ${metrics.trainingHistory.length}`);

  return {
    success: true,
    message: 'Federated learning demo completed successfully',
    accuracy,
    rounds: result.rounds,
  };
}

function compareAggregationStrategies() {
  console.log('\n=== Comparing Aggregation Strategies ===\n');

  const initialWeights = Array(10).fill(0.1);
  const strategies = [
    new AveragingAggregator(),
    new MedianAggregator(),
    new TrimmedMeanAggregator(0.2),
  ];

  const results: any[] = [];

  strategies.forEach(strategy => {
    console.log(`Testing ${strategy.name} aggregator...`);

    const framework = new FederatedLearningFramework(initialWeights, strategy);

    for (let i = 0; i < 3; i++) {
      const trainingData = generateSyntheticData(50, 10);
      framework.addClient(`client-${i}`, trainingData);
    }

    framework.runTraining(3, 1);
    const testData = generateSyntheticData(20, 10);
    const accuracy = framework.evaluate(testData.features, testData.labels);

    const result = {
      strategy: strategy.name,
      accuracy,
      rounds: 3,
    };
    results.push(result);
    console.log(`   ✓ Accuracy: ${(accuracy * 100).toFixed(2)}%\n`);
  });

  return results;
}

if (require.main === module) {
  try {
    const demoResult = runFederatedLearningDemo();
    const strategyResults = compareAggregationStrategies();

    console.log('\n=== Summary ===');
    console.log(`Demo Status: ${demoResult.success ? '✓ Success' : '✗ Failed'}`);
    console.log(`Best Accuracy: ${(demoResult.accuracy * 100).toFixed(2)}%`);
    console.log(`Aggregation Strategies Compared: ${strategyResults.length}`);
  } catch (error) {
    console.error('Error running demo:', error);
  }
}

export { runFederatedLearningDemo, compareAggregationStrategies };
