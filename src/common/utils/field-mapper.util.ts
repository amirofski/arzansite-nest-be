/**
 * Utility for mapping between snake_case (database) and camelCase (Appwrite models) field names
 * This utility ensures consistent field naming across the entire application
 */

// Field mapping: camelCase → snake_case
export const FIELD_MAPPING = {
  // User fields
  userId: 'user_id',
  userid: 'user_id',
  
  // Date fields
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  lastAccessed: 'last_accessed',
  
  // Order fields
  orderId: 'order_id',
  orderid: 'order_id',
  sessionId: 'session_id',
  sessionid: 'session_id',
  siteType: 'site_type',
  orderNumber: 'order_number',
  
  // Payment fields
  paymentGateway: 'payment_gateway',
  paymentStatus: 'payment_status',
  zarinpalAuthority: 'zarinpal_authority',
  zarinpalRefId: 'zarinpal_ref_id',
  zarinpalInvoiceId: 'zarinpal_invoice_id',
  
  // Design fields
  wizardData: 'wizard_data',
  designSnapshot: 'design_snapshot',
  designData: 'design_data',
  designPreviewUrl: 'design_preview_url',
  designOptions: 'design_options',
  callbackUrl: 'callback_url',
  returnUrl: 'return_url',
  websiteFramework: 'website_framework',
  additionalServices: 'additional_services',
  projectFiles: 'project_files',
  
  // Amount fields
  totalAmount: 'total_amount',
  balanceBefore: 'balance_before',
  balanceAfter: 'balance_after',
  
  // Wallet fields
  walletId: 'wallet_id',
  walletid: 'wallet_id',
  
  // Profile fields
  fullName: 'full_name',
  firstName: 'first_name',
  lastName: 'last_name',
  phoneNumber: 'phone_number',
  
  // File fields
  fileName: 'file_name',
  originalName: 'original_name',
  mimeType: 'mime_type',
  bucketId: 'bucket_id',
  fileId: 'file_id',
  
  // Transaction fields
  transactionType: 'transaction_type',
  transactionId: 'transaction_id',
  referenceId: 'reference_id',
  referenceType: 'reference_type',
  
  // Support fields
  ticketId: 'ticket_id',
  adminUserId: 'admin_user_id',
  assignedTo: 'assigned_to',
  
  // Notification fields
  notificationType: 'notification_type',
  notificationPreferences: 'notification_preferences',
  
  // Appwrite system fields (keep as camelCase in Appwrite, map to snake_case in database)
  $createdAt: 'created_at',
  $updatedAt: 'updated_at',
  $id: 'id',
  $permissions: 'permissions',
} as const;

// Reverse mapping: snake_case → camelCase
export const REVERSE_FIELD_MAPPING = Object.fromEntries(
  Object.entries(FIELD_MAPPING).map(([key, value]) => [value, key])
);

// Type definitions for better TypeScript support
export type AppwriteField = keyof typeof FIELD_MAPPING;
export type DatabaseField = typeof FIELD_MAPPING[AppwriteField];

/**
 * Convert Appwrite camelCase fields to database snake_case fields
 */
export function mapAppwriteToDatabase<T extends Record<string, any>>(data: T): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const mappedKey = FIELD_MAPPING[key as AppwriteField] || key;
    mapped[mappedKey] = value;
  }
  
  return mapped;
}

/**
 * Convert database snake_case fields to Appwrite camelCase fields
 */
export function mapDatabaseToAppwrite<T extends Record<string, any>>(data: T): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const mappedKey = REVERSE_FIELD_MAPPING[key] || key;
    mapped[mappedKey] = value;
  }
  
  return mapped;
}

/**
 * Get the database field name for a given Appwrite field name
 */
export function getDatabaseField(appwriteField: string): string {
  return FIELD_MAPPING[appwriteField as AppwriteField] || appwriteField;
}

/**
 * Get the Appwrite field name for a given database field name
 */
export function getAppwriteField(databaseField: string): string {
  return REVERSE_FIELD_MAPPING[databaseField] || databaseField;
}

/**
 * Check if a field needs mapping
 */
export function needsMapping(field: string): boolean {
  return field in FIELD_MAPPING || field in REVERSE_FIELD_MAPPING;
}

/**
 * Validate that all required fields are present in snake_case format
 */
export function validateSnakeCaseFields(data: Record<string, any>, requiredFields: string[]): string[] {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      missingFields.push(field);
    }
  }
  
  return missingFields;
}

/**
 * Convert a single field name to snake_case
 */
export function toSnakeCase(field: string): string {
  return getDatabaseField(field);
}

/**
 * Convert a single field name to camelCase
 */
export function toCamelCase(field: string): string {
  return getAppwriteField(field);
}
