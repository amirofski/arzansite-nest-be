const net = require('net');
const dns = require('dns');

async function diagnoseSMTPConnection() {
  console.log('🔍 SMTP Connection Diagnostic\n');

  const host = '37-58-50-28.cprapid.com';
  const ports = [465, 587, 25];

  // Test DNS resolution
  console.log('1. Testing DNS resolution...');
  try {
    const addresses = await dns.promises.resolve4(host);
    console.log(`   ✅ DNS resolved: ${host} -> ${addresses.join(', ')}`);
  } catch (error) {
    console.log(`   ❌ DNS resolution failed: ${error.message}`);
    return;
  }

  // Test port connectivity
  console.log('\n2. Testing port connectivity...');
  for (const port of ports) {
    console.log(`   Testing ${host}:${port}...`);
    
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log(`   ❌ Timeout connecting to ${host}:${port}`);
    }, 10000);

    try {
      await new Promise((resolve, reject) => {
        socket.connect(port, host, () => {
          clearTimeout(timeout);
          console.log(`   ✅ Port ${port} is reachable`);
          socket.destroy();
          resolve();
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          console.log(`   ❌ Port ${port} error: ${error.message}`);
          reject(error);
        });
      });
    } catch (error) {
      // Error already logged above
    }
  }

  // Test with telnet-like connection
  console.log('\n3. Testing SMTP handshake...');
  const testPort = 587; // Try port 587 first
  
  const socket = new net.Socket();
  const timeout = setTimeout(() => {
    socket.destroy();
    console.log(`   ❌ Timeout during SMTP handshake`);
  }, 15000);

  try {
    await new Promise((resolve, reject) => {
      let dataReceived = false;
      
      socket.connect(testPort, host, () => {
        console.log(`   ✅ Connected to ${host}:${testPort}`);
      });

      socket.on('data', (data) => {
        dataReceived = true;
        const response = data.toString().trim();
        console.log(`   📨 Server response: ${response}`);
        
        if (response.startsWith('220')) {
          console.log('   ✅ SMTP server is responding');
          clearTimeout(timeout);
          socket.destroy();
          resolve();
        }
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`   ❌ SMTP handshake error: ${error.message}`);
        reject(error);
      });

      socket.on('close', () => {
        if (!dataReceived) {
          clearTimeout(timeout);
          console.log('   ❌ Connection closed without response');
          reject(new Error('Connection closed'));
        }
      });
    });
  } catch (error) {
    // Error already logged above
  }

  console.log('\n📋 Summary:');
  console.log('   - If DNS resolution failed: Check internet connection');
  console.log('   - If ports are unreachable: Check firewall settings');
  console.log('   - If SMTP handshake failed: Check SMTP server status');
  console.log('   - If all tests pass: SMTP server is reachable');
}

// Run diagnostic
diagnoseSMTPConnection().catch(console.error);
