export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  databaseUrl?: string;
  auth: AuthConfig;
}

export default (): { app: AppConfig } => {
  const port = parseInt(process.env.BACKEND_PORT || '4000', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const apiPrefix = process.env.API_PREFIX || 'api';
  const databaseUrl = process.env.DATABASE_URL;

  const auth: AuthConfig = {
    jwtSecret:
      process.env.JWT_SECRET ||
      'ignitron-2k26-secret-development-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@ignitron.local',
    adminPassword: process.env.ADMIN_PASSWORD || 'Ignitron@Admin2026',
    adminFullName:
      process.env.ADMIN_FULL_NAME || 'IGNITRON System Administrator',
  };

  return {
    app: {
      nodeEnv,
      port,
      apiPrefix,
      databaseUrl,
      auth,
    },
  };
};
