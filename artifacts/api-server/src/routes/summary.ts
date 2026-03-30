import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, transactionsTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/summary/monthly", async (req, res): Promise<void> => {
  const { month } = req.query as { month?: string };
  const targetMonth = month ?? getCurrentMonth();
  const [start, end] = getMonthRange(targetMonth);

  const [incomeRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)`, count: sql<string>`COUNT(*)` })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.type, "income"),
        sql`${transactionsTable.date} >= ${start}`,
        sql`${transactionsTable.date} <= ${end}`
      )
    );

  const [expenseRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)`, count: sql<string>`COUNT(*)` })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.type, "expense"),
        sql`${transactionsTable.date} >= ${start}`,
        sql`${transactionsTable.date} <= ${end}`
      )
    );

  const totalIncome = parseFloat(incomeRow?.total ?? "0");
  const totalExpenses = parseFloat(expenseRow?.total ?? "0");
  const savings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  const transactionCount = parseInt(incomeRow?.count ?? "0") + parseInt(expenseRow?.count ?? "0");

  res.json({
    month: targetMonth,
    totalIncome,
    totalExpenses,
    savings,
    savingsRate,
    transactionCount,
  });
});

router.get("/summary/categories", async (req, res): Promise<void> => {
  const { month } = req.query as { month?: string };
  const targetMonth = month ?? getCurrentMonth();
  const [start, end] = getMonthRange(targetMonth);

  const rows = await db
    .select({
      categoryId: transactionsTable.categoryId,
      categoryName: sql<string>`COALESCE(${categoriesTable.name}, 'Uncategorized')`,
      categoryColor: sql<string>`COALESCE(${categoriesTable.color}, '#94a3b8')`,
      total: sql<string>`SUM(${transactionsTable.amount})`,
      count: sql<string>`COUNT(*)`,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(transactionsTable.type, "expense"),
        sql`${transactionsTable.date} >= ${start}`,
        sql`${transactionsTable.date} <= ${end}`
      )
    )
    .groupBy(transactionsTable.categoryId, categoriesTable.name, categoriesTable.color)
    .orderBy(sql`SUM(${transactionsTable.amount}) DESC`);

  const grandTotal = rows.reduce((sum, r) => sum + parseFloat(r.total), 0);

  res.json(
    rows.map((r) => ({
      categoryId: r.categoryId ?? null,
      categoryName: r.categoryName,
      categoryColor: r.categoryColor,
      total: parseFloat(r.total),
      count: parseInt(r.count),
      percentage: grandTotal > 0 ? (parseFloat(r.total) / grandTotal) * 100 : 0,
    }))
  );
});

router.get("/summary/trends", async (_req, res): Promise<void> => {
  const months = getLast6Months();

  const trends = await Promise.all(
    months.map(async (month) => {
      const [start, end] = getMonthRange(month);

      const [incomeRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.type, "income"),
            sql`${transactionsTable.date} >= ${start}`,
            sql`${transactionsTable.date} <= ${end}`
          )
        );

      const [expenseRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)` })
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.type, "expense"),
            sql`${transactionsTable.date} >= ${start}`,
            sql`${transactionsTable.date} <= ${end}`
          )
        );

      const income = parseFloat(incomeRow?.total ?? "0");
      const expenses = parseFloat(expenseRow?.total ?? "0");

      return {
        month,
        income,
        expenses,
        savings: income - expenses,
      };
    })
  );

  res.json(trends);
});

router.get("/summary/recent", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: transactionsTable.id,
      amount: transactionsTable.amount,
      type: transactionsTable.type,
      description: transactionsTable.description,
      date: transactionsTable.date,
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      createdAt: transactionsTable.createdAt,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt))
    .limit(10);

  res.json(
    rows.map((r) => ({
      ...r,
      amount: parseFloat(r.amount),
      categoryId: r.categoryId ?? null,
      categoryName: r.categoryName ?? null,
      categoryColor: r.categoryColor ?? null,
    }))
  );
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

function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default router;
