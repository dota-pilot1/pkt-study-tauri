import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 앱 버전은 package.json 하나만 보고 간다 (셸 하단 뱃지 · 설정 화면).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  clearScreen: false,
  server: {
    port: 4330,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
});
