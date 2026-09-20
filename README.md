# burmistrov-ui

Веб-клиент для сервиса `burmistrov` (Spring Boot API из `~/IdeaProjects/burmistrov`), свёрстанный по макету
Figma «www.burmistrov.pro». Публичный лендинг СТАН (методика Д.А. Бурмистрова) + личный кабинет
тренера/клиента, работающий по реальным контрактам бэкенда (JWT-аутентификация, тренировочные планы,
тренировки, дневник тренировок, вес клиента).

## Стек

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (токены темы — в `src/index.css`, взяты из UI Kit макета)
- react-router-dom, axios, @tanstack/react-query

## Как связано с бэкендом

- `src/api/types.ts` — TypeScript-копии DTO (`app.burmistrov.dto.*`).
- `src/api/endpoints.ts` — по одному модулю на каждый `@RestController` бэкенда.
- `src/api/http.ts` — axios-клиент с JWT (access/refresh) и авто-рефрешем токена по 401.
- В dev-режиме Vite проксирует `/api/*` на `http://localhost:8080` (см. `vite.config.ts`), поэтому
  браузер всегда ходит на свой origin и CORS не требуется.
- Для прод-сборки (или если фронтенд открывается не через Vite-прокси) в бэкенде уже настроен CORS
  (`SecurityConfig.corsConfigurationSource`), разрешённые origin — `app.cors.allowed-origins`
  / `CORS_ALLOWED_ORIGINS` (по умолчанию `http://localhost:5173`).

## Запуск

1. Поднять бэкенд (в `~/IdeaProjects/burmistrov`):
   ```
   docker compose up -d   # Postgres на localhost:5434
   ./mvnw spring-boot:run # API на localhost:8080
   ```
2. Поднять фронтенд:
   ```
   npm install
   npm run dev            # http://localhost:5173
   ```

## Структура

```
src/
  api/            типы + запросы к burmistrov API
  auth/           контекст авторизации (JWT, роль пользователя)
  components/     переиспользуемые UI-элементы (Header, кнопки, модалка входа)
  pages/
    HomePage.tsx  публичный лендинг (посекционно в pages/home/*)
    app/          личный кабинет: общий layout + client/ (тренировки, вес) и trainer/ (клиенты, планы)
  assets/home/    изображения, извлечённые из исходного .fig-макета
```

## Что реализовано по контракту, а что — только визуально

Личный кабинет (вход/регистрация, тренировки клиента с журналом подходов, вес, список клиентов и
тренировочных планов тренера) полностью работает на реальном API. Публичные секции лендинга
(«О технологии», «Специалисты», «Отзывы», «Публикации») — статический контент по образцу макета:
в API `burmistrov` нет соответствующих ресурсов (CMS для статей/отзывов/патентов), поэтому эти
данные не подключены к бэкенду.
