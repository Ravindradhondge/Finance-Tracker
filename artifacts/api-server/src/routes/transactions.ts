import { Router, type IRouter } from "express";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db, transactionsTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/transactions", async (req, res): Promise<void> => {
  const { month, categoryId, type } = req.query as {
    month?: string;
    categoryId?: string;
    type?: string;
  };

  const conditions = [];

  if (month) {
    const start = `${month}-01`;
    const [year, m] = month.split("-").map(Number);
    const endDate = new Date(year, m, 0);
    const end = `${month}-${String(endDate.getDate()).padStart(2, "0")}`;
    conditions.push(gte(transactionsTable.date, start));
    conditions.push(lte(transactionsTable.date, end));
  }

  if (categoryId) {
    conditions.push(eq(transactionsTable.categoryId, parseInt(categoryId, 10)));
  }

  if (type && (type === "income" || type === "expense")) {
    conditions.push(eq(transactionsTable.type, type));
  }

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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt));

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

router.post("/transactions", async (req, res): Promise<void> => {
  const { amount, type, description, date, categoryId } = req.body;

  if (!amount || !type || !description || !date) {
    res.status(400).json({ error: "Missing required fields: amount, type, description, date" });
    return;
  }

  if (type !== "income" && type !== "expense") {
    res.status(400).json({ error: "type must be 'income' or 'expense'" });
    return;
  }

  const [row] = await db
    .insert(transactionsTable)
    .values({
      amount: String(amount),
      type,
      description,
      date,
      categoryId: categoryId ?? null,
    })
    .returning();

  const [withCategory] = await db
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
    .where(eq(transactionsTable.id, row.id));

  res.status(201).json({
    ...withCategory,
    amount: parseFloat(withCategory.amount),
    categoryId: withCategory.categoryId ?? null,
    categoryName: withCategory.categoryName ?? null,
    categoryColor: withCategory.categoryColor ?? null,
  });
});

router.get("/transactions/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
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
    .where(eq(transactionsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({
    ...row,
    amount: parseFloat(row.amount),
    categoryId: row.categoryId ?? null,
    categoryName: row.categoryName ?? null,
    categoryColor: row.categoryColor ?? null,
  });
});

router.put("/transactions/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { amount, type, description, date, categoryId } = req.body;

  if (!amount || !type || !description || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [updated] = await db
    .update(transactionsTable)
    .set({
      amount: String(amount),
      type,
      description,
      date,
      categoryId: categoryId ?? null,
    })
    .where(eq(transactionsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  const [withCategory] = await db
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
    .where(eq(transactionsTable.id, id));

  res.json({
    ...withCategory,
    amount: parseFloat(withCategory.amount),
    categoryId: withCategory.categoryId ?? null,
    categoryName: withCategory.categoryName ?? null,
    categoryColor: withCategory.categoryColor ?? null,
  });
});

router.delete("/transactions/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(transactionsTable)
    .where(eq(transactionsTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
