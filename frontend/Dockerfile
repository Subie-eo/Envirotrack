# Build stage
FROM node:18-alpine AS builder

WORKDIR /build

COPY frontend/package*.json ./
RUN npm install

COPY frontend/src ./src
COPY frontend/public ./public

RUN npm run build

# Production stage - Serve with nginx
FROM node:18-alpine

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /build/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
