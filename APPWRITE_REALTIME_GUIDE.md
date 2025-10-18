# راهنمای کامل Appwrite Realtime - Backend & Frontend

## 🔧 **تنظیمات Appwrite Console**

### 1. **فعال‌سازی Realtime**
- در Appwrite Console، به **Settings** > **Features** بروید
- **Realtime** را فعال کنید
- **WebSocket** را فعال کنید

### 2. **تنظیمات Database Permissions**
```json
// برای notifications collection
{
  "read": ["role:any()"],  // برای دریافت notifications
  "create": ["role:any()"], // برای ایجاد notifications
  "update": ["role:any()"], // برای به‌روزرسانی notifications
  "delete": ["role:any()"]  // برای حذف notifications
}
```

### 3. **تنظیمات Project**
- **Project ID**: `app` (یا ID پروژه شما)
- **Endpoint**: `https://app.arzansite.com/v1`
- **Realtime Endpoint**: `wss://app.arzansite.com/v1/realtime`

## 🚀 **Backend Implementation (NestJS)**

### 1. **نصب Dependencies**
```bash
npm install appwrite
```

### 2. **ایجاد Realtime Service**
```typescript
// src/appwrite/realtime.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Realtime } from 'appwrite';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private client: Client;
  private realtime: Realtime;

  constructor(private readonly configService: ConfigService) {
    this.client = new Client()
      .setEndpoint(this.configService.get<string>('APPWRITE_ENDPOINT'))
      .setProject(this.configService.get<string>('APPWRITE_PROJECT_ID'));

    this.realtime = new Realtime(this.client);
  }

  /**
   * Subscribe to notifications for a specific user
   */
  subscribeToUserNotifications(userId: string, callback: (response: any) => void) {
    const channel = `databases.${this.configService.get('APPWRITE_DATABASE_ID')}.collections.${this.configService.get('APPWRITE_COLLECTION_NOTIFICATIONS')}.documents`;
    
    this.logger.log(`Subscribing to notifications for user ${userId}`);
    
    return this.realtime.subscribe(channel, (response) => {
      // Filter notifications for specific user
      if (response.payload && response.payload.user_id === userId) {
        callback(response);
      }
    });
  }

  /**
   * Subscribe to order updates for a specific user
   */
  subscribeToUserOrders(userId: string, callback: (response: any) => void) {
    const channel = `databases.${this.configService.get('APPWRITE_DATABASE_ID')}.collections.${this.configService.get('APPWRITE_COLLECTION_ORDERS')}.documents`;
    
    this.logger.log(`Subscribing to orders for user ${userId}`);
    
    return this.realtime.subscribe(channel, (response) => {
      // Filter orders for specific user
      if (response.payload && response.payload.user_id === userId) {
        callback(response);
      }
    });
  }

  /**
   * Subscribe to all notifications (admin)
   */
  subscribeToAllNotifications(callback: (response: any) => void) {
    const channel = `databases.${this.configService.get('APPWRITE_DATABASE_ID')}.collections.${this.configService.get('APPWRITE_COLLECTION_NOTIFICATIONS')}.documents`;
    
    this.logger.log('Subscribing to all notifications');
    
    return this.realtime.subscribe(channel, callback);
  }

  /**
   * Subscribe to multiple channels
   */
  subscribeToMultipleChannels(channels: string[], callback: (response: any) => void) {
    this.logger.log(`Subscribing to channels: ${channels.join(', ')}`);
    
    return this.realtime.subscribe(channels, callback);
  }

  /**
   * Close all subscriptions
   */
  closeAllSubscriptions() {
    this.logger.log('Closing all subscriptions');
    this.realtime.close();
  }
}
```

### 3. **ایجاد Realtime Gateway (WebSocket)**
```typescript
// src/realtime/realtime.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RealtimeService } from '../appwrite/realtime.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private userSubscriptions = new Map<string, () => void>();

  constructor(private readonly realtimeService: RealtimeService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Clean up subscriptions
    const unsubscribe = this.userSubscriptions.get(client.id);
    if (unsubscribe) {
      unsubscribe();
      this.userSubscriptions.delete(client.id);
    }
  }

  @SubscribeMessage('subscribe-notifications')
  handleSubscribeNotifications(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User ${data.userId} subscribing to notifications`);
    
    // Clean up existing subscription
    const existingUnsubscribe = this.userSubscriptions.get(client.id);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Create new subscription
    const unsubscribe = this.realtimeService.subscribeToUserNotifications(
      data.userId,
      (response) => {
        client.emit('notification-update', response);
      }
    );

    this.userSubscriptions.set(client.id, unsubscribe);
    
    client.emit('subscription-success', { type: 'notifications' });
  }

  @SubscribeMessage('subscribe-orders')
  handleSubscribeOrders(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User ${data.userId} subscribing to orders`);
    
    // Clean up existing subscription
    const existingUnsubscribe = this.userSubscriptions.get(client.id);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Create new subscription
    const unsubscribe = this.realtimeService.subscribeToUserOrders(
      data.userId,
      (response) => {
        client.emit('order-update', response);
      }
    );

    this.userSubscriptions.set(client.id, unsubscribe);
    
    client.emit('subscription-success', { type: 'orders' });
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client ${client.id} unsubscribing`);
    
    const unsubscribe = this.userSubscriptions.get(client.id);
    if (unsubscribe) {
      unsubscribe();
      this.userSubscriptions.delete(client.id);
    }
    
    client.emit('unsubscription-success');
  }
}
```

### 4. **ایجاد Realtime Module**
```typescript
// src/realtime/realtime.module.ts
import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from '../appwrite/realtime.service';
import { AppwriteModule } from '../appwrite/appwrite.module';

@Module({
  imports: [AppwriteModule],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
```

### 5. **اضافه کردن به App Module**
```typescript
// src/app.module.ts
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    // ... other modules
    RealtimeModule,
  ],
})
export class AppModule {}
```

## 🎨 **Frontend Implementation**

### 1. **نصب Dependencies**
```bash
npm install appwrite socket.io-client
```

### 2. **ایجاد Appwrite Realtime Service**
```typescript
// src/services/appwrite-realtime.service.ts
import { Client, Realtime } from 'appwrite';

export class AppwriteRealtimeService {
  private client: Client;
  private realtime: Realtime;
  private subscriptions = new Map<string, () => void>();

  constructor() {
    this.client = new Client()
      .setEndpoint('https://app.arzansite.com/v1')
      .setProject('app');

    this.realtime = new Realtime(this.client);
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(userId: string, callback: (response: any) => void) {
    const channel = `databases.database.collections.notifications.documents`;
    
    const unsubscribe = this.realtime.subscribe(channel, (response) => {
      // Filter for user's notifications
      if (response.payload && response.payload.user_id === userId) {
        callback(response);
      }
    });

    this.subscriptions.set(`notifications-${userId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to user orders
   */
  subscribeToOrders(userId: string, callback: (response: any) => void) {
    const channel = `databases.database.collections.orders.documents`;
    
    const unsubscribe = this.realtime.subscribe(channel, (response) => {
      // Filter for user's orders
      if (response.payload && response.payload.user_id === userId) {
        callback(response);
      }
    });

    this.subscriptions.set(`orders-${userId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to specific order
   */
  subscribeToOrder(orderId: string, callback: (response: any) => void) {
    const channel = `databases.database.collections.orders.documents.${orderId}`;
    
    const unsubscribe = this.realtime.subscribe(channel, callback);
    this.subscriptions.set(`order-${orderId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Unsubscribe from specific subscription
   */
  unsubscribe(key: string) {
    const unsubscribe = this.subscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll() {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  /**
   * Close realtime connection
   */
  close() {
    this.unsubscribeAll();
    this.realtime.close();
  }
}
```

### 3. **ایجاد Socket.IO Service (برای WebSocket Gateway)**
```typescript
// src/services/socket.service.ts
import { io, Socket } from 'socket.io-client';

export class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(token: string) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io('wss://nest.arzansite.com', {
      auth: {
        token,
      },
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from WebSocket server');
    });

    return this.socket;
  }

  subscribeToNotifications(userId: string, callback: (data: any) => void) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('subscribe-notifications', { userId });
    this.socket.on('notification-update', callback);
  }

  subscribeToOrders(userId: string, callback: (data: any) => void) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('subscribe-orders', { userId });
    this.socket.on('order-update', callback);
  }

  unsubscribe() {
    if (this.socket) {
      this.socket.emit('unsubscribe');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  get connected() {
    return this.isConnected;
  }
}
```

### 4. **استفاده در React Component**
```typescript
// src/components/RealtimeNotifications.tsx
import React, { useEffect, useState } from 'react';
import { AppwriteRealtimeService } from '../services/appwrite-realtime.service';

interface Notification {
  id: string;
  message: string;
  type: string;
  created_at: string;
  read_at?: string;
}

export const RealtimeNotifications: React.FC<{ userId: string }> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [realtimeService] = useState(() => new AppwriteRealtimeService());

  useEffect(() => {
    // Subscribe to notifications
    const unsubscribe = realtimeService.subscribeToNotifications(userId, (response) => {
      console.log('New notification:', response);
      
      if (response.events.includes('databases.database.collections.notifications.documents.create')) {
        // New notification created
        setNotifications(prev => [response.payload, ...prev]);
      } else if (response.events.includes('databases.database.collections.notifications.documents.update')) {
        // Notification updated (e.g., marked as read)
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === response.payload.$id ? response.payload : notif
          )
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId, realtimeService]);

  useEffect(() => {
    return () => {
      realtimeService.close();
    };
  }, [realtimeService]);

  return (
    <div className="notifications">
      <h3>Notifications</h3>
      {notifications.map(notification => (
        <div key={notification.id} className="notification">
          <p>{notification.message}</p>
          <small>{new Date(notification.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
};
```

### 5. **استفاده در Vue Component**
```vue
<!-- src/components/RealtimeOrders.vue -->
<template>
  <div class="orders">
    <h3>Orders</h3>
    <div v-for="order in orders" :key="order.id" class="order">
      <p>{{ order.title }}</p>
      <span :class="order.status">{{ order.status }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { AppwriteRealtimeService } from '../services/appwrite-realtime.service';

const props = defineProps<{
  userId: string;
}>();

const orders = ref([]);
const realtimeService = new AppwriteRealtimeService();

onMounted(() => {
  // Subscribe to orders
  realtimeService.subscribeToOrders(props.userId, (response) => {
    console.log('Order update:', response);
    
    if (response.events.includes('databases.database.collections.orders.documents.create')) {
      // New order created
      orders.value.unshift(response.payload);
    } else if (response.events.includes('databases.database.collections.orders.documents.update')) {
      // Order updated
      const index = orders.value.findIndex(order => order.id === response.payload.$id);
      if (index !== -1) {
        orders.value[index] = response.payload;
      }
    }
  });
});

onUnmounted(() => {
  realtimeService.close();
});
</script>
```

## 🔧 **Environment Variables**

### Backend (.env)
```env
APPWRITE_ENDPOINT=https://app.arzansite.com/v1
APPWRITE_PROJECT_ID=app
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_COLLECTION_NOTIFICATIONS=notifications
APPWRITE_COLLECTION_ORDERS=orders
```

### Frontend (.env)
```env
VITE_APPWRITE_ENDPOINT=https://app.arzansite.com/v1
VITE_APPWRITE_PROJECT_ID=app
VITE_APPWRITE_DATABASE_ID=your-database-id
VITE_APPWRITE_COLLECTION_NOTIFICATIONS=notifications
VITE_APPWRITE_COLLECTION_ORDERS=orders
VITE_WEBSOCKET_URL=wss://nest.arzansite.com
```

## 📋 **چک‌لیست تنظیمات**

### Appwrite Console
- [ ] Realtime فعال شده
- [ ] WebSocket فعال شده
- [ ] Database permissions تنظیم شده
- [ ] Collection permissions تنظیم شده

### Backend
- [ ] RealtimeService ایجاد شده
- [ ] RealtimeGateway ایجاد شده
- [ ] WebSocket Gateway فعال شده
- [ ] Environment variables تنظیم شده

### Frontend
- [ ] Appwrite client تنظیم شده
- [ ] Realtime service ایجاد شده
- [ ] Socket.IO client تنظیم شده
- [ ] Components پیاده‌سازی شده

## 🚀 **نتیجه**

با این تنظیمات، می‌توانید:
- ✅ Notifications را realtime دریافت کنید
- ✅ Order updates را realtime دریافت کنید
- ✅ WebSocket connection برقرار کنید
- ✅ Multiple channels را subscribe کنید
- ✅ Authentication را مدیریت کنید

**همه چیز آماده است!** 🎉
