import { defineConfig } from '@apps-in-toss/web-framework/config';
export default defineConfig({ appName: 'vibefolio', brand: { displayName: '바이브폴리오', primaryColor: '#6366F1', icon: 'https://vibers.co.kr/favicon.ico' }, web: { host: 'localhost', port: 3432, commands: { dev: 'vite', build: 'vite build' } }, permissions: [], webViewProps: { type: 'partner' } });
