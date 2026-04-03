import { Router } from "express";
import { createRequire } from "node:module";
import multer from "multer";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db/schema";

const _require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = _require("pdf-parse");

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// --- Auto-categorizer ---
const CATEGORY_RULES: { keywords: string[]; name: string }[] = [
  { keywords: ["medical", "mediplus", "pharmacy", "wellness", "hospital", "doctor", "clinic", "kapaleshwaar", "jain medical", "health"], name: "Health" },
  { keywords: ["tea", "kitchen", "food", "snack", "restaurant", "cafe", "hotel", "tadka", "vadewala", "dairy", "vegetable", "tiffin", "dhaba", "bhojan", "wada", "chat", "pav", "chai", "sweets", "mithai", "juice", "bakery", "chota don", "tasty", "amrut", "jp food", "udupi", "k k s"], name: "Food & Dining" },
  { keywords: ["station", "petrol", "fuel", "automobile", "bike", "garage", "service station", "motor", "ola", "uber", "rapido", "metro"], name: "Transport" },
  { keywords: ["supermart", "supermarket", "market", "mart", "store", "stationary", "parcel", "shop", "enterprise", "purchase", "mahajan", "avenue", "matoshri"], name: "Shopping" },
  { keywords: ["hotstar", "netflix", "prime", "google play", "youtube", "spotify", "disney", "bookmyshow", "inox", "pvr", "gaming", "jiohotstar"], name: "Entertainment" },
  { keywords: ["recharge", "electricity", "bill", "broadband", "internet", "wifi", "bsnl", "airtel", "jio", "vodafone", "vi ", "dtv", "tata sky"], name: "Utilities" },
  { keywords: ["library", "tuition", "school", "college", "education", "cet", "commissioner", "exam", "fee", "course", "coaching", "books", "shreeram", "ganesh sir"], name: "Education" },
  { keywords: ["mpokket", "lazypay", "jar ", "loan", "emi", "repay", "finance", "credit", "bajaj", "hdfc loan", "sbi loan", "navi", "kreditbee", "cashe"], name: "Loan Repayment" },
  { keywords: ["salary", "payroll", "stipend", "wages", "company"], name: "Salary" },
];

function categorize(description: string, type: string): string | null {
  const lower = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.name;
    }
  }
  if (type === "income") return "Freelance";
  return "Personal";
}

const MONTH_MAP: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, "")) || 0;
}

function parseDate(raw: string): string {
  // "Mar 30, 2026" → "2026-03-30"
  const m = raw.match(/([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${MONTH_MAP[m[1]]}-${m[2].padStart(2, "0")}`;
}

function isInternalTransfer(desc: string): boolean {
  const lower = desc.toLowerCase();
  return (
    (lower.includes("transfer to") && lower.includes("xxxx")) ||
    (lower.includes("transfer from") && lower.includes("xxxx"))
  );
}

function parsePhonePeText(text: string): Array<{
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  categoryName: string | null;
}> {
  const results: ReturnType<typeof parsePhonePeText> = [];

  // Match each transaction line: "Month DD, YYYY  <description>  DEBIT|CREDIT  ₹amount"
  const txRegex =
    /([A-Z][a-z]{2}\s+\d{1,2},\s+\d{4})\s+(.+?)\s+(DEBIT|CREDIT)\s+₹([\d,]+\.?\d*)/g;

  let match: RegExpExecArray | null;
  while ((match = txRegex.exec(text)) !== null) {
    const rawDate = match[1].trim();
    const desc = match[2].replace(/\s+/g, " ").trim();
    const typeRaw = match[3];
    const amount = parseAmount(match[4]);

    if (isInternalTransfer(desc)) continue;
    if (amount <= 0) continue;

    const date = parseDate(rawDate);
    if (!date) continue;

    const type = typeRaw === "CREDIT" ? "income" : "expense";
    const categoryName = categorize(desc, type);

    // Clean up description
    let cleanDesc = desc
      .replace(/^Paid to\s+/i, "")
      .replace(/^Payment to\s+/i, "")
      .replace(/^Received from\s+/i, "Received from ")
      .replace(/^Mobile recharged\s+/i, "Mobile Recharge ");

    results.push({ date, description: cleanDesc, type, amount, categoryName });
  }

  return results;
}

// POST /api/import/phonepe/preview  — parse PDF, return detected transactions
router.post("/import/phonepe/preview", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const data = await pdfParse(req.file.buffer);
    const parsed = parsePhonePeText(data.text);

    if (parsed.length === 0) {
      return res.status(422).json({ error: "No transactions found. Make sure you uploaded a PhonePe statement PDF." });
    }

    // Get categories so we can resolve names → IDs for display
    const categories = await db.select().from(categoriesTable);
    const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    const transactions = parsed.map((tx) => ({
      ...tx,
      categoryId: tx.categoryName ? (catMap[tx.categoryName] ?? null) : null,
    }));

    return res.json({ transactions, total: transactions.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to parse PDF" });
  }
});

// POST /api/import/phonepe/confirm  — save confirmed transactions
router.post("/import/phonepe/confirm", async (req, res) => {
  try {
    const { transactions } = req.body as {
      transactions: Array<{
        date: string;
        description: string;
        type: "income" | "expense";
        amount: number;
        categoryId: number | null;
      }>;
    };

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: "No transactions provided" });
    }

    const inserted = await db
      .insert(transactionsTable)
      .values(
        transactions.map((tx) => ({
          amount: String(tx.amount),
          type: tx.type,
          description: tx.description,
          date: tx.date,
          categoryId: tx.categoryId ?? null,
        }))
      )
      .returning({ id: transactionsTable.id });

    return res.json({ imported: inserted.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to import transactions" });
  }
});

export default router;
