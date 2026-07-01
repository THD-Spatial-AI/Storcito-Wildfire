import { API_CONFIG } from '@/constants';
import { APP_VERSION } from '@/version';

export const config = {
  api: {
    baseUrl: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
  },
  app: {
    name: 'fire',
    version: APP_VERSION,
    environment: import.meta.env.MODE || 'development',
  },
} as const;
