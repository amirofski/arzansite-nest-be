import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, Databases, Account, Storage, Functions, Users, Teams, ID } from 'node-appwrite';
import { AppwriteConfig } from './appwrite.config';

@Injectable()
export class AppwriteService implements OnModuleInit {
  private client: Client;
  private databases: Databases;
  private account: Account;
  private storage: Storage;
  private functions: Functions;
  private users: Users;
  private teams: Teams;
  // Messaging is not guaranteed in node-appwrite v14; keep a loose reference
  private messaging: any = null;

  constructor(private readonly config: AppwriteConfig) {}

  onModuleInit() {
    this.config.validate();

    this.client = new Client()
      .setEndpoint(this.config.endpoint)
      .setProject(this.config.projectId)
      .setKey(this.config.apiKey);

    this.databases = new Databases(this.client);
    this.account = new Account(this.client);
    this.storage = new Storage(this.client);
    this.functions = new Functions(this.client);
    this.users = new Users(this.client);
    this.teams = new Teams(this.client);

    // Best effort: attempt to access Messaging if available in this SDK
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const maybeMessaging = (require('node-appwrite') as any).Messaging;
      if (maybeMessaging) {
        this.messaging = new maybeMessaging(this.client);
      }
    } catch {
      this.messaging = null;
    }
  }

  // Client accessors
  getClient() { return this.client; }
  getDatabases() { return this.databases; }
  getAccount() { return this.account; }
  getStorage() { return this.storage; }
  getFunctions() { return this.functions; }
  getUsers() { return this.users; }
  getTeams() { return this.teams; }
  getMessaging() { return this.messaging; }

  // Configuration accessors
  getConfig() { return this.config; }

  // Authentication methods - Adjusted for node-appwrite v14 positional forms
  async createUser(email: string, password: string, name?: string): Promise<any> {
    try {
      // v14 Users.create signature: create(userId, email, phone, password, name?)
      // We don't collect phone at signup, so pass undefined for the phone slot.
      const user = await this.users.create(
        ID.unique(),
        email,
        undefined as any,
        password,
        name || 'User'
      );
      return user;
    } catch (error: any) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async createSession(email: string, password: string): Promise<any> {
    try {
      // v14 positional signature
      return await this.account.createEmailPasswordSession(email, password);
    } catch (error: any) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async getCurrentUser(jwt: string): Promise<any> {
    try {
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setJWT(jwt);
      const account = new Account(client);
      return await account.get();
    } catch (error: any) {
      throw new Error(`Failed to get current user: ${error.message}`);
    }
  }

  async getCurrentUserFromSession(session_id: string): Promise<any> {
    try {
      const looksLikeJwt = typeof session_id === 'string' && session_id.includes('.') && session_id.split('.').length === 3;

      if (!looksLikeJwt) {
        try {
          const client = new Client()
            .setEndpoint(this.config.endpoint)
            .setProject(this.config.projectId)
            .setSession(session_id);
          const account = new Account(client);
          return await account.get();
        } catch {
          // fallthrough
        }
      }

      const jwtClient = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setJWT(session_id);
      const jwtAccount = new Account(jwtClient);
      return await jwtAccount.get();
    } catch (error: any) {
      throw new Error(`Failed to get current user from session: ${error.message}`);
    }
  }

  async deleteSession(session_id: string) {
    try {
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(session_id);
      const account = new Account(client);
      await account.deleteSession(session_id);
      return { success: true, message: 'Session deleted successfully' };
    } catch (error: any) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  async listUserSessions(_user_id: string) {
    try {
      // Using current account context
      return await this.account.listSessions();
    } catch (error: any) {
      throw new Error(`Failed to list user sessions: ${error.message}`);
    }
  }

  async createEmailPasswordSession(email: string, password: string) {
    return this.createSession(email, password);
  }

  async createVerificationWithUserSession(email: string, password: string, redirectUrl: string) {
    try {
      const session = await this.createSession(email, password);
      const userClient = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(session.$id);
      const userAccount = new Account(userClient);
      // v14 positional
      const verification = await userAccount.createVerification(redirectUrl);
      try { await this.deleteSession(session.$id); } catch {}
      return verification;
    } catch (error: any) {
      throw new Error(`Failed to create verification with user session: ${error.message}`);
    }
  }

  async createRecoveryWithUserSession(email: string, password: string, redirectUrl: string) {
    try {
      const session = await this.createSession(email, password);
      const userClient = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(session.$id);
      const userAccount = new Account(userClient);
      // v14 positional
      const recovery = await userAccount.createRecovery(email, redirectUrl);
      try { await this.deleteSession(session.$id); } catch {}
      return recovery;
    } catch (error: any) {
      throw new Error(`Failed to create recovery with user session: ${error.message}`);
    }
  }

  async createOAuth2Session(provider: string, successUrl: string, failureUrl: string) {
    try {
      const baseUrl = this.config.endpoint.replace('/v1', '');
      const projectId = this.config.projectId;
      const redirectUrl = `${baseUrl}/v1/account/sessions/oauth2/callback/${provider}?project=${projectId}&success=${encodeURIComponent(successUrl)}&failure=${encodeURIComponent(failureUrl)}`;
      return { redirectUrl, provider, projectId };
    } catch (error: any) {
      throw new Error(`Failed to create OAuth2 session: ${error.message}`);
    }
  }

  async createSessionFromOAuth(user_id: string, secret: string) {
    try {
      // v14 positional
      return await this.account.createSession(user_id, secret);
    } catch (error: any) {
      throw new Error(`Failed to create session from OAuth: ${error.message}`);
    }
  }

  async getOAuthUser(sessionSecret: string): Promise<any> {
    try {
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(sessionSecret);
      const account = new Account(client);
      return await account.get();
    } catch (error: any) {
      throw new Error(`Failed to get OAuth user: ${error.message}`);
    }
  }

  async updateVerification(user_id: string, _secret: string): Promise<any> {
    try {
      // v14 positional
      return await this.users.updateEmailVerification(user_id, true);
    } catch (error: any) {
      throw new Error(`Failed to update email verification: ${error.message}`);
    }
  }

  // Database methods - v14 positional
  async createDocument(collectionId: string, data: any, documentId?: string): Promise<any> {
    try {
      return await this.databases.createDocument(
        this.config.databaseId,
        collectionId,
        documentId || ID.unique(),
        data
      );
    } catch (error: any) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  async getDocument(collectionId: string, documentId: string) {
    try {
      return await this.databases.getDocument(
        this.config.databaseId,
        collectionId,
        documentId
      );
    } catch (error: any) {
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  async updateDocument(collectionId: string, documentId: string, data: any) {
    try {
      return await this.databases.updateDocument(
        this.config.databaseId,
        collectionId,
        documentId,
        data
      );
    } catch (error: any) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  async deleteDocument(collectionId: string, documentId: string) {
    try {
      await this.databases.deleteDocument(
        this.config.databaseId,
        collectionId,
        documentId
      );
      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async listDocuments(collectionId: string, queries: string[] = []) {
    try {
      return await this.databases.listDocuments(
        this.config.databaseId,
        collectionId,
        queries
      );
    } catch (error: any) {
      throw new Error(`Failed to list documents: ${error.message}`);
    }
  }

  // Storage methods - v14 positional
  async getFile(bucket_id: string, file_id: string) {
    try {
      return await this.storage.getFile(bucket_id, file_id);
    } catch (error: any) {
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  async deleteFile(bucket_id: string, file_id: string) {
    try {
      await this.storage.deleteFile(bucket_id, file_id);
      return { success: true };
    } catch (error: any) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async listFiles(bucket_id: string, queries: string[] = []) {
    try {
      return await this.storage.listFiles(bucket_id, queries);
    } catch (error: any) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Functions - v14 positional
  async executeFunction(functionId: string, data?: any, xAsync?: boolean) {
    try {
      const body = data ? JSON.stringify(data) : undefined;
      return await this.functions.createExecution(functionId, body, xAsync);
    } catch (error: any) {
      throw new Error(`Failed to execute function: ${error.message}`);
    }
  }

  // Messaging helpers (may be unsupported in v14)
  async createTopic(topicId: string, name: string, subscribe: string[]) {
    if (!this.messaging || !this.messaging.createTopic) {
      throw new Error('Messaging API not available in node-appwrite v14');
    }
    return await this.messaging.createTopic({ topicId, name, subscribe });
  }

  async sendMessage(topicId: string, message: string, data?: any) {
    if (!this.messaging || !this.messaging.createPush) {
      throw new Error('Messaging API not available in node-appwrite v14');
    }
    return await this.messaging.createPush({
      messageId: ID.unique(),
      title: 'Notification',
      body: message,
      topics: topicId ? [topicId] : [],
      users: [],
      targets: [],
      data: data ?? undefined,
    });
  }

  // Utility
  async createJWT() {
    try {
      return await this.account.createJWT();
    } catch (error: any) {
      throw new Error(`Failed to create JWT: ${error.message}`);
    }
  }

  async createAnonymousSession() {
    try {
      return await this.account.createAnonymousSession();
    } catch (error: any) {
      throw new Error(`Failed to create anonymous session: ${error.message}`);
    }
  }

  async updatePassword(password: string, oldPassword?: string): Promise<any> {
    try {
      return await this.account.updatePassword(password, oldPassword);
    } catch (error: any) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }
}

