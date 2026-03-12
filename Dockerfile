FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies (production only)
COPY package*.json ./
RUN npm install --only=production

# Copy application source
COPY . .

# The API listens on port 3001
EXPOSE 3001

# Default environment configuration
ENV NODE_ENV=production

# Start the Express backend
CMD ["node", "server.js"]

