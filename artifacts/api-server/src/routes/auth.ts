import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { mobile, name } = req.body as { mobile?: string; name?: string };

  if (!mobile || !/^[6-9]\d{9}$/.test(mobile.trim())) {
    res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
    return;
  }
  if (!name || name.trim().length < 1 || name.trim().length > 100) {
    res.status(400).json({ error: "Please enter a valid name." });
    return;
  }

  const cleanMobile = mobile.trim();
  const cleanName = name.trim();

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.mobile, cleanMobile))
    .limit(1);

  if (existing) {
    res.json({ id: existing.id, mobile: existing.mobile, name: existing.name });
    return;
  }

  const [newUser] = await db
    .insert(usersTable)
    .values({ mobile: cleanMobile, name: cleanName })
    .returning();

  res.status(201).json({ id: newUser.id, mobile: newUser.mobile, name: newUser.name });
});

export default router;
