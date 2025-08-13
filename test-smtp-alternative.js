const nodemailer = require('nodemailer');

async function testAlternativeSMTPConfigurations() {
  console.log('🔧 Testing Alternative SMTP Configurations...\n');

  const host = '37-58-50-28.cprapid.com';
  const user = 'info@arzansite.com';
  const pass = 'Cya6enCC5rPcs5G';
  const from = 'info@arzansite.com';
  const senderName = 'ArzanSite';

  // Test configurations
  const configs = [
    {
      name: 'Port 587 with STARTTLS',
      config: {
        host,
        port: 587,
        secure: false, // Use STARTTLS
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      }
    },
    {
      name: 'Port 465 with SSL (Modified)',
      config: {
        host,
        port: 465,
        secure: true, // Use SSL
        auth: { user, pass },
        tls: { 
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      }
    },
    {
      name: 'Port 25 with STARTTLS',
      config: {
        host,
        port: 25,
        secure: false, // Use STARTTLS
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n🔍 Testing: ${name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Security: ${config.secure ? 'SSL' : 'STARTTLS'}`);
    
    try {
      const transporter = nodemailer.createTransporter(config);
      
      // Test connection with timeout
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      console.log('   ✅ Connection successful!');
      
      // Test sending email
      const testEmail = {
        from: `"${senderName}" <${from}>`,
        to: 'test@example.com',
        subject: `SMTP Test - ${name}`,
        text: `This is a test email using ${name}`,
      };

      const sendPromise = transporter.sendMail(testEmail);
      const sendTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Send timeout')), 15000)
      );
      
      const info = await Promise.race([sendPromise, sendTimeoutPromise]);
      console.log('   ✅ Email sent successfully!');
      console.log(`   📧 Message ID: ${info.messageId}`);
      
      console.log(`\n🎉 ${name} is working! Use this configuration:`);
      console.log('```javascript');
      console.log(`const transporter = nodemailer.createTransporter(${JSON.stringify(config, null, 2)});`);
      console.log('```');
      
      return config; // Return the working configuration
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      if (error.code) {
        console.log(`   🔍 Error Code: ${error.code}`);
      }
    }
  }
  
  console.log('\n❌ All configurations failed. Please check:');
  console.log('   1. SMTP credentials are correct');
  console.log('   2. Firewall allows SMTP connections');
  console.log('   3. Email provider supports SMTP access');
  console.log('   4. Network connectivity to SMTP server');
  
  return null;
}

// Run the test
console.log('Starting alternative SMTP configuration tests...');
testAlternativeSMTPConfigurations().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
