# Сборка фронтенда «СТАН».
#
# Vite собирает статику, а отдаёт её nginx — тот же nginx, который стоит перед бэкендом.
# Поэтому в готовом образе нет ни Node, ни node_modules: только папка dist и веб-сервер.
FROM node:22-alpine AS build
WORKDIR /app

# npm ci ставит ровно то, что записано в package-lock.json. Слой переиспользуется,
# пока lock-файл не изменился.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

# Конфиг nginx не зашит в образ: он приезжает из deploy/nginx/templates как шаблон,
# чтобы домен подставлялся из .env и образ не пересобирался ради смены адреса.
COPY --from=build /app/dist /usr/share/nginx/html
