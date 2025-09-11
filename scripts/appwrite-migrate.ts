/*
  Appwrite migration/check script
  - Verifies existence of required collections, attributes, and indexes
  - Creates any missing ones

  Usage:
    APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
    APPWRITE_PROJECT_ID=your_project \
    APPWRITE_API_KEY=your_api_key \
    APPWRITE_DATABASE_ID=your_db \
    npx ts-node -r tsconfig-paths/register scripts/appwrite-migrate.ts
*/

import 'dotenv/config';
import { Client, Databases, ID, Models } from 'node-appwrite';

// Helpers
type AttrType = 'string' | 'integer' | 'boolean' | 'float' | 'enum';

interface AttributeDef {
  key: string;
  type: AttrType;
  size?: number; // for string
  required?: boolean;
  default?: any;
  array?: boolean;
  enum?: string[]; // for enum
}

interface IndexDef {
  key: string;
  type: 'key' | 'fulltext';
  attributes: string[];
  orders?: ('ASC' | 'DESC')[];
}

interface CollectionSchema {
  id: string; // collectionId
  name?: string; // optional human name
  attributes: AttributeDef[];
  indexes?: IndexDef[];
}

const requiredEnv = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY', 'APPWRITE_DATABASE_ID'] as const;
for (const k of requiredEnv) {
  if (!process.env[k]) {
    console.error(`Missing env ${k}`);
    process.exit(1);
  }
}

const endpoint = process.env.APPWRITE_ENDPOINT as string;
const project = process.env.APPWRITE_PROJECT_ID as string;
const apiKey = process.env.APPWRITE_API_KEY as string;
const databaseId = process.env.APPWRITE_DATABASE_ID as string;

const client = new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey);
const databases = new Databases(client);

function s(key: string, size = 255, required = false, array = false, def?: any): AttributeDef {
  return { key, type: 'string', size, required, array, default: def };
}
function i(key: string, required = false, array = false, def?: any): AttributeDef {
  return { key, type: 'integer', required, array, default: def };
}
function b(key: string, required = false, array = false, def?: any): AttributeDef {
  return { key, type: 'boolean', required, array, default: def };
}
function e(key: string, values: string[], required = false, array = false, def?: any): AttributeDef {
  return { key, type: 'enum', enum: values, required, array, default: def };
}

function idx(key: string, attributes: string[], orders?: ('ASC' | 'DESC')[]): IndexDef {
  return { key, type: 'key', attributes, orders };
}

// Define the schema per earlier audit
const schemas: CollectionSchema[] = [
  {
    id: process.env.APPWRITE_COLLECTION_USER_PROFILES || 'user_profiles',
    attributes: [s('user_id', 128, true), s('email', 256, true), s('full_name', 256, false), s('created_at', 64, true), s('updated_at', 64, true)],
    indexes: [idx('user_id_idx', ['user_id']), idx('email_idx', ['email'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_WALLETS || 'wallets',
    attributes: [s('user_id', 128, true), i('balance', true), s('created_at', 64, true), s('updated_at', 64, true)],
    indexes: [idx('user_id_idx', ['user_id'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_TRANSACTIONS || 'transactions',
    attributes: [
      s('user_id', 128, true),
      s('wallet_id', 128, false), // optional for non-wallet audit entries
      s('type', 32, true),
      s('status', 32, true),
      i('amount', true),
      i('balance_before', false), // optional for non-wallet audit entries
      i('balance_after', false),  // optional for non-wallet audit entries
      s('description', 1024, false),
      s('reference_id', 256, false),
      s('reference_type', 64, false),
      s('metadata', 8192, false),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [
      idx('user_id_idx', ['user_id']),
      idx('type_idx', ['type']),
      idx('reference_id_idx', ['reference_id']),
      idx('reference_type_idx', ['reference_type']),
      idx('ref_type_idx', ['reference_id', 'type']),
      idx('created_at_idx', ['created_at'], ['DESC']),
    ],
  },
  {
    id: process.env.APPWRITE_COLLECTION_ORDERS || 'orders',
    attributes: [
      s('user_id', 128, true),
      s('title', 256, true),
      s('description', 4096, false),
      i('total_amount', true),
      s('status', 32, true),
      s('payment_status', 32, true),
      s('comments', 2048, false),
      i('total_pages', false),
      i('total_sections', false),
      s('payment_gateway', 64, false),
      s('callback_url', 512, false),
      s('return_url', 512, false),
      s('zarinpal_authority', 128, false),
      s('zarinpal_ref_id', 128, false),
      s('session_id', 256, false),
      s('site_type', 64, false),
      s('wizard_data', 16384, false),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [
      idx('user_id_idx', ['user_id']),
      idx('status_idx', ['status']),
      idx('payment_status_idx', ['payment_status']),
      idx('zarinpal_authority_idx', ['zarinpal_authority']),
      idx('zarinpal_ref_id_idx', ['zarinpal_ref_id']),
      idx('session_id_idx', ['session_id']),
      idx('created_at_idx', ['created_at'], ['DESC']),
    ],
  },
  {
    id: process.env.APPWRITE_COLLECTION_PAYMENTS || 'payments',
    attributes: [
      s('order_id', 128, true),
      s('user_id', 128, true),
      s('transaction_type', 64, true),
      s('zarinpal_authority', 128, false),
      s('zarinpal_ref_id', 128, false),
      i('amount', true),
      s('status', 32, true),
      s('gateway_response', 16384, false),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [
      idx('authority_idx', ['zarinpal_authority']),
      idx('user_id_idx', ['user_id']),
      idx('order_id_idx', ['order_id']),
      idx('status_idx', ['status']),
      idx('created_at_idx', ['created_at'], ['DESC']),
    ],
  },
  {
    id: process.env.APPWRITE_COLLECTION_INVOICES || 'invoices',
    attributes: [
      s('user_id', 128, true),
      s('order_id', 128, true),
      i('amount', true),
      s('due_date', 64, true),
      s('status', 32, true),
      s('description', 1024, false),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [idx('user_id_idx', ['user_id']), idx('order_id_idx', ['order_id']), idx('status_idx', ['status'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_RECEIPTS || 'receipts',
    attributes: [
      s('user_id', 128, false),
      s('invoice_id', 128, false), // optional to support wallet receipts without invoices
      s('ref_id', 128, true),
      s('reference_type', 64, false),
      s('reference_id', 256, false),
      i('amount', true),
      s('format', 16, true),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [
      idx('user_id_idx', ['user_id']),
      idx('invoice_id_idx', ['invoice_id']),
      idx('reference_idx', ['reference_type', 'reference_id']),
      idx('created_at_idx', ['created_at'], ['DESC']),
    ],
  },
  {
    id: process.env.APPWRITE_COLLECTION_NOTIFICATIONS || 'notifications',
    attributes: [
      s('user_id', 128, true),
      s('order_id', 128, false),
      s('notification_type', 64, true),
      s('message', 2048, true),
      s('priority', 16, true),
      s('channels', 64, false, true),
      s('metadata', 8192, false),
      s('status', 32, true),
      s('sent_channels', 64, false, true),
      s('failed_channels', 64, false, true),
      s('read_at', 64, false),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [
      idx('user_id_idx', ['user_id']),
      idx('type_idx', ['notification_type']),
      idx('status_idx', ['status']),
      idx('created_at_idx', ['created_at'], ['DESC']),
    ],
  },
  {
    id: process.env.APPWRITE_COLLECTION_NOTIFICATION_PREFERENCES || 'notification_preferences',
    attributes: [
      s('user_id', 128, true),
      s('email', 1024, false),
      s('sms', 1024, false),
      s('push', 1024, false),
      s('dashboard', 1024, false),
      s('created_at', 64, false),
      s('updated_at', 64, false),
    ],
    indexes: [idx('user_id_idx', ['user_id'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_WIZARD_SESSIONS || 'wizard_sessions',
    attributes: [
      s('session_id', 256, true),
      s('user_id', 128, false),
      s('status', 32, true),
      s('project_files', 16384, false), // stored as JSON string or managed in storage mapping
      b('is_completed', false, false, false),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [idx('session_id_idx', ['session_id']), idx('user_id_idx', ['user_id']), idx('updated_at_idx', ['updated_at'], ['DESC'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_DESIGNS || 'designs',
    attributes: [
      s('order_id', 128, true),
      s('user_id', 128, true),
      s('dynamic_design', 16384, false),
      s('options', 4096, false),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [idx('order_id_idx', ['order_id'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_SITE_CONFIG || 'site_config',
    attributes: [s('mode', 32, true), s('created_at', 64, true), s('updated_at', 64, true)],
    indexes: [idx('created_at_idx', ['created_at'], ['DESC'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_EMAIL_LOGS || 'email_logs',
    attributes: [
      s('to_email', 256, true),
      s('subject', 512, true),
      b('success', true),
      s('error_message', 2048, false),
      s('service_used', 64, true),
      s('template_type', 64, true),
      s('sent_at', 64, true),
    ],
    indexes: [idx('success_idx', ['success']), idx('template_type_idx', ['template_type']), idx('sent_at_idx', ['sent_at'], ['DESC'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_PUSH_TOKENS || 'push_tokens',
    attributes: [s('user_id', 128, true), s('token', 512, true), b('active', true), s('created_at', 64, true)],
    indexes: [idx('user_id_idx', ['user_id']), idx('active_idx', ['active'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_PROJECT_FILES || 'project_files',
    attributes: [
      s('file_id', 128, true),
      s('user_id', 128, false),
      s('order_id', 128, false),
      s('bucket_id', 128, true),
      s('original_name', 512, false),
      s('mime_type', 128, false),
      i('size', false),
      s('description', 1024, false),
      s('created_at', 64, true),
    ],
    indexes: [idx('user_id_idx', ['user_id']), idx('order_id_idx', ['order_id']), idx('created_at_idx', ['created_at'], ['DESC'])],
  },
  // Support tickets (as used by SupportService)
  {
    id: process.env.APPWRITE_COLLECTION_SUPPORT_TICKETS || 'support_tickets',
    attributes: [
      s('user_id', 128, true),
      s('type', 64, true),
      s('order_id', 128, false),
      s('transactionId', 128, false),
      s('description', 4096, true),
      s('priority', 16, true),
      s('status', 32, true),
      s('attachments', 8192, false),
      s('contactPreference', 32, true),
      s('userAgent', 512, false),
      s('ipAddress', 64, false),
      s('messages', 16384, false),
      s('created_at', 64, true),
      s('updated_at', 64, true),
    ],
    indexes: [idx('user_id_idx', ['user_id']), idx('status_idx', ['status']), idx('created_at_idx', ['created_at'], ['DESC'])],
  },
  // Optional future collections based on env
  {
    id: process.env.APPWRITE_COLLECTION_AUDIT_LOGS || 'audit_logs',
    attributes: [
      s('user_id', 128, false),
      s('action', 128, true),
      s('resource', 256, true),
      s('metadata', 8192, false),
      s('created_at', 64, true),
    ],
    indexes: [idx('user_id_idx', ['user_id']), idx('created_at_idx', ['created_at'], ['DESC'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_SYSTEM_SETTINGS || 'system_settings',
    attributes: [
      s('key', 128, true),
      s('value', 4096, false),
      s('updated_at', 64, true),
    ],
    indexes: [idx('key_idx', ['key'])],
  },
  {
    id: process.env.APPWRITE_COLLECTION_AUTH_TOKENS || 'auth_tokens',
    attributes: [
      s('user_id', 128, true),
      s('token', 1024, true),
      s('type', 64, true),
      s('expires_at', 64, true),
      s('created_at', 64, true),
    ],
    indexes: [idx('user_id_idx', ['user_id']), idx('type_idx', ['type'])],
  },
];

async function ensureCollection(collectionId: string, name?: string) {
  try {
    await databases.getCollection(databaseId, collectionId);
    console.log(`✔ Collection exists: ${collectionId}`);
  } catch (err: any) {
    if (err?.code === 404) {
      console.log(`➕ Creating collection: ${collectionId}`);
      await databases.createCollection(databaseId, collectionId, name || collectionId, []);
      console.log(`✔ Created collection: ${collectionId}`);
    } else {
      throw err;
    }
  }
}

async function listAttributeKeys(collectionId: string): Promise<Set<string>> {
  const attrs = await databases.listAttributes(databaseId, collectionId as any);
  const keys = new Set<string>();
  // @ts-ignore: attribute models vary
  for (const a of (attrs as any).attributes || []) {
    if (a.key) keys.add(a.key as string);
  }
  return keys;
}

async function ensureAttribute(collectionId: string, def: AttributeDef) {
  try {
    const exists = await listAttributeKeys(collectionId);
    if (exists.has(def.key)) {
      console.log(`  • Attribute exists: ${collectionId}.${def.key}`);
      return;
    }
    console.log(`  + Creating attribute: ${collectionId}.${def.key} (${def.type}${def.array ? '[]' : ''})`);
    const required = !!def.required;
    const array = !!def.array;
    const defVal = def.default;

    switch (def.type) {
      case 'string':
        await databases.createStringAttribute(databaseId, collectionId, def.key, def.size || 255, required, defVal, array);
        break;
      case 'integer':
        await databases.createIntegerAttribute(databaseId, collectionId, def.key, required, undefined as any, undefined as any, defVal);
        break;
      case 'boolean':
        await databases.createBooleanAttribute(databaseId, collectionId, def.key, required, defVal, array);
        break;
      case 'float':
        await databases.createFloatAttribute(databaseId, collectionId, def.key, required, undefined as any, undefined as any, defVal);
        break;
      case 'enum':
        await databases.createEnumAttribute(databaseId, collectionId, def.key, def.enum || [], required, defVal, array);
        break;
      default:
        console.warn(`  ! Unknown attribute type for ${collectionId}.${def.key}`);
    }
  } catch (err: any) {
    if (err?.code === 409) {
      console.log(`  • Attribute already created (409): ${collectionId}.${def.key}`);
    } else {
      console.error(`  ✖ Failed to create attribute ${collectionId}.${def.key}:`, err?.message || err);
      throw err;
    }
  }
}

async function listIndexKeys(collectionId: string): Promise<Set<string>> {
  const idxs = await databases.listIndexes(databaseId, collectionId as any);
  const keys = new Set<string>();
  // @ts-ignore
  for (const i of (idxs as any).indexes || []) {
    if (i.key) keys.add(i.key as string);
  }
  return keys;
}

async function ensureIndex(collectionId: string, def: IndexDef) {
  try {
    const existing = await listIndexKeys(collectionId);
    if (existing.has(def.key)) {
      console.log(`  • Index exists: ${collectionId}.${def.key}`);
      return;
    }
    console.log(`  + Creating index: ${collectionId}.${def.key} -> [${def.attributes.join(', ')}]`);
    await databases.createIndex(databaseId, collectionId, def.key, def.type as any, def.attributes, def.orders);
  } catch (err: any) {
    if (err?.code === 409) {
      console.log(`  • Index already created (409): ${collectionId}.${def.key}`);
    } else {
      console.error(`  ✖ Failed to create index ${collectionId}.${def.key}:`, err?.message || err);
      throw err;
    }
  }
}

async function main() {
  console.log('== Appwrite Migration/Check ==');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project : ${project}`);
  console.log(`Database: ${databaseId}`);

  // Sanity check DB
  try {
    await databases.get(databaseId);
  } catch (err: any) {
    console.error('Database not found or inaccessible. Ensure APPWRITE_DATABASE_ID is correct and API key has permissions.');
    throw err;
  }

  for (const schema of schemas) {
    console.log(`\n>>> Ensuring collection: ${schema.id}`);
    await ensureCollection(schema.id, schema.name);

    for (const attr of schema.attributes) {
      await ensureAttribute(schema.id, attr);
    }

    if (schema.indexes) {
      for (const ix of schema.indexes) {
        await ensureIndex(schema.id, ix);
      }
    }
  }

  console.log('\nAll collections and attributes verified.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

