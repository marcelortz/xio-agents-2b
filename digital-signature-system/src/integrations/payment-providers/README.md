# Payment provider clients (mock)

Scaffolding for four external financial integrations: Stripe, Revolut, Wise, and Binance.

**Every client here is a mock.** They are fully in-memory, make zero network calls, and can never move real money or place a real trade. They exist so the rest of the system can be built and tested against a stable `FinancialProviderClient` interface today, without needing real credentials.

## Usage

```ts
import { createPaymentProvider } from './payment-providers';

const stripe = createPaymentProvider('stripe', {
  mode: 'mock',
  initialBalances: { USD: 10000 },
});

const payment = await stripe.createTransaction({
  amount: 250,
  asset: 'USD',
  reference: 'invoice-1042',
});

const balance = await stripe.getBalance('USD'); // { asset: 'USD', available: 9750 }
```

Wise additionally exposes `getQuote(sourceAmount, sourceCurrency, targetCurrency)`, mirroring the real Wise flow of quoting a conversion before transferring — it reuses the same exchange rates as `src/utils/currency.ts`.

## Going live — one provider at a time

Do not flip all four to real APIs at once. For each provider, in order:

1. Register for that provider's **sandbox/testnet** environment, not production:
   - Stripe: test-mode API keys (`sk_test_...`)
   - Revolut Business: `sandbox-b2b.revolut.com`
   - Wise: `api.sandbox.transferwise.tech`
   - Binance: `testnet.binance.vision`
2. Implement a new class (e.g. `StripeSandboxClient`) against that sandbox host, implementing the same `FinancialProviderClient` interface — no other code should need to change.
3. Test thoroughly in sandbox before anyone discusses a production/live key.
4. Real API keys are secrets: load from environment variables or a secret manager, never hardcode them, never commit them.

Moving real money or placing real trades is a significant, separate decision that needs its own explicit review — this scaffolding intentionally stops short of it.
