import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Databases, Account, Storage, Functions } from 'node-appwrite';

@Injectable()
export class AppwriteService implements OnModuleInit {
  private client: Client;
  private databases: Databases;
  private account: Account;
  private storage: Storage;
  private functions: Functions;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const endpoint = this.configService.get<string>('APPWRITE_ENDPOINT');
    const projectId = this.configService.get<string>('APPWRITE_PROJECT_ID');
    const apiKey = this.configService.get<string>('APPWRITE_API_KEY');

    if (!endpoint || !projectId || !apiKey) {
      throw new Error('APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY are required');
    }

    this.client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    this.databases = new Databases(this.client);
    this.account = new Account(this.client);
    this.storage = new Storage(this.client);
    this.functions = new Functions(this.client);
  }

  getClient() {
    return this.client;
  }
  getDatabases() {
    return this.databases;
  }
  getAccount() {
    return this.account;
  }
  getStorage() {
    return this.storage;
  }
  getFunctions() {
    return this.functions;
  }
}


