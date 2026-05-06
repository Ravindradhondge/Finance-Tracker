import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import budgetsRouter from "./budgets";
import summaryRouter from "./summary";
import importRouter from "./import";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(transactionsRouter);
router.use(budgetsRouter);
router.use(summaryRouter);
router.use(importRouter);

export default router;
