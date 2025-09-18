import { Injectable, Logger } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { ID, Query } from 'node-appwrite';

export type OutboxStatus = 'pending' | 'sent' | 'failed';

export interface EmailOutboxRecord {
  $id?: string;
  type: string;
  entity_id: string;
  payload: any;
  status: OutboxStatus;
  attempts: number;
  error_message?: string | null;
  created_at: string;
  sent_at?: string | null;
}

@Injectable()
export class EmailOutboxService {
  private readonly logger = new Logger(EmailOutboxService.name);

  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
  ) {}

  private get ids() {
    return {
      databaseId: this.configService.get<string>('APPWRITE_DATABASE_ID'),
      collectionId: this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_OUTBOX') || 'email_outbox',
    };
  }

  async enqueue(type: string, entity_id: string, payload: any): Promise<EmailOutboxRecord | null> {
    const { databaseId, collectionId } = this.ids;
    if (!databaseId || !collectionId) {
      this.logger.warn('Email outbox not configured, skipping enqueue');
      return null;
    }
    const db = this.appwriteService.getDatabases();

    // Idempotency: if already sent or pending for same type/entity, skip
    try {
      const existing = await db.listDocuments(databaseId, collectionId, [
        Query.equal('type', type),
        Query.equal('entity_id', entity_id),
        Query.limit(1),
      ]);
      if (existing.documents?.length) {
        const doc: any = existing.documents[0];
        if (doc.status === 'sent' || doc.status === 'pending') {
          return doc as EmailOutboxRecord;
        }
      }
    } catch (_) {}

    const now = new Date().toISOString();
    const record: EmailOutboxRecord = {
      type,
      entity_id,
      payload,
      status: 'pending',
      attempts: 0,
      error_message: null,
      created_at: now,
      sent_at: null,
    };

    const created = await db.createDocument(databaseId, collectionId, ID.unique(), {
      ...record,
      payload: JSON.stringify(payload || {}),
    } as any);
    return created as any;
  }

  async listPending(limit = 100): Promise<EmailOutboxRecord[]> {
    const { databaseId, collectionId } = this.ids;
    const db = this.appwriteService.getDatabases();
    const res = await db.listDocuments(databaseId, collectionId, [
      Query.equal('status', 'pending'),
      Query.orderAsc('created_at'),
      Query.limit(limit),
    ]);
    return (res.documents as any[]).map((d) => ({ ...d, payload: this.safeParse(d.payload) }));
  }

  async markSent(id: string): Promise<void> {
    const { databaseId, collectionId } = this.ids;
    const db = this.appwriteService.getDatabases();
    await db.updateDocument(databaseId, collectionId, id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      error_message: null,
      attempts: (undefined as any),
    } as any);
  }

  async markFailed(id: string, attempts: number, error: string): Promise<void> {
    const { databaseId, collectionId } = this.ids;
    const db = this.appwriteService.getDatabases();
    await db.updateDocument(databaseId, collectionId, id, {
      status: 'pending', // keep pending for retry with backoff
      attempts,
      error_message: error,
    } as any);
  }

  async resetAndResend(id: string): Promise<void> {
    const { databaseId, collectionId } = this.ids;
    const db = this.appwriteService.getDatabases();
    await db.updateDocument(databaseId, collectionId, id, {
      status: 'pending',
      attempts: 0,
      error_message: null,
      created_at: new Date().toISOString(),
      sent_at: null,
    } as any);
  }

  async getById(id: string): Promise<EmailOutboxRecord | null> {
    const { databaseId, collectionId } = this.ids;
    const db = this.appwriteService.getDatabases();
    try {
      const doc = await db.getDocument(databaseId, collectionId, id);
      return { ...(doc as any), payload: this.safeParse((doc as any).payload) } as any;
    } catch {
      return null;
    }
  }

  private safeParse(val: any) {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }
}