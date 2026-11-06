export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  databaseUrl?: string;
}

export default (): { app: AppConfig } => {
  const port = parseInt(process.env.BACKEND_PORT || '4000', 10);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const apiPrefix = process.env.API_PREFIX || 'api';
  const databaseUrl = process.env.DATABASE_URL;

  return {
    app: {
      nodeEnv,
      port,
      apiPrefix,
      databaseUrl,
    },
  };
};

