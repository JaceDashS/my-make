import {DEV_HOST_IP} from './dev-host';

export const RUNTIME_CONFIG = {
  APP_ENV: 'development',
  DEV_HOST_IP,
  CLIENT_LOCAL_PORT: '8080',
  CLIENT_DOCKER_PORT: '18080',
  CLIENT_HEALTH_PATH: '/health',
  CLIENT_ACCOUNT_LOGIN_PATH: '/accounts/login',
  CLIENT_ACCOUNT_ROOT_REGISTER_PATH: '/accounts/root-register',
  CLIENT_DEV_INIT_TABLES_PATH: '/dev-tools/tables/init',
  CLIENT_DEV_CREATE_LICENSE_PATH: '/dev-tools/licenses',
  CLIENT_LICENSE_RENEW_PATH: '/licenses/renew',
  CLIENT_RENDER_BASE_URL: 'https://your-render-service.onrender.com',
} as const;
