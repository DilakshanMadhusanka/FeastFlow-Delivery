# ==============================================================================
# FeastFlow Backend API - Production Multi-Stage Dockerfile
# Path: apps/api/Dockerfile
# Base Image: Node.js 20 LTS Alpine (Minimal Security Attack Surface)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Compilation Stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Install build dependencies for native compilation (e.g. bcrypt, pg)
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json tsconfig.json ./

# Copy packages & api manifests
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/prisma.config.ts ./apps/api/

# Install dependencies for the monorepo workspaces
RUN npm ci

# Copy source trees
COPY packages/shared/src ./packages/shared/src
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/src ./apps/api/src

# 1. Compile Shared TypeScript Library (@food-delivery/shared)
RUN npm --workspace=@food-delivery/shared run build

# 2. Generate Prisma ORM 7 Engine & Client
RUN npm --workspace=@food-delivery/api run db:generate

# 3. Compile Backend API TypeScript to Production JavaScript
RUN npm --workspace=@food-delivery/api run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime Stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install wget for container health monitoring
RUN apk add --no-cache wget

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Create dedicated non-root application user for hardened security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 feastflow -G nodejs

# Copy root manifests
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Copy compiled shared package
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy compiled API server & Prisma schema
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

# Copy node_modules (including Prisma generated client & production dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Run under unprivileged user
USER feastflow

EXPOSE 5000

# Continuous container health check against the REST /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the FeastFlow API & Socket.IO server
CMD ["node", "apps/api/dist/server.js"]
