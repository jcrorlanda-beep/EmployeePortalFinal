import express from 'express';
import { auditRouter } from './routes/auditRouter';
import { reviewRouter } from './routes/reviewRouter';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { getPort } from './utils/env';
import { apiRootRouter } from './routes';
import { authRouter } from './routes/authRouter';
import { benefitsRouter } from './routes/benefitsRouter';
import { canteenRouter } from './routes/canteenRouter';
import { departmentRouter } from './routes/departmentRouter';
import { disciplineRouter } from './routes/disciplineRouter';
import { employeeRouter } from './routes/employeeRouter';
import { equipmentRouter } from './routes/equipmentRouter';
import { healthRouter } from './routes/healthRouter';
import { inventoryRouter } from './routes/inventoryRouter';
import { onboardingRouter } from './routes/onboardingRouter';
import { payrollRouter } from './routes/payrollRouter';
import { positionRouter } from './routes/positionRouter';
import { roleRouter } from './routes/roleRouter';
import { schedulingRouter } from './routes/schedulingRouter';
import { sopRouter } from './routes/sopRouter';
import { timekeepingRouter } from './routes/timekeepingRouter';
import { trainingRouter } from './routes/trainingRouter';

const app = express();

app.use(express.json());
app.use(corsMiddleware);
app.use(requestLogger);

app.use(apiRootRouter);
app.use(healthRouter);
app.use(authRouter);
app.use(auditRouter);
app.use(employeeRouter);
app.use(departmentRouter);
app.use(positionRouter);
app.use(roleRouter);
app.use(onboardingRouter);
app.use(trainingRouter);
app.use(sopRouter);
app.use(timekeepingRouter);
app.use(schedulingRouter);
app.use(payrollRouter);
app.use(benefitsRouter);
app.use(canteenRouter);
app.use(equipmentRouter);
app.use(inventoryRouter);
app.use(disciplineRouter);
app.use(reviewRouter);

app.use(errorHandler);

const port = getPort();

app.listen(port, () => {
  console.log(`NCCC Employee Portal API listening on ${port}`);
});
