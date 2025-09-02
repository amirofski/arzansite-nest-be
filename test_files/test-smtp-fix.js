const nodemailer = require('nodemailer');
require('dotenv').config();

async function testSMTPConnection() {
  console.log('🔍 Testing SMTP Connection...\n');
  
  // Get SMTP configuration
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const security = process.env.SMTP_SECURITY || 'starttls';
  
  console.log('📋 Current SMTP Configuration:');
  console.log(`   Host: ${host}`);
  console.log(`   Port: ${port}`);
  console.log(`   User: ${user}`);
  console.log(`   Security: ${security}`);
  console.log(`   Password: ${pass ? '***' + pass.slice(-4) : 'NOT SET'}\n`);
  
  if (!host || !user || !pass) {
    console.error('❌ Missing required SMTP configuration!');
    console.error('   Please check your .env file for SMTP_HOST, SMTP_USER, and SMTP_PASS');
    return;
  }
  
  // Test different configurations
  const configs = [
    {
      name: 'Port 587 with STARTTLS (Recommended)',
      config: {
        host,
        port: 587,
        secure: false,
        auth: { user, pass },
        requireTLS: true,
        tls: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Port 465 with SSL',
      config: {
        host,
        port: 465,
        secure: true,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Port 25 (Unsecured)',
      config: {
        host,
        port: 25,
        secure: false,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      }
    }
  ];
  
  for (const { name, config } of configs) {
    console.log(`🧪 Testing: ${name}`);
    console.log(`   Config: ${config.host}:${config.port} (secure: ${config.secure})`);
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Test connection
      await transporter.verify();
      console.log('   ✅ Connection successful!');
      
      // Test sending a simple email
      const info = await transporter.sendMail({
        from: `"Test" <${user}>`,
        to: user, // Send to self for testing
        subject: 'SMTP Test Email',
        text: 'This is a test email to verify SMTP configuration.',
        html: '<p>This is a test email to verify SMTP configuration.</p>'
      });
      
      console.log(`   ✅ Test email sent successfully!`);
      console.log(`   📧 Message ID: ${info.messageId}`);
      console.log(`   🎯 Recommended configuration found!\n`);
      
      // Update .env file with working configuration
      console.log('💡 To fix your SMTP configuration, update your .env file:');
      console.log(`   SMTP_PORT=${config.port}`);
      console.log(`   SMTP_SECURITY=${config.secure ? 'ssl' : 'starttls'}\n`);
      
      return; // Exit on first successful configuration
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      
      if (error.code === 'EAUTH') {
        console.log('   🔐 Authentication Error - Check username/password');
      } else if (error.code === 'ECONNECTION') {
        console.log('   🌐 Connection Error - Check host/port');
      } else if (error.message.includes('TLS')) {
        console.log('   🔒 TLS Error - Try different security settings');
      }
      console.log('');
    }
  }
  
  console.log('❌ All SMTP configurations failed!');
  console.log('\n🔧 Troubleshooting Tips:');
  console.log('1. Check your SMTP credentials in the .env file');
  console.log('2. Verify the SMTP server is accessible');
  console.log('3. Try different ports (587, 465, 25)');
  console.log('4. Check if your email provider requires app-specific passwords');
  console.log('5. Verify firewall/proxy settings');
}

// Run the test
testSMTPConnection().catch(console.error);
