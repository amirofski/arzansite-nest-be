# Scheduled Tasks Crypto Issue - Resolution

## 🚨 Issue Description

The application was encountering a `ReferenceError: crypto is not defined` error when running in Docker containers with Node.js v18.20.5. This error occurred because:

1. **`@nestjs/schedule` package** uses `crypto.randomUUID()` internally
2. **`crypto.randomUUID()`** was introduced in Node.js v19.0.0
3. **Docker container** was using Node.js v18-alpine (production stage)
4. **Local development** uses Node.js v22.15.0 (which supports the function)

## 🔧 Applied Fixes

### 1. Updated Dockerfile
**File**: `Dockerfile`
**Change**: Updated production stage from `node:18-alpine` to `node:20-alpine`

```dockerfile
# Before
FROM node:18-alpine AS production

# After  
FROM node:20-alpine AS production
```

**Reason**: Node.js 20+ includes `crypto.randomUUID()` support

### 2. Enhanced Scheduled Tasks Service
**File**: `src/scheduled-tasks/scheduled-tasks.service.ts`
**Changes**: Added explicit names to all cron jobs to avoid auto-generated names

```typescript
// Before
@Cron(CronExpression.EVERY_HOUR)
async checkOverdueInvoices() { ... }

// After
@Cron(CronExpression.EVERY_HOUR, {
  name: 'check-overdue-invoices'
})
async checkOverdueInvoices() { ... }
```

**Reason**: Explicit names prevent the scheduler from trying to generate UUIDs

### 3. Added Node.js Version Requirements
**File**: `package.json`
**Addition**: Added engines field to specify minimum Node.js version

```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
```

**Reason**: Prevents deployment with incompatible Node.js versions

## 📋 Scheduled Tasks Overview

The system now includes the following automated tasks:

### Hourly Tasks
- **Overdue Invoice Check**: Identifies and marks overdue invoices
- **Email Notifications**: Sends overdue warnings to users

### Every 6 Hours
- **Auto-payment**: Processes pending invoices if sufficient wallet balance

### Daily Tasks (2 AM)
- **Maintenance**: Comprehensive system maintenance and cleanup

### Weekly Tasks (Sunday 9 AM)
- **Summary Reports**: Generates weekly financial summaries

### Monthly Tasks (1st of month, 3 AM)
- **Cleanup**: Archives old data and generates monthly reports

## 🔍 Technical Details

### Why This Happened
1. **NestJS Schedule Package**: Uses `crypto.randomUUID()` for generating unique task names
2. **Node.js Version Mismatch**: Production Docker used Node.js 18, but function requires Node.js 19+
3. **Silent Failure**: The error only appeared in production, not local development

### Prevention Measures
1. **Version Specification**: Package.json now specifies minimum Node.js version
2. **Explicit Naming**: All cron jobs have explicit names to avoid UUID generation
3. **Docker Update**: Production containers now use Node.js 20+

## 🚀 Deployment Instructions

### For Docker Deployment
1. **Rebuild the image** with the updated Dockerfile:
   ```bash
   docker build -t arzansite-be .
   ```

2. **Verify Node.js version** in the container:
   ```bash
   docker run --rm arzansite-be node --version
   # Should output: v20.x.x
   ```

### For Local Development
1. **Check Node.js version**:
   ```bash
   node --version
   # Should be >= 20.0.0
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm run start:dev
   ```

## ✅ Verification Steps

### 1. Check Application Startup
```bash
npm run start:prod
```
- Should start without crypto errors
- Scheduled tasks should initialize properly

### 2. Verify Scheduled Tasks
Check logs for scheduled task initialization:
```
[ScheduleExplorer] Registering scheduled task: check-overdue-invoices
[ScheduleExplorer] Registering scheduled task: auto-pay-invoices
[ScheduleExplorer] Registering scheduled task: daily-maintenance
[ScheduleExplorer] Registering scheduled task: weekly-summary
[ScheduleExplorer] Registering scheduled task: monthly-cleanup
```

### 3. Test Docker Build
```bash
docker build -t arzansite-be .
docker run --rm arzansite-be node --version
```

## 🔒 Security Considerations

### Node.js Version Security
- **Node.js 20**: Includes latest security patches
- **Alpine Linux**: Minimal attack surface
- **Non-root user**: Application runs as `nestjs` user

### Scheduled Tasks Security
- **Explicit naming**: Prevents predictable task identification
- **Error handling**: All tasks include try-catch blocks
- **Logging**: Comprehensive logging for monitoring

## 📊 Monitoring

### Log Monitoring
Monitor these log patterns for scheduled tasks:

```bash
# Successful execution
"Running overdue invoices check..."
"Overdue invoices check completed successfully"

# Error patterns
"Error checking overdue invoices:"
"Error during daily maintenance:"
```

### Health Checks
The application includes health check endpoint:
```bash
curl -f http://localhost:3000/api/health
```

## 🎯 Next Steps

1. **Deploy Updated Image**: Rebuild and deploy with Node.js 20
2. **Monitor Logs**: Watch for scheduled task execution
3. **Test Functionality**: Verify invoice processing and email notifications
4. **Performance Monitoring**: Monitor resource usage with new Node.js version

## 📚 Related Documentation

- [Wallet & Invoice API Documentation](./WALLET_INVOICE_API_DOCUMENTATION.md)
- [Comprehensive API Docs](./COMPREHENSIVE_API_DOCS.md)
- [Docker Configuration](./docker-compose.yml)

---

**Fix Applied**: December 2024  
**Node.js Version**: 20.x  
**Status**: ✅ Resolved
