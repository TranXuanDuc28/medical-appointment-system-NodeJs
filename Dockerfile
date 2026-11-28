# Backend: Node 22 (khớp môi trường phát triển), build Babel rồi chạy bằng node thuần.
# Dùng qua docker-compose ở repo gốc (xem README gốc). Chạy riêng: docker build -t clinic-api .
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build-src

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
# Cài đủ phụ thuộc (kể cả dev): sequelize-cli là devDependency nhưng cần để chạy migrate/seed lúc khởi động.
# (npm install --no-save không giữ được nó khi NODE_ENV=production.) Đổi lại ảnh lớn hơn ~150MB.
RUN npm ci && npm cache clean --force
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY .sequelizerc docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh \
  && mkdir -p build/public/uploads src/public/uploads && chown -R node:node /app
USER node
EXPOSE 6969
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:${PORT:-6969}/ >/dev/null || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "build/server.js"]
