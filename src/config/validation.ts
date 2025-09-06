import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('0.0.0.0'),

  // Appwrite
  APPWRITE_ENDPOINT: Joi.string().uri().required(),
  APPWRITE_PROJECT_ID: Joi.string().required(),
  APPWRITE_API_KEY: Joi.string().required(),
  APPWRITE_DATABASE_ID: Joi.string().required(),

  // Collections (optional overrides)
  APPWRITE_COLLECTION_USERS: Joi.string().optional(),
  APPWRITE_COLLECTION_USER_PROFILES: Joi.string().optional(),
  APPWRITE_COLLECTION_WALLETS: Joi.string().optional(),
  APPWRITE_COLLECTION_TRANSACTIONS: Joi.string().optional(),
  APPWRITE_COLLECTION_ORDERS: Joi.string().optional(),
  APPWRITE_COLLECTION_PAYMENTS: Joi.string().optional(),
  APPWRITE_COLLECTION_INVOICES: Joi.string().optional(),
  APPWRITE_COLLECTION_RECEIPTS: Joi.string().optional(),
  APPWRITE_COLLECTION_NOTIFICATIONS: Joi.string().optional(),
  APPWRITE_COLLECTION_NOTIFICATION_PREFERENCES: Joi.string().optional(),
  APPWRITE_COLLECTION_WIZARD_SESSIONS: Joi.string().optional(),
  APPWRITE_COLLECTION_DESIGNS: Joi.string().optional(),
  APPWRITE_COLLECTION_SITE_CONFIG: Joi.string().optional(),
  APPWRITE_COLLECTION_EMAIL_LOGS: Joi.string().optional(),
  APPWRITE_COLLECTION_PUSH_TOKENS: Joi.string().optional(),
  APPWRITE_COLLECTION_PROJECT_FILES: Joi.string().optional(),
  APPWRITE_COLLECTION_SUPPORT_TICKETS: Joi.string().optional(),
  APPWRITE_COLLECTION_AUDIT_LOGS: Joi.string().optional(),
  APPWRITE_COLLECTION_SYSTEM_SETTINGS: Joi.string().optional(),
  APPWRITE_COLLECTION_AUTH_TOKENS: Joi.string().optional(),

  // Storage buckets
  APPWRITE_STORAGE_PROJECT_FILES: Joi.string().optional(),
  APPWRITE_STORAGE_USER_AVATARS: Joi.string().optional(),
  APPWRITE_STORAGE_DESIGN_ASSETS: Joi.string().optional(),

  // JWT
  JWT_SECRET: Joi.string().min(24).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // CORS and Frontend
  FRONTEND_URL: Joi.string().uri().required(),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  // SMTP (optional; if provided, validate port/security)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),
  SMTP_SENDER_NAME: Joi.string().optional(),
  SMTP_SECURITY: Joi.string().valid('ssl', 'starttls').optional(),

  // ZarinPal
  ZARINPAL_MERCHANT_ID: Joi.string().required(),
  ZARINPAL_CALLBACK_URL: Joi.string().uri().required(),
  ZARINPAL_SANDBOX: Joi.boolean().truthy('true').falsy('false').default(false),

  // Limits
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024),
  ALLOWED_FILE_TYPES: Joi.string().default('image/*,application/pdf,text/*'),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
});

