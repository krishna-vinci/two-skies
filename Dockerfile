# ---- build the web app ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- small runtime image: the server + the built app ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=47318 HOST=0.0.0.0 DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 47318
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:47318/login >/dev/null || exit 1
CMD ["node", "server/server.mjs"]
