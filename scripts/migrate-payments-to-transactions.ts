/*
  Migrate legacy `payments` gateway logs into `transactions` as audit records.

  - Reads from the payments collection
  - Writes to the transactions collection with type='payment'
  - Does NOT mutate wallets or balances
  - Adds metadata.audit_migrated=true to mark migrated entries

  Usage:
    APPWRITE_ENDPOINT=... \
    APPWRITE_PROJECT_ID=... \
    APPWRITE_API_KEY=... \
    APPWRITE_DATABASE_ID=... \
    APPWRITE_COLLECTION_PAYMENTS=payments \
    APPWRITE_COLLECTION_TRANSACTIONS=transactions \
    npx ts-node scripts/migrate-payments-to-transactions.ts
*/

import 'dotenv/config';
import { Client, Databases, ID, Query } from 'node-appwrite';

const endpoint = process.env.APPWRITE_ENDPOINT as string;
const project = process.env.APPWRITE_PROJECT_ID as string;
const apiKey = process.env.APPWRITE_API_KEY as string;
const databaseId = process.env.APPWRITE_DATABASE_ID as string;
const paymentsCol = process.env.APPWRITE_COLLECTION_PAYMENTS || 'payments';
const transactionsCol = process.env.APPWRITE_COLLECTION_TRANSACTIONS || 'transactions';

if (!endpoint || !project || !apiKey || !databaseId) {
  console.error('Missing required APPWRITE_* environment variables.');
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const databases = new Databases(client);

async function listPayments(offset = 0, limit = 100): Promise<any[]> {
  const res = await databases.listDocuments(databaseId, paymentsCol, [Query.limit(limit), Query.offset(offset), Query.orderDesc('created_at')]);
  return res.documents as any[];
}

async function findExistingTx(reference_id: string, zarinpal_ref_id?: string): Promise<boolean> {
  try {
    const res = await databases.listDocuments(databaseId, transactionsCol, [
      Query.equal('reference_id', reference_id),
      Query.equal('type', 'payment'),
      Query.limit(50),
    ]);
    for (const doc of res.documents as any[]) {
      const meta = doc.metadata;
      if (meta) {
        try {
          const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
          if (!zarinpal_ref_id || parsed?.zarinpal_ref_id === zarinpal_ref_id) {
            return true;
          }
        } catch {}
      }
    }
    return false;
  } catch {
    return false;
  }
}

function isDepositPayment(p: any): boolean {
  const order_id = p.order_id as string | undefined;
  const ttype = (p.transaction_type as string | '').toLowerCase();
  return !!(order_id && order_id.startsWith('deposit_')) || ttype.includes('wallet_deposit');
}

async function migrateOne(p: any) {
  const user_id = p.user_id;
  const order_id = p.order_id as string | undefined;
  const amount = p.amount || 0;
  const status = p.status || 'completed';
  const zarinpal_authority = p.zarinpal_authority;
  const zarinpal_ref_id = p.zarinpal_ref_id;
  const created_at = p.created_at || new Date().toISOString();
  const updated_at = p.updated_at || created_at;

  const deposit = isDepositPayment(p);
  const reference_type = deposit ? 'wallet_deposit' : 'order';
  const reference_id = deposit ? (zarinpal_authority || order_id || p.$id) : (order_id || p.$id);

  // Idempotency check
  const exists = await findExistingTx(reference_id, zarinpal_ref_id);
  if (exists) return { skipped: true, reason: 'existing' };

  await databases.createDocument(databaseId, transactionsCol, ID.unique(), {
    user_id,
    type: 'payment',
    status,
    amount,
    description: deposit ? 'Wallet deposit (migrated)' : 'Order payment (migrated)',
    reference_type,
    reference_id,
    metadata: JSON.stringify({
      migrated_from: 'payments',
      payment_id: p.$id,
      zarinpal_authority,
      zarinpal_ref_id,
      audit_migrated: true,
    }),
    created_at,
    updated_at,
  } as any);

  return { migrated: true };
}

async function main() {
  console.log('== Migrating payments -> transactions (audit) ==');
  let offset = 0;
  const limit = 100;
  let totalMigrated = 0;
  let totalSkipped = 0;

  while (true) {
    const batch = await listPayments(offset, limit);
    if (batch.length === 0) break;

    for (const p of batch) {
      try {
        const res = await migrateOne(p);
        if (res?.migrated) totalMigrated++;
        if (res?.skipped) totalSkipped++;
      } catch (e: any) {
        console.error(`  ✖ Failed to migrate payment ${p.$id}:`, e?.message || e);
      }
    }

    offset += limit;
    console.log(`  Progress: ${offset} processed; migrated=${totalMigrated}, skipped=${totalSkipped}`);
  }

  console.log(`Done. Migrated=${totalMigrated}, skipped=${totalSkipped}`);
}

main().catch((e) => {
  console.error('Migration failed:', e?.message || e);
  process.exit(1);
});

