const readEnv = (key: string) => process.env[key]?.trim();

const requiredEnv = (key: string) => {
  const value = readEnv(key);
  if (!value) {
    const error = Object.assign(new Error(`Missing required environment variable: ${key}`), {
      status: 500,
      code: 'CONFIG_MISSING',
    });
    throw error;
  }
  return value;
};

export const getNodeEnv = () => readEnv('NODE_ENV') ?? 'development';
export const isProductionEnv = () => getNodeEnv() === 'production';

export const getJwtSecret = () => requiredEnv('JWT_SECRET');

export const getPort = () => {
  const value = readEnv('PORT');
  const parsed = Number(value ?? 4100);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4100;
};

export const getCorsOrigins = () => {
  const raw = readEnv('CORS_ORIGIN');
  if (!raw) {
    return isProductionEnv() ? [] : ['*'];
  }
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
};

export const getCorsOrigin = () => getCorsOrigins().join(',');

export const getStartupWarnings = () => {
  const warnings: string[] = [];

  if (!readEnv('DATABASE_URL')) {
    warnings.push('DATABASE_URL is not set. Prisma-backed routes will not connect until it is configured.');
  }

  const jwtSecret = readEnv('JWT_SECRET');
  if (!jwtSecret) {
    warnings.push('JWT_SECRET is not set. Standalone portal login will fail until it is configured.');
  } else if (jwtSecret.length < 24 || jwtSecret.toLowerCase().includes('replace')) {
    warnings.push('JWT_SECRET looks like a placeholder or is too short for production use.');
  }

  const corsOrigin = readEnv('CORS_ORIGIN');
  if (!corsOrigin) {
    warnings.push('CORS_ORIGIN is not set. Local development will allow any origin until this is configured.');
  } else if (corsOrigin === '*' && isProductionEnv()) {
    warnings.push('CORS_ORIGIN is wildcard in production. Restrict it before deployment.');
  }

  return warnings;
};

export const assertRuntimeEnvironment = () => {
  if (!isProductionEnv()) return;

  const missingKeys = ['DATABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN'].filter((key) => !readEnv(key));
  if (missingKeys.length) {
    throw Object.assign(
      new Error(`Missing required production environment variables: ${missingKeys.join(', ')}`),
      { status: 500, code: 'CONFIG_MISSING' },
    );
  }
};

export const logStartupWarnings = () => {
  getStartupWarnings().forEach((warning) => {
    console.warn(`[env] ${warning}`);
  });
};
