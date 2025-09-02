const nodemailer = require('nodemailer');

async function testEmailService() {
  console.log('🔧 Testing Email Service...\n');

  // SMTP configuration (from your env.example)
  const host = '37-58-50-28.cprapid.com';
  const port = 587; // Try port 587 with STARTTLS first
  const user = 'info@arzansite.com';
  const pass = 'Cya6enCC5rPcs5G';
  const from = 'info@arzansite.com';
  const senderName = 'ArzanSite';

  console.log('📋 SMTP Configuration:');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   User: ${user}`);
  console.log(`   Security: STARTTLS`);
  console.log(`   From: ${from}`);
  console.log(`   Sender Name: ${senderName}`);
  console.log('');

  // Create transporter with STARTTLS (more reliable than SSL)
  const transporter = nodemailer.createTransporter({
    host,
    port,
    secure: false, // Use STARTTLS
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
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
              <p><strong>Security:</strong> STARTTLS</p>
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
    
    // Now test the specific email template that's failing
    console.log('\n📧 Testing verification email template...');
    
    const verificationEmail = {
      from: `"${senderName}" <${from}>`,
      to: 'test@example.com',
      subject: 'Verify Your Email - ArzanSite',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Verify Your Email</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Complete your ArzanSite registration</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello there!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for signing up for ArzanSite! To complete your registration, please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/auth/verify?token=test-token&userId=test-user" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #667eea; word-break: break-all; margin-bottom: 20px;">
              https://arzansite.com/auth/verify?token=test-token&userId=test-user
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
              </p>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              If you didn't create an account with ArzanSite, you can safely ignore this email.
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Verify Your Email - ArzanSite

Hello there!

Thank you for signing up for ArzanSite! To complete your registration, please verify your email address by clicking the link below.

Verify Email Address: https://arzansite.com/auth/verify?token=test-token&userId=test-user

Important: This verification link will expire in 24 hours for security reasons.

If you didn't create an account with ArzanSite, you can safely ignore this email.

© 2024 ArzanSite. All rights reserved.
      `,
    };

    const verificationInfo = await Promise.race([
      transporter.sendMail(verificationEmail),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 15000))
    ]);
    
    console.log('✅ Verification email template test successful!');
    console.log(`   Message ID: ${verificationInfo.messageId}`);
    
    return true;
    
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
    
    return false;
  }
}

// Run the test
console.log('Starting email service test...');
testEmailService().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
