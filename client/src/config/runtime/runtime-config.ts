import { DEV_HOST_IP } from './dev-host';

export const RUNTIME_CONFIG = {
  APP_ENV: 'development',
  DEV_HOST_IP,
  CLIENT_LOCAL_PORT: '8080',
  CLIENT_DOCKER_PORT: '18080',
  CLIENT_HEALTH_PATH: '/health',
  CLIENT_ACCOUNT_LOGIN_PATH: '/api/accounts/login',
  CLIENT_ACCOUNT_PROFILE_PATH: '/api/accounts/profile',
  CLIENT_ACCOUNT_PROFILE_UPDATE_PATH: '/api/accounts/profile/update',
  CLIENT_ACCOUNT_LOGOUT_PATH: '/api/accounts/logout',
  CLIENT_ACCOUNT_MEMBER_REGISTER_PATH: '/api/accounts/member-register',
  CLIENT_ACCOUNT_ROOT_REGISTER_PATH: '/api/accounts/root-register',
  CLIENT_DEV_INIT_TABLES_PATH: '/api/dev-tools/tables/init',
  CLIENT_DEV_INIT_AND_SEED_PATH: '/api/dev-tools/tables/init-and-inject',
  CLIENT_DEV_CREATE_LICENSE_PATH: '/api/dev-tools/licenses',
  CLIENT_DEV_SERVER_LOG_PATH: '/api/dev-tools/server-log',
  CLIENT_LICENSE_RENEW_PATH: '/api/licenses/renew',
  CLIENT_RENDER_BASE_URL: 'https://your-render-service.onrender.com',
} as const;
