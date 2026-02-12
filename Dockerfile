FROM node:20-alpine AS base

WORKDIR /app

# Copy workspace files
COPY package.json tsconfig.json ./
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install dependencies
RUN npm install --omit=dev

# Copy source
COPY packages/ packages/
COPY apps/api/ apps/api/

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start
CMD ["npx", "tsx", "apps/api/src/server.ts"]
