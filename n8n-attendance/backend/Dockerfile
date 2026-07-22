# Multi-stage build for production
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    autoconf \
    automake \
    libtool \
    make \
    g++ \
    python3

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the application using production config (excludes tests)
RUN npx tsc --project tsconfig.prod.json

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies with proper exclusion
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]
