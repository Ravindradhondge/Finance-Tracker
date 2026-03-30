import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.name));

  res.json(rows);
});

router.post("/categories", async (req, res): Promise<void> => {
  const { name, color, icon, type } = req.body;

  if (!name || !type) {
    res.status(400).json({ error: "Missing required fields: name, type" });
    return;
  }

  if (!["income", "expense", "both"].includes(type)) {
    res.status(400).json({ error: "type must be 'income', 'expense', or 'both'" });
    return;
  }

  const [row] = await db
    .insert(categoriesTable)
    .values({
      name,
      color: color ?? "#6366f1",
      icon: icon ?? null,
      type,
    })
    .returning();

  res.status(201).json(row);
});

export default router;
