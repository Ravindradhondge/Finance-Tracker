import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, budgetsTable, categoriesTable, transactionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/budgets", async (req, res): Promise<void> => {
  const { month } = req.query as { month?: string };
  const targetMonth = month ?? getCurrentMonth();

  const budgets = await db
    .select({
      id: budgetsTable.id,
      categoryId: budgetsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      month: budgetsTable.month,
      amount: budgetsTable.amount,
    })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(eq(budgetsTable.month, targetMonth));

  const result = await Promise.all(
    budgets.map(async (b) => {
      const [start, end] = getMonthRange(b.month);
      const [spentRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.categoryId, b.categoryId),
            eq(transactionsTable.type, "expense"),
            sql`${transactionsTable.date} >= ${start}`,
            sql`${transactionsTable.date} <= ${end}`
          )
        );

      const budgetAmount = parseFloat(b.amount);
      const spent = parseFloat(spentRow?.total ?? "0");
      const remaining = Math.max(0, budgetAmount - spent);
      const percentUsed = budgetAmount > 0 ? Math.min(100, (spent / budgetAmount) * 100) : 0;

      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        categoryColor: b.categoryColor,
        month: b.month,
        amount: budgetAmount,
        spent,
        remaining,
        percentUsed,
      };
    })
  );

  res.json(result);
});

router.post("/budgets", async (req, res): Promise<void> => {
  const { categoryId, month, amount } = req.body;

  if (!categoryId || !month || !amount) {
    res.status(400).json({ error: "Missing required fields: categoryId, month, amount" });
    return;
  }

  const [row] = await db
    .insert(budgetsTable)
    .values({
      categoryId,
      month,
      amount: String(amount),
    })
    .onConflictDoUpdate({
      target: [budgetsTable.categoryId, budgetsTable.month],
      set: { amount: String(amount) },
    })
    .returning();

  const [withCategory] = await db
    .select({
      id: budgetsTable.id,
      categoryId: budgetsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      month: budgetsTable.month,
      amount: budgetsTable.amount,
    })
    .from(budgetsTable)
    .innerJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(eq(budgetsTable.id, row.id));

  const [start, end] = getMonthRange(withCategory.month);
  const [spentRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.categoryId, withCategory.categoryId),
        eq(transactionsTable.type, "expense"),
        sql`${transactionsTable.date} >= ${start}`,
        sql`${transactionsTable.date} <= ${end}`
      )
    );

  const budgetAmount = parseFloat(withCategory.amount);
  const spent = parseFloat(spentRow?.total ?? "0");
  const remaining = Math.max(0, budgetAmount - spent);
  const percentUsed = budgetAmount > 0 ? Math.min(100, (spent / budgetAmount) * 100) : 0;

  res.status(201).json({
    id: withCategory.id,
    categoryId: withCategory.categoryId,
    categoryName: withCategory.categoryName,
    categoryColor: withCategory.categoryColor,
    month: withCategory.month,
    amount: budgetAmount,
    spent,
    remaining,
    percentUsed,
  });
});

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month: string): [string, string] {
  const [year, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDate = new Date(year, m, 0);
  const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;
  return [start, end];
}

export default router;
