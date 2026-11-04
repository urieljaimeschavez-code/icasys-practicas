FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@11.25.0 && pnpm install --prod --frozen-lockfile
COPY --chown=node:node server.cjs app.js index.html styles.css ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node assets/logo-blanco.png ./assets/logo-blanco.png
COPY --chown=node:node docs/DOCUMENTACION.html ./docs/DOCUMENTACION.html
ENV NODE_ENV=production HOST=0.0.0.0 DB_DRIVER=postgres COOKIE_SECURE=1
USER node
EXPOSE 4173
CMD ["node","server.cjs"]
