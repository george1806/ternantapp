# ================================
# Backend Dockerfile - Multi-stage Build
# ================================

# Stage 1: Base - Install dependencies
FROM node:22.18.0-alpine AS base
LABEL maintainer="george1806"

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace and package files
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# ================================
# Stage 2: Builder - Build the application
FROM base AS builder

WORKDIR /app

# Copy backend source code
COPY backend ./backend

# Build the NestJS application
WORKDIR /app/backend
RUN pnpm run build

# ================================
# Stage 3: Development - For development with hot-reload
FROM base AS development

WORKDIR /app

# Install netcat for healthcheck
RUN apk add --no-cache netcat-openbsd

# Copy backend source files (node_modules excluded via .dockerignore)
COPY backend ./backend

WORKDIR /app/backend

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD nc -z localhost 3000 || exit 1

# Start in watch mode
CMD ["pnpm", "run", "dev"]

# ================================
# Stage 4: Production - Optimized production image
FROM node:22.18.0-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Install netcat for healthcheck
RUN apk add --no-cache netcat-openbsd

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/backend/dist ./backend/dist

# Copy necessary runtime files
COPY --chown=nestjs:nodejs backend/src/email/templates ./backend/src/email/templates

WORKDIR /app/backend

# Set production environment
ENV NODE_ENV=production

# Use non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD nc -z localhost 3000 || exit 1

# Start the application
CMD ["node", "dist/main.js"]
