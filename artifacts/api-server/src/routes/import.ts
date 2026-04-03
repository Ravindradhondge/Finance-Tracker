import { Router } from "express";
import { createRequire } from "node:module";
import multer from "multer";
import { db } from "@workspace/db";
import { transactionsTable, categoriesTable } from "@workspace/db/schema";

const _require = createRequire(import.meta.url);
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = _require("pdf-parse");

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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
  // strip any leading non-digit chars (currency symbols, spaces)
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, "");
  return parseFloat(cleaned) || 0;
}

function parseDate(raw: string): string {
  const m = raw.match(/([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${MONTH_MAP[m[1]] ?? "00"}-${m[2].padStart(2, "0")}`;
}

function isInternalTransfer(desc: string): boolean {
  const lower = desc.toLowerCase();
  return (
    (lower.includes("transfer to") && /x{4,}/i.test(desc)) ||
    (lower.includes("transfer from") && /x{4,}/i.test(desc))
  );
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/^Paid to\s+/i, "")
    .replace(/^Payment to\s+/i, "")
    .replace(/^Received from\s+/i, "Received from ")
    .replace(/^Mobile recharged\s+\d+/i, "Mobile Recharge")
    .replace(/\s+/g, " ")
    .trim();
}

type ParsedTx = {
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  categoryName: string | null;
};

// Strategy 1: match full row on one line (with any currency symbol or none before number)
function strategy1(text: string): ParsedTx[] {
  const results: ParsedTx[] = [];
  // The ₹ character (U+20B9) might come out as various things; make it flexible
  // Match: "Mon DD, YYYY  <desc>  DEBIT|CREDIT  [any non-digit]?  number"
  const re = /([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+(DEBIT|CREDIT)\s+[^\d\n\r]*([\d,]+\.?\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const date = parseDate(m[1]);
    if (!date) continue;
    const desc = m[2].replace(/\s+/g, " ").trim();
    if (!desc || desc.length < 2) continue;
    const type = m[3] === "CREDIT" ? "income" : "expense";
    const amount = parseAmount(m[4]);
    if (amount <= 0) continue;
    if (isInternalTransfer(desc)) continue;
    results.push({ date, description: cleanDescription(desc), type, amount, categoryName: categorize(desc, type) });
  }
  return results;
}

// Strategy 2: line-by-line scan — find lines containing a date, then look for
// DEBIT/CREDIT + amount on that same line or the next non-empty line
function strategy2(text: string): ParsedTx[] {
  const results: ParsedTx[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const dateRe = /^([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})\s+(.*)/;
  const typeAmtRe = /(DEBIT|CREDIT)[^\d]*([\d,]+\.?\d*)/;

  for (let i = 0; i < lines.length; i++) {
    const dateMatch = lines[i].match(dateRe);
    if (!dateMatch) continue;

    const date = parseDate(dateMatch[1]);
    if (!date) continue;

    // Collect up to 3 lines after the date line to find DEBIT/CREDIT
    const block = [lines[i]];
    for (let j = 1; j <= 3 && i + j < lines.length; j++) {
      const next = lines[i + j];
      // Stop if the next line starts a new date
      if (/^[A-Z][a-z]{2}\s+\d{1,2},/.test(next)) break;
      block.push(next);
    }
    const blockText = block.join(" ");

    const taMatch = blockText.match(typeAmtRe);
    if (!taMatch) continue;

    const type = taMatch[1] === "CREDIT" ? "income" : "expense";
    const amount = parseAmount(taMatch[2]);
    if (amount <= 0) continue;

    // Description is everything between the date and DEBIT|CREDIT
    const descMatch = blockText.match(/^[A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4}\s+(.+?)\s+(DEBIT|CREDIT)/);
    const desc = descMatch ? descMatch[1].trim() : dateMatch[2].trim();
    if (!desc || desc.length < 2) continue;
    if (isInternalTransfer(desc)) continue;

    results.push({ date, description: cleanDescription(desc), type, amount, categoryName: categorize(desc, type) });
  }
  return results;
}

// Strategy 3: find all DEBIT/CREDIT occurrences, then look backwards for a date
function strategy3(text: string): ParsedTx[] {
  const results: ParsedTx[] = [];
  // Find all "DEBIT ₹X" or "CREDIT ₹X" or "DEBIT X" patterns
  const re = /(DEBIT|CREDIT)\s*[^\d\r\n]*([\d,]+\.?\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const amount = parseAmount(m[2]);
    if (amount <= 0) continue;
    const type = m[1] === "CREDIT" ? "income" : "expense";

    // Look backwards up to 300 chars for a date
    const before = text.substring(Math.max(0, m.index - 300), m.index);
    const dateMatches = [...before.matchAll(/([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/g)];
    if (!dateMatches.length) continue;
    const lastDateStr = dateMatches[dateMatches.length - 1][1];
    const date = parseDate(lastDateStr);
    if (!date) continue;

    // Description: text between the date and DEBIT/CREDIT
    const dateEnd = before.lastIndexOf(lastDateStr) + lastDateStr.length;
    const desc = before.substring(dateEnd).replace(/\s+/g, " ").trim();
    if (!desc || desc.length < 2) continue;
    if (isInternalTransfer(desc)) continue;

    results.push({ date, description: cleanDescription(desc), type, amount, categoryName: categorize(desc, type) });
  }
  return results;
}

function dedup(txs: ParsedTx[]): ParsedTx[] {
  const seen = new Set<string>();
  return txs.filter((tx) => {
    const key = `${tx.date}|${tx.type}|${tx.amount}|${tx.description.slice(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parsePhonePeText(text: string): ParsedTx[] {
  // Normalize: collapse excessive whitespace but keep newlines for strategy 2
  const normalised = text.replace(/[ \t]+/g, " ");

  // Try strategies in order; use the first one that finds results
  let results = strategy1(normalised);
  if (results.length > 0) {
    console.log(`[import] Strategy 1 matched ${results.length} transactions`);
    return dedup(results);
  }

  results = strategy2(normalised);
  if (results.length > 0) {
    console.log(`[import] Strategy 2 matched ${results.length} transactions`);
    return dedup(results);
  }

  results = strategy3(normalised);
  console.log(`[import] Strategy 3 matched ${results.length} transactions`);
  return dedup(results);
}

// POST /api/import/phonepe/preview
router.post("/import/phonepe/preview", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const data = await pdfParse(req.file.buffer);

    // Log first 1000 chars of extracted text for debugging
    console.log("[import] PDF text sample (first 1000 chars):\n", data.text.slice(0, 1000));
    console.log("[import] Total text length:", data.text.length);

    const parsed = parsePhonePeText(data.text);

    if (parsed.length === 0) {
      // Return the raw text sample in the error so we can debug further
      const sample = data.text.slice(0, 500).replace(/\n/g, " | ");
      return res.status(422).json({
        error: "No transactions found. Make sure you uploaded a PhonePe statement PDF.",
        debug_sample: sample,
      });
    }

    const categories = await db.select().from(categoriesTable);
    const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

    const transactions = parsed.map((tx) => ({
      ...tx,
      categoryId: tx.categoryName ? (catMap[tx.categoryName] ?? null) : null,
    }));

    return res.json({ transactions, total: transactions.length });
  } catch (err: any) {
    console.error("[import] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to parse PDF" });
  }
});

// POST /api/import/phonepe/debug — returns raw extracted text (for troubleshooting)
router.post("/import/phonepe/debug", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const data = await pdfParse(req.file.buffer);
    return res.json({
      length: data.text.length,
      pages: data.numpages,
      sample: data.text.slice(0, 2000),
      charCodes: [...data.text.slice(0, 100)].map((c) => ({ char: c, code: c.charCodeAt(0) })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/import/phonepe/confirm
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
