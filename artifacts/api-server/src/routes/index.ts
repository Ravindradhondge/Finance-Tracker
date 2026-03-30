import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transactionsRouter from "./transactions";
import categoriesRouter from "./categories";
import budgetsRouter from "./budgets";
import summaryRouter from "./summary";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(transactionsRouter);
router.use(budgetsRouter);
router.use(summaryRouter);

export default router;
