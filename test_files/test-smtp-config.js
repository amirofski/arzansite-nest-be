const nodemailer = require('nodemailer');

async function testSMTPConfiguration() {
  console.log('🔧 Testing SMTP Configuration...\n');

  // SMTP configuration (from your env.example)
  const host = '37-58-50-28.cprapid.com';
  const port = 465;
  const user = 'info@arzansite.com';
  const pass = 'Cya6enCC5rPcs5G';
  const security = 'ssl';
  const from = 'info@arzansite.com';
  const senderName = 'ArzanSite';

  console.log('📋 SMTP Configuration:');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   User: ${user}`);
  console.log(`   Security: ${security}`);
  console.log(`   From: ${from}`);
  console.log(`   Sender Name: ${senderName}`);
  console.log('');

  // Validate required configuration
  if (!host || !port || !user || !pass) {
    console.error('❌ Missing required SMTP configuration:');
    if (!host) console.error('   - SMTP_HOST is missing');
    if (!port) console.error('   - SMTP_PORT is missing');
    if (!user) console.error('   - SMTP_USER is missing');
    if (!pass) console.error('   - SMTP_PASS is missing');
    process.exit(1);
  }

  console.log('🔧 Creating transporter...');
  
  // Create transporter
  const transporter = nodemailer.createTransporter({
    host,
    port,
    secure: security === 'ssl', // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
    // Additional options for better reliability
    pool: false, // Disable pooling for testing
    maxConnections: 1, // Single connection for testing
    maxMessages: 1, // Single message for testing
    rateLimit: 1, // Single message per second for testing
    // Add timeout
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
  });

  try {
    console.log('🔍 Verifying SMTP connection...');
    
    // Verify connection with timeout
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 15000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    console.log('✅ SMTP connection verified successfully!');
    
    // Test email configuration
    console.log('\n📧 Testing email sending...');
    
    const testEmail = {
      from: `"${senderName}" <${from}>`,
      to: 'test@example.com', // This won't actually send, just tests the configuration
      subject: 'SMTP Configuration Test - ArzanSite',
      text: 'This is a test email to verify SMTP configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">SMTP Test Successful!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your email configuration is working correctly</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Configuration Details:</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Host:</strong> ${host}</p>
              <p><strong>Port:</strong> ${port}</p>
              <p><strong>Security:</strong> ${security}</p>
              <p><strong>From Email:</strong> ${from}</p>
              <p><strong>Sender Name:</strong> ${senderName}</p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              Your NestJS application is now ready to send emails using this SMTP configuration!
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const sendPromise = transporter.sendMail(testEmail);
    const sendTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Send timeout')), 15000)
    );
    
    const info = await Promise.race([sendPromise, sendTimeoutPromise]);
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}`);
    
    console.log('\n🎉 SMTP configuration is working perfectly!');
    console.log('   Your NestJS application can now send emails using this configuration.');
    
  } catch (error) {
    console.error('❌ SMTP test failed:', error.message);
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    
    if (error.response) {
      console.error(`   Server Response: ${error.response}`);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Check your SMTP credentials');
    console.log('   2. Verify the SMTP host and port');
    console.log('   3. Ensure your email provider allows SMTP access');
    console.log('   4. Check if you need to enable "Less secure app access"');
    console.log('   5. Verify your firewall settings');
    console.log('   6. Try using port 587 with STARTTLS instead of 465 with SSL');
    
    process.exit(1);
  }
}

// Run the test
console.log('Starting SMTP test...');
testSMTPConfiguration().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
