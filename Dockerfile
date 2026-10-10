# Development image for the Brainy Clan Expo app (Metro bundler / web export / CI).
FROM node:22-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# 8081 = Metro bundler (Expo Go connects here). 19000-19002 = legacy Expo CLI ports.
EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start"]
