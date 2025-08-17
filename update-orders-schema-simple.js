const { Client, Databases } = require('node-appwrite');

// Appwrite configuration
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://app.arzansite.com/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4';
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '6899993d001b0b35b6b5';
const APPWRITE_COLLECTION_ORDERS = process.env.APPWRITE_COLLECTION_ORDERS || 'orders';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function updateOrdersSchemaSimple() {
    try {
        console.log('🔧 Updating orders collection schema (simplified)...');
        
        // Add payment_status attribute (ESSENTIAL)
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'payment_status',
                20,
                false, // not required
                'pending', // default value
                false // not array
            );
            console.log('✅ Added payment_status attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ payment_status attribute already exists');
            } else {
                console.log('⚠️ Error adding payment_status:', error.message);
            }
        }

        // Add wizardData attribute (CONSOLIDATED - stores all wizard info)
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'wizardData',
                16384, // 16KB for all wizard data
                false,
                null,
                false
            );
            console.log('✅ Added wizardData attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ wizardData attribute already exists');
            } else {
                console.log('⚠️ Error adding wizardData:', error.message);
            }
        }

        // Add payment_gateway attribute
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'payment_gateway',
                50,
                false,
                null,
                false
            );
            console.log('✅ Added payment_gateway attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ payment_gateway attribute already exists');
            } else {
                console.log('⚠️ Error adding payment_gateway:', error.message);
            }
        }

        // Create payment_status index
        try {
            await databases.createIndex(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'payment_status_idx',
                'key',
                ['payment_status'],
                ['ASC']
            );
            console.log('✅ Added payment_status index');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ payment_status index already exists');
            } else {
                console.log('⚠️ Error adding payment_status index:', error.message);
            }
        }

        console.log('🎉 Orders collection schema updated successfully (simplified)!');
        console.log('📝 Note: All wizard data will be stored in the wizardData field as JSON');
        
    } catch (error) {
        console.error('❌ Error updating orders schema:', error);
        throw error;
    }
}

// Run the update
updateOrdersSchemaSimple()
    .then(() => {
        console.log('✅ Schema update completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Schema update failed:', error);
        process.exit(1);
    });
