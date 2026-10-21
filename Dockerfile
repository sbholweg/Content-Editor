FROM node:22-bookworm-slim

# ffmpeg for video conversion, build tools for whisper.cpp, and the libraries headless Chrome needs.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg build-essential cmake git curl ca-certificates \
      libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 \
      libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 \
      fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run setup

ENV NODE_ENV=production
ENV DATA_DIR=/data
EXPOSE 3000
CMD ["npm", "start"]
