import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SiteMode } from './dto/site-config.dto';

@WebSocketGateway({
  namespace: 'site-config',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'https://arzansite.com',
      'http://localhost:8080',
      'http://localhost:5173',
    ],
    credentials: true,
  },
})
export class SiteConfigGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();

  async handleConnection(client: Socket) {
    try {
      // Extract token from query or headers
      const token = client.handshake.query.token || 
                   client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      // TODO: Validate JWT token here if needed
      // For now, we'll allow connections and validate on specific events

      this.connectedClients.set(client.id, client);
      console.log(`Client connected: ${client.id}`);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket) {
    // Send current config immediately
    client.emit('config_update', { mode: 'normal' });
    console.log(`Client ${client.id} subscribed to site config updates`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    console.log(`Client ${client.id} unsubscribed from site config updates`);
  }

  broadcastModeUpdate(mode: SiteMode) {
    this.server.emit('mode_updated', { mode });
    console.log(`Broadcasting mode update: ${mode}`);
  }

  // Method to send update to specific client
  sendToClient(clientId: string, event: string, data: any) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.emit(event, data);
    }
  }

  // Method to broadcast to all connected clients
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
