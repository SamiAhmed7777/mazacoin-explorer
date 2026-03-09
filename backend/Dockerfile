FROM node:20-alpine

WORKDIR /app

# Install SSH client (needed for Mazacoin RPC over SSH)
RUN apk add --no-cache openssh-client

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

EXPOSE 3000

CMD ["node", "src/server.js"]
