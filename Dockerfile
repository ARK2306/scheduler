# Use Node.js 18 Alpine for smaller image
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY backend/package*.json ./backend/
COPY client/package*.json ./client/

# Install production dependencies only
RUN cd backend && npm ci --only=production
RUN cd client && npm ci --only=production

# Copy source code
COPY backend/ ./backend/
COPY client/ ./client/

# Build the React frontend
RUN cd client && npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port (Koyeb sets PORT env var)
EXPOSE 8000

# Set working directory to backend
WORKDIR /app/backend

# Use dumb-init and start the server
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]