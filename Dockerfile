# Use Node.js 18 Alpine
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY backend/package*.json ./backend/
COPY client/package*.json ./client/

# Install dependencies
RUN cd backend && npm install
RUN cd client && npm install

# Copy source code
COPY backend/ ./backend/
COPY client/ ./client/

# Build the React frontend
RUN cd client && npm run build

# Expose port
EXPOSE 3001

# Set working directory to backend
WORKDIR /app/backend

# Start the backend server
CMD ["npm", "start"]