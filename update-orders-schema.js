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

async function updateOrdersSchema() {
    try {
        console.log('🔧 Updating orders collection schema...');
        
        // Add payment_status attribute
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

        // Add sessionId attribute
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'sessionId',
                100,
                false,
                null,
                false
            );
            console.log('✅ Added sessionId attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ sessionId attribute already exists');
            } else {
                console.log('⚠️ Error adding sessionId:', error.message);
            }
        }

        // Add siteType attribute
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'siteType',
                50,
                false,
                null,
                false
            );
            console.log('✅ Added siteType attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ siteType attribute already exists');
            } else {
                console.log('⚠️ Error adding siteType:', error.message);
            }
        }

        // Add websiteFramework attribute (JSON as string)
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'websiteFramework',
                8192,
                false,
                null,
                false
            );
            console.log('✅ Added websiteFramework attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ websiteFramework attribute already exists');
            } else {
                console.log('⚠️ Error adding websiteFramework:', error.message);
            }
        }

        // Add branding attribute (JSON as string)
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'branding',
                2048,
                false,
                null,
                false
            );
            console.log('✅ Added branding attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ branding attribute already exists');
            } else {
                console.log('⚠️ Error adding branding:', error.message);
            }
        }

        // Add additionalServices attribute (JSON as string)
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'additionalServices',
                2048,
                false,
                null,
                false
            );
            console.log('✅ Added additionalServices attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ additionalServices attribute already exists');
            } else {
                console.log('⚠️ Error adding additionalServices:', error.message);
            }
        }

        // Add domains attribute (JSON as string)
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'domains',
                2048,
                false,
                null,
                false
            );
            console.log('✅ Added domains attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ domains attribute already exists');
            } else {
                console.log('⚠️ Error adding domains:', error.message);
            }
        }

        // Add pricing attribute (JSON as string)
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'pricing',
                2048,
                false,
                null,
                false
            );
            console.log('✅ Added pricing attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ pricing attribute already exists');
            } else {
                console.log('⚠️ Error adding pricing:', error.message);
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

        // Add callback_url attribute
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'callback_url',
                500,
                false,
                null,
                false
            );
            console.log('✅ Added callback_url attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ callback_url attribute already exists');
            } else {
                console.log('⚠️ Error adding callback_url:', error.message);
            }
        }

        // Add return_url attribute
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'return_url',
                500,
                false,
                null,
                false
            );
            console.log('✅ Added return_url attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ return_url attribute already exists');
            } else {
                console.log('⚠️ Error adding return_url:', error.message);
            }
        }

        // Add zarinpal_authority attribute
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'zarinpal_authority',
                100,
                false,
                null,
                false
            );
            console.log('✅ Added zarinpal_authority attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ zarinpal_authority attribute already exists');
            } else {
                console.log('⚠️ Error adding zarinpal_authority:', error.message);
            }
        }

        // Add zarinpal_ref_id attribute
        try {
            await databases.createStringAttribute(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'zarinpal_ref_id',
                100,
                false,
                null,
                false
            );
            console.log('✅ Added zarinpal_ref_id attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ zarinpal_ref_id attribute already exists');
            } else {
                console.log('⚠️ Error adding zarinpal_ref_id:', error.message);
            }
        }

        // Create indexes
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

        try {
            await databases.createIndex(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ORDERS,
                'sessionId_idx',
                'key',
                ['sessionId'],
                ['ASC']
            );
            console.log('✅ Added sessionId index');
        } catch (error) {
            if (error.code === 409) {
                console.log('⏭️ sessionId index already exists');
            } else {
                console.log('⚠️ Error adding sessionId index:', error.message);
            }
        }

        console.log('🎉 Orders collection schema updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating orders schema:', error);
        throw error;
    }
}

// Run the update
updateOrdersSchema()
    .then(() => {
        console.log('✅ Schema update completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Schema update failed:', error);
        process.exit(1);
    });
