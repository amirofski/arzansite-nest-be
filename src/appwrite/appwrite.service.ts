import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, Databases, Account, Storage, Functions, Messaging, Users, Teams, ID } from 'node-appwrite';
import { AppwriteConfig } from './appwrite.config';

@Injectable()
export class AppwriteService implements OnModuleInit {
  private client: Client;
  private databases: Databases;
  private account: Account;
  private storage: Storage;
  private functions: Functions;
  private messaging: Messaging;
  private users: Users;
  private teams: Teams;

  constructor(private readonly config: AppwriteConfig) {}

  onModuleInit() {
    this.config.validate();
    
    // Updated client initialization with latest patterns
    this.client = new Client()
      .setEndpoint(this.config.endpoint)
      .setProject(this.config.projectId)
      .setKey(this.config.apiKey);

    // Initialize all services
    this.databases = new Databases(this.client);
    this.account = new Account(this.client);
    this.storage = new Storage(this.client);
    this.functions = new Functions(this.client);
    this.messaging = new Messaging(this.client);
    this.users = new Users(this.client);
    this.teams = new Teams(this.client);
  }

  // Client accessors
  getClient() { return this.client; }
  getDatabases() { return this.databases; }
  getAccount() { return this.account; }
  getStorage() { return this.storage; }
  getFunctions() { return this.functions; }
  getMessaging() { return this.messaging; }
  getUsers() { return this.users; }
  getTeams() { return this.teams; }

  // Configuration accessors
  getConfig() { return this.config; }

  // Authentication methods - Updated for latest SDK
  async createUser(email: string, password: string, name?: string) {
    try {
      // Use Account API to ensure proper "users" role (not "guests")
      const user = await this.account.create(
        ID.unique(),
        email,
        password,
        name,
      );
      
      console.log('✅ User created successfully with latest SDK');
      return user;
    } catch (error) {
      console.error('❌ Failed to create user:', error.message);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async createSession(email: string, password: string) {
    try {
      // Updated method name for latest SDK
      const session = await this.account.createEmailPasswordSession(email, password);
      return session;
    } catch (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  async getCurrentUser(jwt: string) {
    try {
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setJWT(jwt);
      
      const account = new Account(client);
      const user = await account.get();
      return user;
    } catch (error) {
      throw new Error(`Failed to get current user: ${error.message}`);
    }
  }

  async getCurrentUserFromSession(sessionId: string) {
    try {
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(sessionId);

      const account = new Account(client);
      const user = await account.get();
      return user;
    } catch (error) {
      throw new Error(`Failed to get current user from session: ${error.message}`);
    }
  }

  async deleteSession(sessionId: string) {
    try {
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(sessionId);

      const account = new Account(client);
      await account.deleteSession(sessionId);
      return { success: true, message: 'Session deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  async listUserSessions(userId: string) {
    try {
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setKey(this.config.apiKey);

      const account = new Account(client);
      const sessions = await account.listSessions();
      return sessions;
    } catch (error) {
      throw new Error(`Failed to list user sessions: ${error.message}`);
    }
  }

  async createEmailPasswordSession(email: string, password: string) {
    try {
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId);

      const account = new Account(client);
      const session = await account.createEmailPasswordSession(email, password);
      return session;
    } catch (error) {
      throw new Error(`Failed to create email password session: ${error.message}`);
    }
  }

  async createVerificationWithUserSession(email: string, password: string, redirectUrl: string) {
    try {
      // Create a session for the user
      const session = await this.createSession(email, password);
      
      // Create a new client instance with the user's session
      const userClient = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(session.$id);

      const userAccount = new Account(userClient);

      // Create verification using the authenticated user session
      const verification = await userAccount.createVerification(redirectUrl);
      
      // Clean up the session after verification creation
      try {
        await this.deleteSession(session.$id);
      } catch (sessionCleanupError) {
        console.warn('Failed to clean up session:', sessionCleanupError);
      }

      return verification;
    } catch (error) {
      throw new Error(`Failed to create verification with user session: ${error.message}`);
    }
  }

  async createRecoveryWithUserSession(email: string, password: string, redirectUrl: string) {
    try {
      // Create a session for the user
      const session = await this.createSession(email, password);
      
      // Create a new client instance with the user's session
      const userClient = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(session.$id);

      const userAccount = new Account(userClient);

      // Create recovery using the authenticated user session
      const recovery = await userAccount.createRecovery(email, redirectUrl);
      
      // Clean up the session after recovery creation
      try {
        await this.deleteSession(session.$id);
      } catch (sessionCleanupError) {
        console.warn('Failed to clean up session:', sessionCleanupError);
      }

      return recovery;
    } catch (error) {
      throw new Error(`Failed to create recovery with user session: ${error.message}`);
    }
  }

  async createOAuth2Session(provider: string, successUrl: string, failureUrl: string) {
    try {
      // Updated OAuth2 session creation for latest SDK
      const baseUrl = this.config.endpoint.replace('/v1', '');
      const projectId = this.config.projectId;
      
      // Construct the OAuth2 URL according to Appwrite's OAuth2 flow
      const redirectUrl = `${baseUrl}/v1/account/sessions/oauth2/callback/${provider}?project=${projectId}&success=${encodeURIComponent(successUrl)}&failure=${encodeURIComponent(failureUrl)}`;
      
      return {
        redirectUrl,
        provider,
        projectId
      };
    } catch (error) {
      console.error(`Failed to create OAuth2 session for ${provider}:`, error);
      throw new Error(`Failed to create OAuth2 session: ${error.message}`);
    }
  }

  async createSessionFromOAuth(userId: string, secret: string) {
    try {
      // Updated method for latest SDK
      const session = await this.account.createSession(userId, secret);
      return session;
    } catch (error) {
      console.error('Failed to create session from OAuth:', error);
      throw new Error(`Failed to create session from OAuth: ${error.message}`);
    }
  }

  async getOAuthUser(sessionSecret: string) {
    try {
      // Create a new client with the session secret
      const client = new Client()
        .setEndpoint(this.config.endpoint)
        .setProject(this.config.projectId)
        .setSession(sessionSecret);
      
      const account = new Account(client);
      const user = await account.get();
      return user;
    } catch (error) {
      console.error('Failed to get OAuth user:', error);
      throw new Error(`Failed to get OAuth user: ${error.message}`);
    }
  }

  async updateVerification(userId: string, secret: string) {
    try {
      // Updated method for latest SDK
      const updatedUser = await this.users.updateEmailVerification(userId, true);
      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update email verification: ${error.message}`);
    }
  }

  // Database methods - Updated for latest SDK
  async createDocument(collectionId: string, data: any, documentId?: string) {
    try {
      const document = await this.databases.createDocument(
        this.config.databaseId,
        collectionId,
        documentId || ID.unique(),
        data
      );
      return document;
    } catch (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  async getDocument(collectionId: string, documentId: string) {
    try {
      const document = await this.databases.getDocument(
        this.config.databaseId,
        collectionId,
        documentId
      );
      return document;
    } catch (error) {
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  async updateDocument(collectionId: string, documentId: string, data: any) {
    try {
      const document = await this.databases.updateDocument(
        this.config.databaseId,
        collectionId,
        documentId,
        data
      );
      return document;
    } catch (error) {
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
    } catch (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async listDocuments(collectionId: string, queries: string[] = []) {
    try {
      const response = await this.databases.listDocuments(
        this.config.databaseId,
        collectionId,
        queries
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to list documents: ${error.message}`);
    }
  }

  // Storage methods - Updated for latest SDK
  async uploadFile(bucketId: string, file: Buffer, fileName: string, mimeType?: string) {
    try {
      // For now, return a placeholder since file upload needs to be handled differently
      // This will need to be implemented with proper file handling or use frontend SDK
      throw new Error('File upload not implemented in this version. Use frontend Appwrite SDK or implement custom file handling.');
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async getFile(bucketId: string, fileId: string) {
    try {
      const file = await this.storage.getFile(bucketId, fileId);
      return file;
    } catch (error) {
      throw new Error(`Failed to get file: ${error.message}`);
    }
  }

  async deleteFile(bucketId: string, fileId: string) {
    try {
      await this.storage.deleteFile(bucketId, fileId);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async listFiles(bucketId: string, queries: string[] = []) {
    try {
      const response = await this.storage.listFiles(bucketId, queries);
      return response;
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Functions methods - Updated for latest SDK
  async executeFunction(functionId: string, data?: any, xAsync?: boolean) {
    try {
      const response = await this.functions.createExecution(
        functionId,
        data ? JSON.stringify(data) : undefined,
        xAsync
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to execute function: ${error.message}`);
    }
  }

  // Messaging methods - Updated for latest SDK
  async createTopic(topicId: string, name: string, subscribe: string[]) {
    try {
      const topic = await this.messaging.createTopic(
        topicId,
        name,
        subscribe
      );
      return topic;
    } catch (error) {
      throw new Error(`Failed to create topic: ${error.message}`);
    }
  }

  async sendMessage(topicId: string, message: string, data?: any) {
    try {
      // For now, return a placeholder since messaging needs to be handled differently
      // This will need to be implemented with proper messaging or use frontend SDK
      throw new Error('Message sending not implemented in this version. Use frontend Appwrite SDK or implement custom messaging.');
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // Additional utility methods for latest SDK
  async createJWT() {
    try {
      const jwt = await this.account.createJWT();
      return jwt;
    } catch (error) {
      throw new Error(`Failed to create JWT: ${error.message}`);
    }
  }

  async createAnonymousSession() {
    try {
      const session = await this.account.createAnonymousSession();
      return session;
    } catch (error) {
      throw new Error(`Failed to create anonymous session: ${error.message}`);
    }
  }

  async updatePassword(password: string, oldPassword?: string) {
    try {
      const result = await this.account.updatePassword(password, oldPassword);
      return result;
    } catch (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  async createMfaAuthenticator(type: string) {
    try {
      // For now, return a placeholder since MFA needs to be handled differently
      throw new Error('MFA authenticator creation not implemented in this version. Use frontend Appwrite SDK or implement custom MFA handling.');
    } catch (error) {
      throw new Error(`Failed to create MFA authenticator: ${error.message}`);
    }
  }

  async deleteMfaAuthenticator(type: string) {
    try {
      // For now, return a placeholder since MFA needs to be handled differently
      throw new Error('MFA authenticator deletion not implemented in this version. Use frontend Appwrite SDK or implement custom MFA handling.');
    } catch (error) {
      throw new Error(`Failed to delete MFA authenticator: ${error.message}`);
    }
  }

  async getMfaRecoveryCodes() {
    try {
      const codes = await this.account.getMfaRecoveryCodes();
      return codes;
    } catch (error) {
      throw new Error(`Failed to get MFA recovery codes: ${error.message}`);
    }
  }

  async updateMfaRecoveryCodes() {
    try {
      const codes = await this.account.updateMfaRecoveryCodes();
      return codes;
    } catch (error) {
      throw new Error(`Failed to update MFA recovery codes: ${error.message}`);
    }
  }
}


