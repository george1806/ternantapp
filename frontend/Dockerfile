# ================================
# Frontend Dockerfile - Multi-stage Build
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
COPY frontend/package.json ./frontend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ================================
# Stage 2: Builder - Build the Next.js application
FROM base AS builder

WORKDIR /app

# Copy frontend source code
COPY frontend ./frontend

# Set environment variables for build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js application
WORKDIR /app/frontend
RUN pnpm run build

# ================================
# Stage 3: Development - For development with hot-reload
FROM node:22.18.0-alpine AS development

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Install netcat for healthcheck
RUN apk add --no-cache netcat-openbsd

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy frontend source
COPY frontend ./frontend

WORKDIR /app/frontend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD nc -z localhost 3001 || exit 1

# Start in development mode with Turbopack
CMD ["pnpm", "run", "dev"]

# ================================
# Stage 4: Production - Optimized production image
FROM node:22.18.0-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Install netcat for healthcheck
RUN apk add --no-cache netcat-openbsd

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/frontend

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./public

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

# Use non-root user
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD nc -z localhost 3001 || exit 1

# Start the Next.js application
CMD ["node", "server.js"]
