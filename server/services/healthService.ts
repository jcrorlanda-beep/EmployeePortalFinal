export const getHealthSnapshot = () => ({
  service: 'nccc-employee-portal',
  status: 'ready',
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  timestamp: new Date().toISOString(),
});
