import { Router } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";

const router = Router();

const SALT_ROUNDS = 12;

const MOBILE_RE = /^[6-9]\d{9}$/;

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { mobile, name, password } = req.body as {
    mobile?: string;
    name?: string;
    password?: string;
  };

  if (!mobile || !MOBILE_RE.test(mobile.trim())) {
    res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
    return;
  }
  if (!name || name.trim().length < 1 || name.trim().length > 100) {
    res.status(400).json({ error: "Please enter a valid name (max 100 chars)." });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const cleanMobile = mobile.trim();
  const cleanName = name.trim();

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.mobile, cleanMobile))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "An account with this mobile number already exists. Please sign in." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [newUser] = await db
    .insert(usersTable)
    .values({ mobile: cleanMobile, name: cleanName, passwordHash })
    .returning({ id: usersTable.id, mobile: usersTable.mobile, name: usersTable.name });

  res.status(201).json({ id: newUser.id, mobile: newUser.mobile, name: newUser.name });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { mobile, password } = req.body as { mobile?: string; password?: string };

  if (!mobile || !MOBILE_RE.test(mobile.trim())) {
    res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number." });
    return;
  }
  if (!password || password.length < 1) {
    res.status(400).json({ error: "Please enter your password." });
    return;
  }

  const cleanMobile = mobile.trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.mobile, cleanMobile))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "No account found with this mobile number. Please sign up first." });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Incorrect password. Please try again." });
    return;
  }

  res.json({ id: user.id, mobile: user.mobile, name: user.name });
});

export default router;
