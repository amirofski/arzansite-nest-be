# Appwrite API Reference

This document describes the new NestJS-based API that serves as an exclusive proxy between your frontend and Appwrite services.

## Overview

The backend now acts as a gateway to all Appwrite functionality, providing:
- **Authentication**: User registration, login, logout, and session management
- **Database Operations**: CRUD operations for all collections
- **Storage**: File upload, download, and management
- **Functions**: Cloud function execution
- **Messaging**: Topic creation and message broadcasting

## Base URL

All endpoints are prefixed with `/api` (e.g., `/api/auth/signup`)

## Authentication

### Endpoints

#### POST `/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "metadata": {
    "name": "John Doe"
  }
}
```

**Response:**
```json
{
  "message": "User created successfully.",
  "user": {
    "id": "unique-user-id",
    "email": "user@example.com",
    "emailVerification": false,
    "$createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST `/auth/login`
Authenticate user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "refresh_token": "refresh-token",
  "user": {
    "id": "unique-user-id",
    "email": "user@example.com"
  },
  "session": {
    "$id": "session-id",
    "userId": "user-id"
  }
}
```

#### POST `/auth/login-with-jwt`
Authenticate using an Appwrite JWT token.

**Request Body:**
```json
{
  "jwt": "appwrite-jwt-token",
  "email": "user@example.com"
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "refresh-token"
}
```

#### POST `/auth/logout`
Logout user and invalidate session.

**Headers:** `Authorization: Bearer <access_token>`

#### GET `/auth/me`
Get current user information.

**Headers:** `Authorization: Bearer <access_token>`

#### POST `/auth/forgot-password`
Send password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

## Database Operations

### Endpoints

#### POST `/db/:collectionId`
Create a new document in the specified collection.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "data": {
    "title": "Document Title",
    "content": "Document content"
  },
  "documentId": "optional-custom-id"
}
```

#### GET `/db/:collectionId/:documentId`
Retrieve a document by ID.

**Headers:** `Authorization: Bearer <access_token>`

#### PUT `/db/:collectionId/:documentId`
Update an existing document.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "data": {
    "title": "Updated Title",
    "content": "Updated content"
  }
}
```

#### DELETE `/db/:collectionId/:documentId`
Delete a document.

**Headers:** `Authorization: Bearer <access_token>`

#### GET `/db/:collectionId`
List documents with optional queries.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `queries`: Array of query strings (optional)

## Storage Operations

### Endpoints

#### POST `/storage/upload/:bucketId`
Upload a file to the specified bucket.

**Headers:** `Authorization: Bearer <access_token>`

**Form Data:**
- `file`: File to upload

**Note:** File upload is currently a placeholder due to InputFile limitations in the current node-appwrite version.

#### GET `/storage/:bucketId/:fileId`
Get file information.

**Headers:** `Authorization: Bearer <access_token>`

#### DELETE `/storage/:bucketId/:fileId`
Delete a file.

**Headers:** `Authorization: Bearer <access_token>`

#### GET `/storage/:bucketId`
List files in a bucket.

**Headers:** `Authorization: Bearer <access_token>`

**Query Parameters:**
- `queries`: Array of query strings (optional)

#### GET `/storage/:bucketId/:fileId/url`
Get a viewable URL for a file.

**Headers:** `Authorization: Bearer <access_token>`

## Functions

### Endpoints

#### POST `/functions/execute`
Execute an Appwrite cloud function.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "functionId": "function-id",
  "data": {
    "key": "value"
  },
  "xAsync": false
}
```

#### POST `/functions/webhook`
Handle Appwrite webhook events.

**Headers:**
- `x-appwrite-webhook`: Webhook signature
- `x-appwrite-event`: Event type

## Messaging

### Endpoints

#### POST `/messaging/topics`
Create a new messaging topic.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "topicId": "topic-id",
  "name": "Topic Name",
  "subscribe": ["user-id-1", "user-id-2"]
}
```

#### POST `/messaging/topics/:topicId/messages`
Send a message to a specific topic.

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "message": "Hello, world!",
  "data": {
    "additional": "information"
  }
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

Error responses include a message describing the error:

```json
{
  "message": "Error description",
  "error": "Error type",
  "statusCode": 400
}
```

## Authentication Flow

1. **User Registration**: Frontend calls `/auth/signup` to create account
2. **Email Verification**: Frontend uses Appwrite SDK for email verification
3. **Login**: Frontend calls `/auth/login` with credentials
4. **Session Management**: Backend issues JWT tokens for API access
5. **API Calls**: Frontend includes JWT token in Authorization header
6. **Logout**: Frontend calls `/auth/logout` to invalidate session

## Rate Limiting

All endpoints are protected by rate limiting:
- TTL: 60 seconds (configurable)
- Limit: 100 requests per TTL (configurable)

## Security Features

- JWT-based authentication
- Rate limiting
- Input validation using class-validator
- CORS protection
- Helmet security headers

## Configuration

Required environment variables:

```env
# Appwrite Configuration
APPWRITE_ENDPOINT=http://your-appwrite-endpoint/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
APPWRITE_DATABASE_ID=your-database-id
APPWRITE_WEBHOOK_SECRET=your-webhook-secret

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1h

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

## Frontend Integration

The frontend should:

1. Remove direct Appwrite SDK usage
2. Replace SDK calls with HTTP requests to these endpoints
3. Handle JWT tokens for authentication
4. Implement proper error handling
5. Use the new typed API client (see companion frontend prompt)

## Limitations

- File upload is currently a placeholder due to InputFile limitations
- Some advanced Appwrite features may require custom implementation
- Real-time features (WebSockets) are not yet implemented

## Future Enhancements

- Implement proper file upload handling
- Add WebSocket support for real-time features
- Implement caching layer
- Add more comprehensive error handling
- Implement audit logging
