# Arzansite Backend

A NestJS backend that replaces direct supabase-js usage from the Vite/React frontend while maintaining Supabase as the database and authentication provider.

## Features

- **Authentication**: JWT-based auth with Supabase JWKS validation
- **Orders Management**: Full CRUD operations with ownership checks
- **Design System**: RPC bridge to existing Supabase functions
- **Wallet System**: Transaction management with RPC integration
- **Payment Gateway**: Zarinpal integration replacing edge functions
- **Site Configuration**: Real-time updates via WebSocket
- **Domain Checking**: Availability verification service
- **Security**: Helmet, CORS, rate limiting, input validation

## Tech Stack

- **Framework**: NestJS (latest)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **WebSockets**: Socket.io for real-time updates
- **Payment**: Zarinpal Gateway
- **Security**: Helmet, CORS, rate limiting
- **Containerization**: Docker + Docker Compose

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for containerized deployment)
- Supabase project with existing schema and RPC functions

## Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Supabase Configuration
SUPABASE_URL=https://api.arzansite.com
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_JWKS_URL=https://api.arzansite.com/auth/v1/keys

# Frontend and CORS
FRONTEND_URL=https://arzansite.com
CORS_ORIGINS=https://arzansite.com,http://localhost:8080,http://localhost:5173

# Payment Gateway
ZARINPAL_MERCHANT_ID=your_merchant_id_here

# Application
NODE_ENV=production
PORT=3000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

## Installation

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Run development server**:
   ```bash
   npm run start:dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   npm run start:prod
   ```

### Docker Deployment

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Build image manually**:
   ```bash
   docker build -t arzansite-backend .
   docker run -p 3000:3000 --env-file .env arzansite-backend
   ```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Profiles

- `GET /api/profiles/me` - Get user profile
- `PATCH /api/profiles/me` - Update user profile
- `GET /api/profiles` - List all profiles (admin)

### Orders

- `GET /api/orders` - List orders (with `?mine=true` for user's orders)
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get specific order
- `PATCH /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Designs

- `POST /api/orders/:orderId/design` - Save design data
- `GET /api/orders/:orderId/design` - Get design data
- `GET /api/orders/:orderId/design/options` - Get design options
- `PATCH /api/orders/:orderId/design/options` - Update design options
- `PATCH /api/orders/:orderId/design/preview-url` - Update preview URL

### Wallets

- `GET /api/wallets/me` - Get user wallet
- `GET /api/wallets/me/balance` - Get wallet balance
- `GET /api/wallets/me/transactions` - Get user transactions
- `POST /api/wallets/me/transactions` - Create transaction
- `POST /api/wallets/refund-order` - Refund order to wallet

### Payments

- `POST /api/payments/request` - Request payment
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/refund` - Refund payment
- `POST /api/payments/cancel` - Cancel payment
- `GET /api/payments/orders/:orderId` - Get order payments

### Site Configuration

- `GET /api/site-config/current` - Get current site mode
- `PATCH /api/site-config` - Update site mode (admin)
- `GET /api/site-config/history` - Get config history (admin)

### Domains

- `GET /api/domains/check` - Check domain availability
- `GET /api/domains/search` - Search domains in orders

### WebSocket

- `WS /ws/site-config` - Real-time site config updates
  - Events: `subscribe`, `unsubscribe`
  - Emits: `mode_updated`, `config_update`

## Database Schema

The backend expects the following Supabase tables and RPC functions:

### Tables

- `orders` - Order management
- `design_data` - Design information
- `payment_transactions` - Payment records
- `profiles` - User profiles
- `site_config` - Site configuration
- `user_roles` - User role management
- `wallets` - User wallets
- `transactions` - Wallet transactions

### RPC Functions

- `save_design_data(p_order_id uuid, p_design_data json)`
- `get_design_data(p_order_id uuid)`
- `process_wallet_transaction(p_user_id uuid, p_type enum, p_amount numeric, ...)`
- `refund_order_to_wallet(p_order_id uuid)`

## Security Features

- **JWT Validation**: Supabase JWKS-based token verification
- **Role-based Access**: Admin/user role enforcement
- **Ownership Checks**: Users can only access their own resources
- **Input Validation**: Class-validator for request validation
- **Rate Limiting**: Configurable request throttling
- **CORS Protection**: Configurable origin restrictions
- **Helmet**: Security headers
- **Error Handling**: Centralized error management

## Dokploy/Reverse Proxy Configuration

When deploying behind a reverse proxy (nginx/Dokploy), ensure:

1. **WebSocket Support**: Configure proxy to handle WebSocket upgrades
2. **Headers**: Pass through `Upgrade` and `Connection` headers
3. **Timeouts**: Set appropriate read/send timeouts for WebSockets

Example nginx configuration:

```nginx
location / {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Development

### Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── common/                # Shared utilities
│   ├── decorators/       # Custom decorators
│   ├── filters/          # Exception filters
│   ├── guards/           # Authentication guards
│   ├── interceptors/     # Response interceptors
│   └── types/            # Type definitions
├── auth/                 # Authentication module
├── profiles/             # User profiles
├── orders/               # Order management
├── designs/              # Design system
├── wallets/              # Wallet management
├── transactions/         # Transaction records
├── payments/             # Payment processing
├── site-config/          # Site configuration
├── domains/              # Domain checking
└── supabase/             # Supabase client
```

### Adding New Features

1. Create module directory in `src/`
2. Implement service, controller, and DTOs
3. Add module to `app.module.ts`
4. Update documentation

## Monitoring

- **Health Check**: `GET /api/health`
- **Logging**: Structured logging with error tracking
- **Metrics**: Application metrics via health endpoint

## Troubleshooting

### Common Issues

1. **JWT Validation Errors**: Check `SUPABASE_JWKS_URL` configuration
2. **Database Connection**: Verify Supabase credentials
3. **WebSocket Issues**: Ensure proxy configuration supports WebSockets
4. **CORS Errors**: Check `CORS_ORIGINS` configuration

### Logs

Check application logs for detailed error information:

```bash
# Docker logs
docker-compose logs arzansite-be

# Local logs
npm run start:dev
```

## Contributing

1. Follow TypeScript and NestJS best practices
2. Add tests for new features
3. Update documentation
4. Ensure security best practices

## License

Private - Arzansite
