# Appwrite Migration Scripts

This directory contains scripts to migrate your Supabase database schema to Appwrite. The scripts will create all the necessary collections, attributes, and indexes based on your existing Supabase migrations.

## Files Overview

- **`appwrite-schema.js`** - Schema definition file containing all collections, attributes, and indexes
- **`create-appwrite-schema.js`** - Main script to programmatically create the Appwrite schema
- **`appwrite-config.env`** - Environment variables configuration file

## Prerequisites

1. **Appwrite Project**: You need an Appwrite project with ID `6898b35e003067cd7b43`
2. **API Key**: A server-side API key with full access to your project
3. **Node.js**: Version 16 or higher
4. **Dependencies**: The `node-appwrite` package is already installed in your project

## Setup Instructions

### 1. Configure Environment Variables

Copy the `appwrite-config.env` file and update it with your actual Appwrite credentials:

```bash
# Copy the config file
cp appwrite-config.env .env

# Edit the .env file with your actual values
nano .env
```

Update these values:
- `APPWRITE_API_KEY`: Your Appwrite server-side API key
- `APPWRITE_DATABASE_ID`: The database ID (default: 'main')
- `APPWRITE_ENDPOINT`: Your Appwrite endpoint (default: cloud.appwrite.io)

### 2. Run the Migration Script

```bash
# Load environment variables and run the script
source .env && node create-appwrite-schema.js
```

Or on Windows:
```bash
# Windows PowerShell
Get-Content .env | ForEach-Object { if($_ -match "^([^#][^=]+)=(.*)$") { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }
node create-appwrite-schema.js
```

## What the Scripts Create

### Collections

1. **`profiles`** - User profile information
2. **`user_roles`** - User role assignments (user/admin)
3. **`orders`** - Order management with design data
4. **`wallets`** - User wallet balances
5. **`transactions`** - Wallet transaction history
6. **`design_data`** - Detailed design information for orders
7. **`payment_transactions`** - Payment processing records
8. **`email_logs`** - Email sending logs
9. **`email_verification_logs`** - Email verification tracking

### Key Features

- **Automatic ID Generation**: Uses Appwrite's built-in unique ID generation
- **Data Validation**: Enforces required fields, data types, and constraints
- **Performance Indexes**: Creates optimized indexes for common queries
- **Enum Support**: Proper enum attributes for status fields
- **JSON Storage**: Design data and metadata stored as JSON strings
- **Timestamps**: Automatic created_at and updated_at tracking

### Data Type Mappings

| Supabase Type | Appwrite Type | Notes |
|---------------|---------------|-------|
| `UUID` | `string(36)` | 36-character string for UUIDs |
| `TEXT` | `string(255)` | Variable length strings |
| `DECIMAL` | `double` | Floating point numbers |
| `INTEGER` | `integer` | Whole numbers |
| `BOOLEAN` | `boolean` | True/false values |
| `TIMESTAMP` | `datetime` | Date and time values |
| `JSONB` | `string(0)` | JSON stored as strings |
| `ENUM` | `enum` | Predefined value lists |

## Security Considerations

- **Document Security**: Set to `false` to allow public read access (adjust based on your needs)
- **API Key Security**: Use server-side API keys only, never expose in client code
- **Row Level Security**: Appwrite handles permissions through its built-in security system

## Troubleshooting

### Common Issues

1. **API Key Permissions**: Ensure your API key has full access to databases
2. **Rate Limiting**: The script includes delays to avoid hitting rate limits
3. **Collection Conflicts**: Script handles existing collections gracefully
4. **Attribute Dependencies**: Some attributes may take time to become available

### Error Handling

The script includes comprehensive error handling:
- Graceful handling of existing collections/attributes
- Detailed logging of all operations
- Automatic retry logic for common issues
- Clear error messages for debugging

### Logs

The script provides detailed logging:
- ✅ Success operations
- ⚠️ Warnings and information
- ❌ Error details
- 🔄 Progress indicators

## Post-Migration Steps

After running the migration script:

1. **Verify Collections**: Check your Appwrite console to ensure all collections were created
2. **Test Permissions**: Verify that your application can read/write to the collections
3. **Update Application Code**: Modify your NestJS services to use Appwrite instead of Supabase
4. **Data Migration**: Plan how to migrate existing data from Supabase to Appwrite
5. **Testing**: Thoroughly test all database operations in your application

## Customization

### Adding New Collections

To add new collections, edit `appwrite-schema.js`:

```javascript
// Add to the schema object
new_collection: {
    name: 'new_collection',
    documentSecurity: false,
    attributes: [
        // Define your attributes here
    ],
    indexes: [
        // Define your indexes here
    ]
}
```

### Modifying Attributes

You can customize:
- Field sizes
- Required/optional status
- Default values
- Enum values
- Index configurations

### Database ID

Change the database ID by updating:
- `APPWRITE_DATABASE_ID` environment variable
- The default value in `appwrite-schema.js`

## Support

If you encounter issues:

1. Check the console output for detailed error messages
2. Verify your Appwrite project configuration
3. Ensure your API key has the necessary permissions
4. Check the Appwrite documentation for API changes

## Performance Notes

- The script includes delays to avoid overwhelming the Appwrite API
- Large schemas may take several minutes to complete
- Index creation happens after all attributes are ready
- The script is idempotent - safe to run multiple times
