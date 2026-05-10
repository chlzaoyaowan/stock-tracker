import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // 腾讯行情 API (A股)
      '/api/tencent': {
        target: 'https://qt.gtimg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tencent/, ''),
      },
      // 新浪股票搜索 API (A股)
      '/api/sina/search': {
        target: 'https://suggest3.sinajs.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sina\/search/, '/suggest'),
      },
      // 新浪分钟K线 (A股分时)
      '/api/sina/quotes': {
        target: 'https://quotes.sina.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sina\/quotes/, ''),
      },
      // Finnhub 搜索 (美股)
      '/api/finnhub': {
        target: 'https://finnhub.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/finnhub/, ''),
      },
    }
  }
})
