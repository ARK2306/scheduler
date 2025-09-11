# Use Node.js 18 Alpine
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd backend && npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build the React frontend
RUN cd client && npm run build

# Expose port
EXPOSE 3001

# Start the backend server
CMD ["npm", "start"]