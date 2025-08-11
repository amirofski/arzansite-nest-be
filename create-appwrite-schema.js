// Load environment variables from .env manually (without external deps)
try {
  const fs = require('fs');
  if (fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1);
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  // ignore env load errors; fall back to existing env
}

const { schema, databases, client } = require('./appwrite-schema');

// Configuration
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5';

// Helper function to create string attribute
async function createStringAttribute(collectionId, attribute) {
    try {
        const { key, size, required, array } = attribute;

        // Appwrite v13: createStringAttribute(db, col, key, size, required?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            size || 255,
            required ?? false,
            null,
            array ?? false,
        ];

        await databases.createStringAttribute(...params);
        
        console.log(`✅ Created string attribute: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  String attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create string attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// Helper function to create integer attribute
async function createIntegerAttribute(collectionId, attribute) {
    try {
        const { key, required, array } = attribute;

        // Debug: Log what we're receiving
        console.log(`🔍 Creating integer attribute: ${key}`, JSON.stringify(attribute, null, 2));

        // Appwrite v13: createIntegerAttribute(db, col, key, required?, min?, max?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            required ?? false,
            null,
            null,
            null,
            array ?? false,
        ];

        console.log(`🔍 Parameters being passed:`, params);

        await databases.createIntegerAttribute(...params);
        
        console.log(`✅ Created integer attribute: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Integer attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create integer attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// Helper function to create float attribute
async function createFloatAttribute(collectionId, attribute) {
    try {
        const { key, required, array } = attribute;

        // Debug: Log what we're receiving
        console.log(`🔍 Creating float attribute: ${key}`, JSON.stringify(attribute, null, 2));

        // Appwrite v13: createFloatAttribute(db, col, key, required?, min?, max?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            required ?? false,
            null,
            null,
            null,
            array ?? false,
        ];

        console.log(`🔍 Parameters being passed:`, params);

        await databases.createFloatAttribute(...params);
        
        console.log(`✅ Created float attribute: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Float attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create float attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// Helper function to create boolean attribute
async function createBooleanAttribute(collectionId, attribute) {
    try {
        const { key, required, array } = attribute;

        // Appwrite v13: createBooleanAttribute(db, col, key, required?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            required ?? false,
            null,
            array ?? false,
        ];

        await databases.createBooleanAttribute(...params);
        
        console.log(`✅ Created boolean attribute: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Boolean attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create boolean attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// Helper function to create datetime attribute
async function createDatetimeAttribute(collectionId, attribute) {
    try {
        const { key, required, array } = attribute;

        // Appwrite v13: createDatetimeAttribute(db, col, key, required?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            required ?? false,
            null,
            array ?? false,
        ];

        await databases.createDatetimeAttribute(...params);
        
        console.log(`✅ Created datetime attribute: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Datetime attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create datetime attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// Helper function to create enum attribute
async function createEnumAttribute(collectionId, attribute) {
    try {
        const { key, required, array, enum: enumValues } = attribute;

        // Appwrite v13: createEnumAttribute(db, col, key, elements, required?, default?, array?)
        const params = [
            APPWRITE_DATABASE_ID,
            collectionId,
            key,
            enumValues,
            required ?? false,
            null,
            array ?? false,
        ];

        await databases.createEnumAttribute(...params);
        
        console.log(`✅ Created enum attribute: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Enum attribute ${attribute.key} already exists in collection ${collectionId}`);
            return true;
        }
        console.error(`❌ Failed to create enum attribute ${attribute.key}:`, error.message);
        return false;
    }
}

// Helper function to create index
async function createIndex(collectionId, index) {
    try {
        const { key, type, attributes, orders } = index;
        
        switch (type) {
            case 'key':
                await databases.createIndex(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    key,
                    'key',
                    attributes,
                    orders
                );
                break;
                
            case 'unique':
                await databases.createIndex(
                    APPWRITE_DATABASE_ID,
                    collectionId,
                    key,
                    'unique',
                    attributes
                );
                break;
                
            default:
                console.warn(`Unknown index type: ${type} for key: ${key}`);
                return false;
        }
        
        console.log(`✅ Created ${type} index: ${key}`);
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Index ${index.key} already exists in collection ${collectionId}`);
            return true;
        }
        
        // Check if it's an "Unknown attribute" error
        if (error.message && error.message.includes('Unknown attribute')) {
            console.error(`❌ Failed to create index ${index.key}: One or more attributes don't exist yet. This usually means the attributes are still being processed.`);
            console.log(`⏳ Waiting for attributes to be ready and retrying...`);
            
            // Wait and retry once
            await new Promise(resolve => setTimeout(resolve, 5000));
            try {
                switch (index.type) {
                    case 'key':
                        await databases.createIndex(
                            APPWRITE_DATABASE_ID,
                            collectionId,
                            index.key,
                            'key',
                            index.attributes,
                            index.orders
                        );
                        break;
                        
                    case 'unique':
                        await databases.createIndex(
                            APPWRITE_DATABASE_ID,
                            collectionId,
                            index.key,
                            'unique',
                            index.attributes
                        );
                        break;
                }
                console.log(`✅ Created ${index.type} index: ${index.key} on retry`);
                return true;
            } catch (retryError) {
                console.error(`❌ Failed to create index ${index.key} on retry:`, retryError.message);
                return false;
            }
        }
        
        console.error(`❌ Failed to create index ${index.key}:`, error.message);
        return false;
    }
}

// Helper function to create collection
async function createCollection(collectionName, collectionConfig) {
    try {
        const { name, documentSecurity, attributes, indexes } = collectionConfig;
        
        // Create collection
        const collection = await databases.createCollection(
            APPWRITE_DATABASE_ID,
            collectionName, // Use stable, human-readable ID equal to the collection name
            name,
            [],
            documentSecurity
        );
        
        console.log(`✅ Created collection: ${name} (ID: ${collection.$id})`);
        
        // Wait a bit for collection to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create attributes
        console.log(`📝 Creating attributes for collection: ${name}`);
        for (const attribute of attributes) {
            let success = false;
            
            switch (attribute.type) {
                case 'string':
                    if (attribute.enum) {
                        success = await createEnumAttribute(collection.$id, attribute);
                    } else {
                        success = await createStringAttribute(collection.$id, attribute);
                    }
                    break;
                    
                case 'integer':
                    success = await createIntegerAttribute(collection.$id, attribute);
                    break;
                    
                case 'double':
                    success = await createFloatAttribute(collection.$id, attribute);
                    break;
                    
                case 'boolean':
                    success = await createBooleanAttribute(collection.$id, attribute);
                    break;
                    
                case 'datetime':
                    success = await createDatetimeAttribute(collection.$id, attribute);
                    break;
                    
                default:
                    console.warn(`Unknown attribute type: ${attribute.type} for key: ${attribute.key}`);
                    success = false;
            }
            
            if (!success) {
                console.error(`Failed to create attribute ${attribute.key} in collection ${name}`);
            }
            
            // Wait a bit between attribute creation
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Wait for attributes to be ready
        console.log(`⏳ Waiting for attributes to be ready...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Create indexes
        console.log(`🔍 Creating indexes for collection: ${name}`);
        for (const index of indexes) {
            // Wait a bit longer before creating indexes to ensure attributes are fully ready
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const success = await createIndex(collection.$id, index);
            if (!success) {
                console.error(`Failed to create index ${index.key} in collection ${name}`);
            }
            
            // Wait a bit between index creation
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`✅ Collection ${name} setup completed successfully!`);
        return collection;
        
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Collection ${collectionName} already exists`);
            return null;
        }
        console.error(`❌ Failed to create collection ${collectionName}:`, error.message);
        return null;
    }
}

// Main function to create all collections
async function createAllCollections() {
    try {
        console.log('🚀 Starting Appwrite schema creation...');
        console.log(`📊 Database ID: ${APPWRITE_DATABASE_ID}`);
        console.log(`🔑 Project ID: ${process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43'}`);
        console.log('');
        
        // Check if database exists, create if not
        try {
            await databases.get(APPWRITE_DATABASE_ID);
            console.log(`✅ Database ${APPWRITE_DATABASE_ID} already exists`);
            
            // Check if we should clean existing collections
            if (process.argv.includes('--clean')) {
                console.log('🧹 Cleaning existing collections...');
                await cleanupExistingCollections();
            }
        } catch (error) {
            if (error.code === 404) {
                console.log(`📝 Creating database: ${APPWRITE_DATABASE_ID}`);
                await databases.create(APPWRITE_DATABASE_ID, 'Main Database');
                console.log(`✅ Database ${APPWRITE_DATABASE_ID} created successfully`);
            } else {
                throw error;
            }
        }
        
        console.log('');
        console.log('📋 Creating collections...');
        console.log('');
        
        // Create all collections
        const collections = Object.values(schema);
        let successCount = 0;
        let totalCount = collections.length;
        
        for (const collectionConfig of collections) {
            console.log(`🔄 Processing collection: ${collectionConfig.name}`);
            const result = await createCollection(collectionConfig.name, collectionConfig);
            if (result) {
                successCount++;
            }
            console.log('');
        }
        
        console.log('🎉 Schema creation completed!');
        console.log(`✅ Successfully created: ${successCount}/${totalCount} collections`);
        
        if (successCount < totalCount) {
            console.log('⚠️  Some collections failed to create. Check the logs above for details.');
        }
        
    } catch (error) {
        console.error('💥 Fatal error during schema creation:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    createAllCollections();
}

// Cleanup function to remove existing collections
async function cleanupExistingCollections() {
    try {
        console.log('🔍 Listing existing collections...');
        const collections = await databases.listCollections(APPWRITE_DATABASE_ID);
        
        for (const collection of collections.collections) {
            console.log(`🗑️  Deleting collection: ${collection.name} (${collection.$id})`);
            try {
                await databases.deleteCollection(APPWRITE_DATABASE_ID, collection.$id);
                console.log(`✅ Deleted collection: ${collection.name}`);
            } catch (error) {
                console.error(`❌ Failed to delete collection ${collection.name}:`, error.message);
            }
        }
        
        console.log('🧹 Cleanup completed!');
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    }
}

module.exports = { createAllCollections, cleanupExistingCollections };
