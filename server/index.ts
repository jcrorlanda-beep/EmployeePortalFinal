import express from 'express';

const app = express();
const port = process.env.PORT ?? 4100;

app.use(express.json());

app.get('/api/employee-portal/health', (_request, response) => {
  response.json({ service: 'nccc-employee-portal', status: 'ready', databaseConfigured: Boolean(process.env.DATABASE_URL) });
});

app.listen(port, () => {
  console.log(`NCCC Employee Portal API placeholder listening on ${port}`);
});
