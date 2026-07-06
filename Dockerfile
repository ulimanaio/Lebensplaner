# ---- Build stage: native SQLite-Modul kompilieren ----
FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev

# ---- Runtime ----
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY frontend/ ./frontend/
COPY db/ ./db/
ENV NODE_ENV=production
EXPOSE 8484
VOLUME /data
CMD ["node", "server/server.js"]
