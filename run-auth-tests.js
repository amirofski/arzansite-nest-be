#!/usr/bin/env node

/**
 * Test Runner for Authentication System
 * 
 * This script runs all authentication tests in the correct order
 * and provides a comprehensive report.
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configurations
const tests = [
  {
    name: 'Unit Tests (Jest)',
    command: 'npm',
    args: ['test'],
    description: 'Run Jest unit tests'
  },
  {
    name: 'E2E Tests (Jest)',
    command: 'npm',
    args: ['run', 'test:e2e'],
    description: 'Run end-to-end tests using Jest'
  },
  {
    name: 'Integration Tests (Custom)',
    command: 'node',
    args: ['test-auth-system.js'],
    description: 'Run comprehensive authentication system tests'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(test) {
  return new Promise((resolve) => {
    log(`\n${'='.repeat(80)}`, 'cyan');
    log(`🧪 Running: ${test.name}`, 'bright');
    log(`📝 Description: ${test.description}`, 'blue');
    log(`🔧 Command: ${test.command} ${test.args.join(' ')}`, 'blue');
    log('='.repeat(80), 'cyan');

    const startTime = Date.now();
    const child = spawn(test.command, test.args, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        log(`\n✅ ${test.name} completed successfully in ${duration}s`, 'green');
      } else {
        log(`\n❌ ${test.name} failed with exit code ${code} after ${duration}s`, 'red');
      }
      
      resolve({ name: test.name, success: code === 0, duration, exitCode: code });
    });

    child.on('error', (error) => {
      log(`\n❌ Failed to start ${test.name}: ${error.message}`, 'red');
      resolve({ name: test.name, success: false, duration: 0, error: error.message });
    });
  });
}

async function runAllTests() {
  log('🚀 Authentication System Test Runner', 'bright');
  log('This will run all authentication tests in sequence\n', 'blue');

  // Check if we're in the right directory
  const packageJsonExists = require('fs').existsSync('./package.json');
  if (!packageJsonExists) {
    log('❌ Error: package.json not found. Please run this script from the project root.', 'red');
    process.exit(1);
  }

  const results = [];
  const startTime = Date.now();

  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);

    // Add a small delay between tests
    if (test !== tests[tests.length - 1]) {
      log('\n⏳ Waiting 2 seconds before next test...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Print final summary
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  log('\n' + '='.repeat(80), 'magenta');
  log('📊 FINAL TEST RESULTS SUMMARY', 'bright');
  log('='.repeat(80), 'magenta');
  log(`Total Test Suites: ${results.length}`, 'blue');
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'red');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`Total Duration: ${totalDuration}s`, 'blue');
  log(`Success Rate: ${((passed / results.length) * 100).toFixed(2)}%`, failed === 0 ? 'green' : 'yellow');

  log('\n📋 Detailed Results:', 'bright');
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const color = result.success ? 'green' : 'red';
    log(`  ${status} ${result.name} (${result.duration}s)`, color);
    if (result.error) {
      log(`    Error: ${result.error}`, 'red');
    }
    if (result.exitCode && result.exitCode !== 0) {
      log(`    Exit Code: ${result.exitCode}`, 'red');
    }
  });

  if (failed === 0) {
    log('\n🎉 All tests passed! Your authentication system is working correctly.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please check the output above for details.', 'yellow');
  }

  log('\n💡 Next Steps:', 'bright');
  log('1. If tests failed, check the error messages above', 'blue');
  log('2. Ensure your backend server is running on the correct port', 'blue');
  log('3. Verify your environment variables are set correctly', 'blue');
  log('4. Check your Appwrite configuration and database schema', 'blue');
  log('5. Review the SMTP configuration for email-related tests', 'blue');

  process.exit(failed > 0 ? 1 : 0);
}

// Handle process interruption
process.on('SIGINT', () => {
  log('\n\n⚠️  Test execution interrupted by user', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\n\n⚠️  Test execution terminated', 'yellow');
  process.exit(1);
});

// Run all tests
runAllTests().catch(error => {
  log(`\n❌ Test runner failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
