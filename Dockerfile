# Multi-stage build for production
FROM node:20-alpine AS builder

# Install git and curl
RUN apk add --no-cache git curl

# Set working directory
WORKDIR /app

# Clone the repository (you can also use ARG for branch selection)
ARG REPO_URL=https://github.com/amirofski/arzansite-nest-be.git
ARG BRANCH=main

RUN git clone --branch ${BRANCH} --depth 1 ${REPO_URL} .

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files from builder
COPY --from=builder /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy healthcheck script if it exists
COPY --from=builder --chown=nestjs:nodejs /app/healthcheck.js ./ 2>/dev/null || true

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "dist/main"]