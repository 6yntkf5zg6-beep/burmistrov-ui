import { defineConfig } from 'vite'
import type { ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const BACKEND = 'http://localhost:8080'

/**
 * Проксирование на Spring во время разработки.
 *
 * `changeOrigin` подменяет только заголовок Host. Заголовок Origin браузер шлёт
 * при каждом POST, и он остаётся исходным: при заходе с телефона это
 * http://192.168.x.x:5173. Spring видит, что Origin не совпадает с адресом
 * запроса, считает запрос кросс-доменным, сверяет со списком разрешённых
 * источников (там только localhost:5173) и отвечает 403 «Invalid CORS request».
 * Поэтому страница с телефона открывается (у простых GET заголовка Origin нет),
 * а вход не работает.
 *
 * Чиним на стороне прокси: подставляем Origin самого бэкенда — тогда запрос
 * для Spring оказывается однодоменным и до проверки CORS дело не доходит.
 * Правка касается только dev-сервера, настройки бэкенда не трогает.
 */
const proxyToBackend: ProxyOptions = {
  target: BACKEND,
  changeOrigin: true,
  configure: (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      if (proxyReq.getHeader('origin')) {
        proxyReq.setHeader('origin', BACKEND)
      }
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': proxyToBackend,
      // Uploaded exercise images/videos are served by the backend under /uploads.
      '/uploads': proxyToBackend,
    },
  },
})
