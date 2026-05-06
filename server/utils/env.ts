const requiredEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    const error = Object.assign(new Error(`Missing required environment variable: ${key}`), {
      status: 500,
      code: 'CONFIG_MISSING',
    });
    throw error;
  }
  return value;
};

export const getJwtSecret = () => requiredEnv('JWT_SECRET');
export const getPort = () => Number(process.env.PORT ?? 4100);
export const getCorsOrigin = () => process.env.CORS_ORIGIN ?? '*';
