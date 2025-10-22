FROM node:20-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install backend dependencies
RUN npm install

# Copy backend source code
COPY backend/ .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Start command with migration executed through a shell so custom
# Railway start commands like "cd backend && npm run deploy" work
# correctly. This avoids issues where the platform executes the command
# in exec form (without a shell) which would otherwise fail because
# `cd` is a shell builtin.
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["npm run deploy"]

