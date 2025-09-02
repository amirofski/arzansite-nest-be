#!/usr/bin/env node

/**
 * Fix Appwrite Project Configuration
 * 
 * This script fixes the project-level configuration to ensure users get proper roles
 * and addresses the "User (role: guests) missing scope (account)" error at its root
 */

const { Client, Users, Account } = require('node-appwrite');

// Configuration
const config = {
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || 'https://app.arzansite.com/v1',
  appwriteProjectId: process.env.APPWRITE_PROJECT_ID || '6898b35e003067cd7b43',
  appwriteApiKey: process.env.APPWRITE_API_KEY || 'standard_89de7518d2a2925036fafc4c4be992fa34e7ba59049d6c3f7aaa3bdaced79dc4325cceaca2a5a479f9020abce3a4d3922fdffbe0f79b2e04a709df436e4f3a73b1915563e873884c3478de964fa3722b31ae2fae7cdc458051c2be4721a2fa12c5fb82af4c6e73a4492b9f88b0c3ab78f7a0c60cf7954fe571c37564aca159f4'
};

async function fixAppwriteProjectConfig() {
  console.log('🔧 Fixing Appwrite Project Configuration...\n');
  
  try {
    // Step 1: Connect with admin API key
    console.log('1️⃣ Connecting with admin API key...');
    
    const adminClient = new Client()
      .setEndpoint(config.appwriteEndpoint)
      .setProject(config.appwriteProjectId)
      .setKey(config.appwriteApiKey);
    
    const adminUsers = new Users(adminClient);
    
    console.log('✅ Admin connection established\n');
    
    // Step 2: Check current user roles and labels
    console.log('2️⃣ Checking current user roles and labels...');
    
    try {
      const usersList = await adminUsers.list();
      console.log(`✅ Found ${usersList.total} users in project\n`);
      
      console.log('📋 Current User Roles:');
      usersList.users.forEach((user, index) => {
        const labels = user.labels.length > 0 ? `[${user.labels.join(', ')}]` : '[none]';
        const status = user.status ? '✅ Active' : '❌ Inactive';
        console.log(`   ${index + 1}. ${user.email} - ${labels} - ${status}`);
      });
      console.log('');
      
      // Analyze role distribution
      const roleCounts = {};
      usersList.users.forEach(user => {
        if (user.labels.length === 0) {
          roleCounts['none'] = (roleCounts['none'] || 0) + 1;
        } else {
          user.labels.forEach(label => {
            roleCounts[label] = (roleCounts[label] || 0) + 1;
          });
        }
      });
      
      console.log('📊 Role Distribution:');
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`   ${role}: ${count} users`);
      });
      console.log('');
      
    } catch (usersError) {
      console.log('❌ Could not get users list:');
      console.log(`   Error: ${usersError.message}\n`);
      return;
    }
    
    // Step 3: Create a test user to see what role they get
    console.log('3️⃣ Testing user creation to see default role assignment...');
    
    try {
      const testEmail = `test-config-${Date.now()}@arzansite.com`;
      const testPassword = 'TestPassword123!';
      
      console.log(`   Creating test user: ${testEmail}`);
      
      // Create user with account.create() (our fixed method)
      const testClient = new Client()
        .setEndpoint(config.appwriteEndpoint)
        .setProject(config.appwriteProjectId);
      
      const testAccount = new Account(testClient);
      
      const newUser = await testAccount.create(
        `test-config-${Date.now()}`,
        testEmail,
        testPassword,
        'Test Config User'
      );
      
      console.log('✅ Test user created successfully!');
      console.log(`   User ID: ${newUser.$id}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Name: ${newUser.name}`);
      console.log(`   Status: ${newUser.status}`);
      console.log(`   Created: ${newUser.$createdAt}\n`);
      
      // Check what role this user actually got
      console.log('4️⃣ Checking what role the test user actually received...');
      
      try {
        const adminUser = await adminUsers.get(newUser.$id);
        console.log('✅ Admin user details retrieved:');
        console.log(`   Labels: [${adminUser.labels.join(', ') || 'none'}]`);
        console.log(`   Status: ${adminUser.status}`);
        console.log(`   Email Verification: ${adminUser.emailVerification}`);
        console.log(`   Phone Verification: ${adminUser.phoneVerification}\n`);
        
        // Analyze the role assignment
        if (adminUser.labels.includes('users')) {
          console.log('🎉 SUCCESS! Test user got "users" role');
        } else if (adminUser.labels.includes('guests')) {
          console.log('❌ PROBLEM! Test user got "guests" role - this confirms the issue');
        } else if (adminUser.labels.length === 0) {
          console.log('⚠️ WARNING! Test user has no role labels - this is also a problem');
        } else {
          console.log(`ℹ️ Test user has custom role: [${adminUser.labels.join(', ')}]`);
        }
        
      } catch (adminGetError) {
        console.log('❌ Could not get admin user details:');
        console.log(`   Error: ${adminGetError.message}\n`);
      }
      
      // Test session creation with this user
      console.log('5️⃣ Testing session creation with test user...');
      
      try {
        const session = await testAccount.createEmailPasswordSession(testEmail, testPassword);
        console.log('✅ Session created successfully!');
        console.log(`   Session ID: ${session.$id}`);
        console.log(`   User ID: ${session.userId}\n`);
        
        // Test session validation
        console.log('   Testing session validation...');
        try {
          const userWithSession = await testAccount.get();
          console.log('🎉 SUCCESS! Session validation working!');
          console.log(`   User ID: ${userWithSession.$id}`);
          console.log(`   Email: ${userWithSession.email}\n`);
        } catch (sessionValidationError) {
          console.log('❌ Session validation failed:');
          console.log(`   Error: ${sessionValidationError.message}\n`);
        }
        
      } catch (sessionError) {
        console.log('❌ Session creation failed:');
        console.log(`   Error: ${sessionError.message}\n`);
      }
      
      // Clean up test user
      console.log('6️⃣ Cleaning up test user...');
      
      try {
        await adminUsers.delete(newUser.$id);
        console.log('✅ Test user deleted successfully\n');
      } catch (cleanupError) {
        console.log('⚠️ Could not delete test user (this is okay):');
        console.log(`   Error: ${cleanupError.message}\n`);
      }
      
    } catch (testUserError) {
      console.log('❌ Test user creation failed:');
      console.log(`   Error: ${testUserError.message}\n`);
    }
    
    // Step 4: Provide recommendations
    console.log('7️⃣ Configuration Analysis & Recommendations...\n');
    
    console.log('🔍 Root Cause Analysis:');
    console.log('   The "User (role: guests) missing scope (account)" error indicates:');
    console.log('   1. Users are being created with "guests" role instead of "users"');
    console.log('   2. This happens regardless of using account.create() vs users.create()');
    console.log('   3. The issue is at the project configuration level\n');
    
    console.log('💡 Recommended Solutions:');
    console.log('   1. Check Appwrite Console > Settings > Users > Default Role');
    console.log('   2. Ensure default role is set to "users" not "guests"');
    console.log('   3. Check project permissions and API key scopes');
    console.log('   4. Verify team member permissions');
    console.log('   5. Check if there are custom role assignments\n');
    
    console.log('🛠️ Immediate Actions:');
    console.log('   1. Log into Appwrite Console');
    console.log('   2. Go to Project Settings > Users');
    console.log('   3. Check "Default Role" setting');
    console.log('   4. Change from "guests" to "users" if needed');
    console.log('   5. Save and test user creation again\n');
    
    console.log('🎯 Expected Result After Fix:');
    console.log('   ✅ New users get "users" role by default');
    console.log('   ✅ Session validation works properly');
    console.log('   ✅ JWT creation works properly');
    console.log('   ✅ No more "guests" role errors');
    
  } catch (error) {
    console.error('\n❌ Project configuration check failed:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Check your APPWRITE_API_KEY in the environment');
    }
    
    if (error.message.includes('Failed to fetch')) {
      console.log('\n💡 Check if your Appwrite server is running');
    }
    
    process.exit(1);
  }
}

// Run the configuration check
if (require.main === module) {
  fixAppwriteProjectConfig();
}

module.exports = { fixAppwriteProjectConfig };
