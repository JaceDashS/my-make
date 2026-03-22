import {DEV_HOST_IP} from './dev-host';

export const RUNTIME_CONFIG = {
  APP_ENV: 'development',
  DEV_HOST_IP,
  CLIENT_LOCAL_PORT: '8080',
  CLIENT_DOCKER_PORT: '18080',
  CLIENT_HEALTH_PATH: '/health',
  CLIENT_RENDER_BASE_URL: 'https://your-render-service.onrender.com',
} as const;
