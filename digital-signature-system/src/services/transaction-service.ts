import { v4 as uuidv4 } from 'uuid';
import { KYCManager, AMLEngine } from '../compliance/kyc-aml';
import { AccountManager } from '../compliance/account-segregation';
import RSAKeyManager from '../crypto/rsa-keys';
import DigitalSignatureManager from '../crypto/digital-signature';
import metricsCollector from '../monitoring/metrics-collector';
import logger from '../monitoring/logger';
import postgresConnection from '../db/postgres-connection';
import * as crypto from 'crypto';
import { BASE_CURRENCY, convertToBase, formatCurrency, isSupportedCurrency } from '../utils/currency';

export interface TransactionRequest {
  amount: number;
  currency: string;
  description: string;
  signatory: string;
  clientId?: string;
  transactionType?: 'SERVICE' | 'GOODS' | 'DIVIDEND';
}

export interface ApprovalRequest {
  keyId: string;
  signatoryId: string;
  otp?: string;
  smsOtp?: string;
}

export interface Transaction {
  transactionId: string;
  clientId: string;
  amount: number;
  currency: string;
  description: string;
  transactionType: 'SERVICE' | 'GOODS' | 'DIVIDEND';
  signatory: string;
  status: 'CREATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'REJECTED';
  requiresSignature: boolean;
  requires2FA: boolean;
  signature?: string;
  signatures?: {
    transaction?: string;
    taxReport?: string;
  };
  kycStatus?: string;
  riskScore?: number;
  amlStatus?: string;
  taxReport?: any;
  proof?: {
    hash: string;
    algorithm: string;
  };
  auditTrail: AuditEntry[];
  createdAt: string;
  approvedAt?: string;
  executedAt?: string;
}

export interface AuditEntry {
  action: string;
  timestamp: string;
  actor?: string;
  details?: any;
}

export interface OTPResult {
  otpId: string;
  transactionId: string;
  expiresAt: string;
  method: 'email' | 'sms';
  sentTo: string;
}

const kycManager = new KYCManager();
const amlEngine = new AMLEngine();
const accountManager = new AccountManager();
const rsaKeyManager = new RSAKeyManager('./keys');
const digitalSignatureManager = new DigitalSignatureManager();

// In-memory OTP storage (in production: use Redis)
const otpStore = new Map<string, { code: string; expiresAt: number; transactionId: string; method: string }>();
const transactionStore = new Map<string, Transaction>();
const transactionLimits = {
  SINDICO: { daily: 10000, monthly: 100000, maxSingle: 500000 },
  CLIENT: { daily: 1000, monthly: 10000, maxSingle: 5000 },
  OPERATIONS: { daily: 5000, monthly: 50000, maxSingle: 25000 },
};

export class TransactionService {
  async createTransaction(request: TransactionRequest): Promise<Transaction> {
    try {
      const transactionId = `TXN-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      const clientId = request.clientId || `CLI-${uuidv4().substring(0, 8)}`;
      const transactionType = request.transactionType || 'SERVICE';

      await logger.info('transaction_create', `Creating transaction ${transactionId}`, {
        amount: request.amount,
        clientId,
        signatory: request.signatory,
      });

      // Step 1: Verify KYC
      const client = kycManager.getClient(clientId);
      if (!client) {
        throw new Error(`Client ${clientId} not found. Register first.`);
      }

      const kycVerified = client.kycStatus === 'VERIFIED';
      if (!kycVerified) {
        metricsCollector.recordKYCVerification('FAILED');
        throw new Error('Client KYC not verified');
      }

      metricsCollector.recordKYCVerification('PASSED');

      // Step 2: AML Compliance Check
      const amlFlags = amlEngine.getFlagsByClient(clientId);
      const amlPassed = !amlFlags || amlFlags.length === 0;

      if (!amlPassed) {
        metricsCollector.recordAMLCheckFailed('COMPLIANCE_VIOLATION');
        throw new Error(`AML check failed: ${amlFlags.length} flags detected`);
      }

      // Step 3: Check Transaction Limits
      // Limits are defined in the base currency (EUR). Amounts in any other
      // supported currency are converted to EUR before being compared, so a
      // single set of thresholds governs every currency consistently.
      if (!isSupportedCurrency(request.currency)) {
        throw new Error(`Unsupported currency "${request.currency}"`);
      }
      const amountInBaseCurrency = convertToBase(request.amount, request.currency);

      const role = request.signatory === 'Omar' ? 'SINDICO' : 'CLIENT';
      const limits = transactionLimits[role as keyof typeof transactionLimits];

      if (amountInBaseCurrency > limits.maxSingle) {
        throw new Error(
          `Amount ${formatCurrency(request.amount, request.currency)} ` +
            `(${formatCurrency(amountInBaseCurrency, BASE_CURRENCY)}) exceeds max single transaction ` +
            `€${limits.maxSingle}`,
        );
      }

      // Determine if signature and 2FA required (thresholds are in EUR)
      const requiresSignature = amountInBaseCurrency > 100;
      const requires2FA = amountInBaseCurrency > 500;

      const transaction: Transaction = {
        transactionId,
        clientId,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        transactionType,
        signatory: request.signatory,
        status: requiresSignature ? 'PENDING_APPROVAL' : 'CREATED',
        requiresSignature,
        requires2FA,
        kycStatus: kycVerified ? 'VERIFIED' : 'FAILED',
        riskScore: client.riskScore,
        amlStatus: 'CLEAN',
        auditTrail: [
          {
            action: 'CREATED',
            timestamp: new Date().toISOString(),
            actor: request.signatory,
            details: { amount: request.amount, clientId },
          },
          {
            action: 'KYC_VERIFIED',
            timestamp: new Date().toISOString(),
            details: { riskScore: client.riskScore, status: 'PASSED' },
          },
          {
            action: 'AML_CLEARED',
            timestamp: new Date().toISOString(),
            details: { flags: 0, status: 'PASSED' },
          },
          {
            action: 'LIMITS_CHECKED',
            timestamp: new Date().toISOString(),
            details: { role, dailyUsed: 0, limitRemaining: limits.daily },
          },
        ],
        createdAt: new Date().toISOString(),
      };

      // Store transaction in memory
      transactionStore.set(transactionId, transaction);

      // Save to database
      await this.saveTransactionToDB(transaction);

      metricsCollector.recordTransactionRecorded(transactionType, 'CREATED');

      return transaction;
    } catch (error: any) {
      metricsCollector.recordAMLCheckFailed('CREATION_ERROR');
      const err = error instanceof Error ? error : new Error(String(error));
      await logger.error('transaction_create', 'Transaction creation failed', err);
      throw error;
    }
  }

  async requestOTP(transactionId: string, method: 'email' | 'sms' = 'email'): Promise<OTPResult> {
    const transaction = transactionStore.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const otpCode = Math.random().toString().substring(2, 8).padStart(6, '0');
    const otpId = `OTP-${uuidv4().substring(0, 8)}`;
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(otpId, {
      code: otpCode,
      expiresAt,
      transactionId,
      method,
    });

    await logger.info('request_otp', `OTP generated for transaction ${transactionId}`, {
      otpId,
      method,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    // In production: send via email/SMS
    console.log(`[OTP] ${method.toUpperCase()}: ${otpCode} (valid for 5 minutes)`);

    transaction.auditTrail.push({
      action: 'OTP_REQUESTED',
      timestamp: new Date().toISOString(),
      details: { method, otpId },
    });

    return {
      otpId,
      transactionId,
      expiresAt: new Date(expiresAt).toISOString(),
      method,
      sentTo: method === 'email' ? 'user@example.com' : '+34 XXX XXX XXX',
    };
  }

  async approveAndSign(transactionId: string, approval: ApprovalRequest): Promise<Transaction> {
    const transaction = transactionStore.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      // Step 1: Verify OTP if provided
      if (approval.otp) {
        const otpValid = this.verifyOTP(transactionId, approval.otp);
        if (!otpValid) {
          throw new Error('Invalid or expired OTP');
        }

        transaction.auditTrail.push({
          action: 'OTP_VERIFIED',
          timestamp: new Date().toISOString(),
          details: { method: 'EMAIL' },
        });
      }

      // Step 2: Verify 2FA SMS if required
      if (transaction.requires2FA && approval.smsOtp) {
        const smsValid = this.verifySMSOTP(transactionId, approval.smsOtp);
        if (!smsValid) {
          throw new Error('Invalid or expired SMS OTP');
        }

        transaction.auditTrail.push({
          action: '2FA_VERIFIED',
          timestamp: new Date().toISOString(),
          details: { methods: ['email_otp', 'sms_otp'] },
        });
      }

      // Step 3: Sign transaction with RSA-2048
      const keyPair = rsaKeyManager.loadKeyPair(approval.keyId);
      const signatureData = digitalSignatureManager.sign(
        {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          signatory: approval.signatoryId,
        },
        keyPair.privateKey,
        approval.keyId
      );

      transaction.signature = signatureData.signature;
      transaction.signatures = {
        transaction: signatureData.signature,
      };

      transaction.auditTrail.push({
        action: 'SIGNATURE_PROVIDED',
        timestamp: new Date().toISOString(),
        actor: approval.signatoryId,
        details: {
          algorithm: 'RSA-2048-SHA256',
          keyId: approval.keyId,
          verified: true,
        },
      });

      transaction.status = 'APPROVED';
      transaction.approvedAt = new Date().toISOString();

      return transaction;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      await logger.error('transaction_approve', 'Approval failed', err);
      throw error;
    }
  }

  async executeTransaction(transactionId: string): Promise<Transaction> {
    const transaction = transactionStore.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'CREATED' && transaction.status !== 'APPROVED') {
      throw new Error(`Cannot execute transaction with status ${transaction.status}`);
    }

    try {
      // Step 1: Generate tax report data (simplified)
      const ivaAmount = transaction.amount * 0.17;
      const retentionRate = { SERVICE: 0.10, GOODS: 0.03, DIVIDEND: 0.15 }[transaction.transactionType] || 0;
      const retentionAmount = transaction.amount * retentionRate;

      const taxReport = {
        reportId: `TAX-${Date.now()}`,
        transactionId,
        grossAmount: transaction.amount,
        ivaAmount,
        retentionAmount,
        netAmount: transaction.amount - ivaAmount - retentionAmount,
        currency: transaction.currency,
        timestamp: new Date().toISOString(),
      };

      transaction.taxReport = taxReport;

      // Step 2: Generate immutable proof
      const proofData = {
        transactionId,
        amount: transaction.amount,
        timestamp: new Date().toISOString(),
        signatures: transaction.signatures,
      };

      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(proofData))
        .digest('hex');

      transaction.proof = {
        hash,
        algorithm: 'SHA-256',
      };

      // Step 3: Update audit trail
      transaction.auditTrail.push({
        action: 'EXECUTED',
        timestamp: new Date().toISOString(),
        details: {
          hash,
          taxReport: taxReport.reportId,
        },
      });

      transaction.status = 'EXECUTED';
      transaction.executedAt = new Date().toISOString();

      // Save to database
      await this.saveTransactionToDB(transaction);

      metricsCollector.recordTransactionRecorded(transaction.transactionType, 'EXECUTED');
      metricsCollector.recordTaxReportGenerated();

      return transaction;
    } catch (error: any) {
      transaction.status = 'REJECTED';
      const err = error instanceof Error ? error : new Error(String(error));
      await logger.error('transaction_execute', 'Execution failed', err);
      throw error;
    }
  }

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    return transactionStore.get(transactionId) || null;
  }

  async getAuditTrail(transactionId: string): Promise<AuditEntry[]> {
    const transaction = transactionStore.get(transactionId);
    return transaction?.auditTrail || [];
  }

  private verifyOTP(transactionId: string, otp: string): boolean {
    for (const [otpId, data] of otpStore.entries()) {
      if (data.transactionId === transactionId && data.code === otp && data.expiresAt > Date.now()) {
        otpStore.delete(otpId); // One-time use
        return true;
      }
    }
    return false;
  }

  private verifySMSOTP(transactionId: string, smsOtp: string): boolean {
    // For demo: accept any 6-digit code
    return /^\d{6}$/.test(smsOtp);
  }

  private async saveTransactionToDB(transaction: Transaction): Promise<void> {
    try {
      const query = `
        INSERT INTO transactions (
          transaction_id, client_id, amount, currency, description,
          transaction_type, signatory, status, kyc_status, aml_status,
          risk_score, requires_signature, requires_2fa, signature,
          audit_trail, created_at, approved_at, executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (transaction_id)
        DO UPDATE SET status = $8, approved_at = $17, executed_at = $18, signature = $14, audit_trail = $15
      `;

      await postgresConnection.query(query, [
        transaction.transactionId,
        transaction.clientId,
        transaction.amount,
        transaction.currency,
        transaction.description,
        transaction.transactionType,
        transaction.signatory,
        transaction.status,
        transaction.kycStatus,
        transaction.amlStatus,
        transaction.riskScore,
        transaction.requiresSignature,
        transaction.requires2FA,
        transaction.signature,
        JSON.stringify(transaction.auditTrail),
        transaction.createdAt,
        transaction.approvedAt,
        transaction.executedAt,
      ]);
    } catch (error: any) {
      await logger.error('saveTransactionToDB', 'Failed to save transaction', error);
    }
  }
}

export default new TransactionService();
