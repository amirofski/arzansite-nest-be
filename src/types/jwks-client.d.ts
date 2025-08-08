declare module 'jwks-client' {
  export default class JwksClient {
    constructor(options: { 
      jwksUri: string; 
      cache?: boolean; 
      cacheMaxEntries?: number; 
      cacheMaxAge?: number 
    });
    getSigningKey(kid: string): Promise<{ getPublicKey(): string }>;
  }
}
