import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';

const dashboardRoutes = Router();
const controller = new DashboardController();

dashboardRoutes.get('/', controller.getDashboardData);

export { dashboardRoutes };
